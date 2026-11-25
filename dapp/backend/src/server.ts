import { createApp } from "./app.ts";
import { assertContractConfigured, env } from "./config/env.ts";
import { Reconciler } from "./indexer/reconciler.ts";
import { RpcChainReader } from "./lib/chain.ts";
import { createDb } from "./lib/db.ts";
import { logger } from "./lib/logger.ts";

assertContractConfigured();

const db = createDb();
const chain = new RpcChainReader();
const reconciler = new Reconciler(db, chain, {
  deployBlock: env.deployBlock,
  confirmations: env.CONFIRMATIONS,
  logChunkBlocks: env.LOG_CHUNK_BLOCKS,
  maxBlocksPerTick: env.MAX_BLOCKS_PER_TICK,
  intervalMs: env.RECONCILE_INTERVAL_SECONDS * 1000,
  requestDelayMs: 100,
});

const app = createApp({ db, chain, getLastConfirmedBlock: () => reconciler.lastConfirmedBlock() });
const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, contract: env.contractAddress, chainId: env.chainId, webhook: env.webhookEnabled ? "/webhooks/alchemy" : "disabled" },
    "backend started",
  );
});
reconciler.start();

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");
  reconciler.stop();
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // force-exit if connections hang
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
