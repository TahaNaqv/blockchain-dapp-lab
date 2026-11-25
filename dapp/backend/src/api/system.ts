import { Router } from "express";
import { env } from "../config/env.ts";
import type { ChainReader } from "../lib/chain.ts";
import type { Db } from "../lib/db.ts";

export function systemRouter(db: Db, chain: ChainReader, getLastConfirmedBlock: () => Promise<number>) {
  const r = Router();

  // Liveness: the process is up.
  r.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Readiness: dependencies reachable (use for load balancers / orchestrators).
  r.get("/ready", async (_req, res) => {
    const withTimeout = <T>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5_000))]);
    const [dbOk, head] = await Promise.allSettled([withTimeout(db.$queryRaw`SELECT 1`), withTimeout(chain.getBlockNumber())]);
    const ok = dbOk.status === "fulfilled" && head.status === "fulfilled";
    res.status(ok ? 200 : 503).json({ ok, database: dbOk.status === "fulfilled", rpc: head.status === "fulfilled" });
  });

  // GET /api/stats -> global numbers + indexer sync status
  r.get("/api/stats", async (_req, res) => {
    const [elections, votes, voters, lastConfirmedBlock, head] = await Promise.all([
      db.election.count(),
      db.vote.count(),
      db.vote.findMany({ distinct: ["voter"], select: { voter: true } }).then((v) => v.length),
      getLastConfirmedBlock(),
      chain.getBlockNumber().catch(() => null),
    ]);
    res.json({
      elections,
      votes,
      uniqueVoters: voters,
      chainId: env.chainId,
      contract: env.contractAddress,
      sync: { lastConfirmedBlock, chainHead: head, lagBlocks: head === null ? null : head - lastConfirmedBlock, webhookEnabled: env.webhookEnabled },
    });
  });

  return r;
}
