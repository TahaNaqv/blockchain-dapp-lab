// The reconciler is the source of truth. Webhooks give low latency; the reconciler gives correctness:
//  - backfills history from the deployment block (and after any downtime),
//  - confirms events once they are CONFIRMATIONS blocks deep,
//  - removes unconfirmed (webhook) events that are NOT on the canonical chain (reorgs).
import type { ChainReader } from "../lib/chain.ts";
import type { Db } from "../lib/db.ts";
import { logger } from "../lib/logger.ts";
import { decodeLog } from "./decode.ts";
import { ingest } from "./ingest.ts";

export interface ReconcilerOptions {
  deployBlock: number;
  confirmations: number;
  logChunkBlocks: number; // Alchemy free plan: max 10 blocks per eth_getLogs
  maxBlocksPerTick: number;
  intervalMs: number;
  requestDelayMs?: number; // throttle between RPC calls (free-plan compute-unit budget)
}

export interface TickResult {
  from: number;
  to: number;
  applied: number;
  removed: number;
}

export class Reconciler {
  private timer?: NodeJS.Timeout;
  private running = false;
  chainHead = 0;

  constructor(
    private readonly db: Db,
    private readonly chain: ChainReader,
    private readonly opts: ReconcilerOptions,
  ) {}

  async lastConfirmedBlock(): Promise<number> {
    const state = await this.db.syncState.findUnique({ where: { id: 1 } });
    return state?.lastConfirmedBlock ?? this.opts.deployBlock - 1;
  }

  /** Process at most maxBlocksPerTick finalized blocks. Returns null when already up to date. */
  async tick(): Promise<TickResult | null> {
    this.chainHead = await this.chain.getBlockNumber();
    const safeHead = this.chainHead - this.opts.confirmations;
    const last = await this.lastConfirmedBlock();
    if (safeHead <= last) return null;

    const from = last + 1;
    const to = Math.min(safeHead, last + this.opts.maxBlocksPerTick);
    const canonical = new Set<string>();
    let applied = 0;

    for (let start = from; start <= to; start += this.opts.logChunkBlocks) {
      const end = Math.min(start + this.opts.logChunkBlocks - 1, to);
      const logs = await this.chain.getLogs(start, end);
      logs.sort((x, y) => x.blockNumber - y.blockNumber || x.logIndex - y.logIndex);
      for (const log of logs) {
        const ev = decodeLog(log, await this.chain.getBlockTimestamp(log.blockNumber));
        if (!ev) continue;
        canonical.add(ev.id);
        if ((await ingest(this.db, ev, "RECONCILER")) === "applied") applied++;
      }
      if (this.opts.requestDelayMs) await sleep(this.opts.requestDelayMs);
    }

    // Reorg cleanup + checkpoint, atomically.
    const removed = await this.db.$transaction(async (tx) => {
      const stale = await tx.chainEvent.deleteMany({
        where: { blockNumber: { gte: from, lte: to }, confirmed: false, id: { notIn: [...canonical] } },
      });
      await tx.syncState.upsert({ where: { id: 1 }, create: { id: 1, lastConfirmedBlock: to }, update: { lastConfirmedBlock: to } });
      return stale.count;
    });

    if (applied || removed) logger.info({ from, to, applied, removed }, "reconciled block range");
    return { from, to, applied, removed };
  }

  start() {
    const loop = async () => {
      if (!this.running) return;
      try {
        // Catch up quickly when far behind, otherwise wait for the next interval.
        let r = await this.tick();
        while (this.running && r && r.to < this.chainHead - this.opts.confirmations) r = await this.tick();
      } catch (err) {
        logger.error({ err }, "reconciler tick failed; will retry");
      }
      if (this.running) this.timer = setTimeout(loop, this.opts.intervalMs);
    };
    this.running = true;
    void loop();
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
