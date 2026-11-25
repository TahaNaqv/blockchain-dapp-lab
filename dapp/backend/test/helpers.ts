import { createHmac } from "node:crypto";
import { votingInterface, type ChainReader, type RawLog } from "../src/lib/chain.ts";
import { env } from "../src/config/env.ts";
import { createDb, type Db } from "../src/lib/db.ts";

export const db: Db = createDb();

export async function resetDb() {
  await db.$executeRawUnsafe(
    'TRUNCATE "Vote", "Voter", "Election", "ChainEvent", "WebhookDelivery", "SyncState" RESTART IDENTITY CASCADE',
  );
}

let txCounter = 0;
export function txHash() {
  return "0x" + (++txCounter).toString(16).padStart(64, "0");
}
export const blockHash = (n: number, fork = "a") => "0x" + (fork + n.toString(16)).padStart(64, "0");

export function encodeLog(name: string, args: unknown[], blockNumber: number, logIndex = 0, hash = blockHash(blockNumber), tx = txHash()): RawLog {
  const fragment = votingInterface.getEvent(name)!;
  const { data, topics } = votingInterface.encodeEventLog(fragment, args);
  return { address: env.contractAddress, topics, data, blockNumber, blockHash: hash, transactionHash: tx, logIndex };
}

/** In-memory chain for tests. `logs` is the canonical chain; edit it to simulate a reorg. */
export class FakeChain implements ChainReader {
  head = 0;
  logs: RawLog[] = [];
  admins = new Set<string>();
  async getBlockNumber() {
    return this.head;
  }
  async getLogs(from: number, to: number) {
    return this.logs.filter((l) => l.blockNumber >= from && l.blockNumber <= to);
  }
  async getBlockTimestamp(n: number) {
    return 1_800_000_000 + n * 12;
  }
  async isElectionAdmin(a: string) {
    return this.admins.has(a.toLowerCase());
  }
}

/** Build + sign an Alchemy Custom Webhook payload exactly like Alchemy does. */
export function webhookDelivery(id: string, blockNumber: number, logs: RawLog[], hash = blockHash(blockNumber)) {
  const body = JSON.stringify({
    webhookId: "wh_test",
    id,
    createdAt: new Date().toISOString(),
    type: "GRAPHQL",
    event: {
      data: {
        block: {
          hash,
          number: blockNumber,
          timestamp: 1_800_000_000 + blockNumber * 12,
          logs: logs.map((l) => ({
            data: l.data,
            topics: l.topics,
            index: l.logIndex,
            account: { address: l.address },
            transaction: { hash: l.transactionHash, index: 0, status: 1 },
          })),
        },
      },
      sequenceNumber: "1",
    },
  });
  const signature = createHmac("sha256", env.ALCHEMY_WEBHOOK_SIGNING_KEY).update(body).digest("hex");
  return { body, signature };
}

export const now = () => Math.floor(Date.now() / 1000);
