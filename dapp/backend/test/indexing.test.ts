// End-to-end backend tests: Alchemy webhook -> PostgreSQL -> REST API, plus reconciler confirmation and reorg handling.
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { Reconciler } from "../src/indexer/reconciler.ts";
import { blockHash, db, encodeLog, FakeChain, now, resetDb, txHash, webhookDelivery } from "./helpers.ts";

const ALI = "0x00000000000000000000000000000000000000a1";
const SARA = "0x00000000000000000000000000000000000000b2";

function setup() {
  const chain = new FakeChain();
  const reconciler = new Reconciler(db, chain, { deployBlock: 100, confirmations: 2, logChunkBlocks: 10, maxBlocksPerTick: 1000, intervalMs: 1000 });
  const app = createApp({ db, chain, getLastConfirmedBlock: () => reconciler.lastConfirmedBlock() });
  return { chain, reconciler, app };
}

const created = (id: number, block: number, allowlist = false) =>
  encodeLog("ElectionCreated", [id, ALI, "Best use-case?", ["Remittances", "Land records", "Digital ID"], now() - 60, now() + 3600, allowlist], block);

async function deliver(app: ReturnType<typeof setup>["app"], id: string, block: number, logs: ReturnType<typeof encodeLog>[], hash?: string) {
  const { body, signature } = webhookDelivery(id, block, logs, hash);
  return request(app).post("/webhooks/alchemy").set("content-type", "application/json").set("x-alchemy-signature", signature).send(body);
}

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("Alchemy webhook ingestion", () => {
  it("indexes events from a signed delivery and serves them via the API", async () => {
    const { app } = setup();
    expect((await deliver(app, "whevt_1", 101, [created(1, 101)])).status).toBe(200);
    expect((await deliver(app, "whevt_2", 102, [encodeLog("VoteCast", [1, ALI, 2], 102), encodeLog("VoteCast", [1, SARA, 2], 102, 1)])).status).toBe(200);

    const list = await request(app).get("/api/elections?status=active");
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ id: 1, title: "Best use-case?", status: "active", totalVotes: 2 });

    const detail = await request(app).get("/api/elections/1");
    expect(detail.body.options).toEqual([
      { index: 0, label: "Remittances", votes: 0 },
      { index: 1, label: "Land records", votes: 0 },
      { index: 2, label: "Digital ID", votes: 2 },
    ]);
    expect(detail.body.pendingVotes).toBe(2); // not yet confirmed by the reconciler

    const elig = await request(app).get(`/api/elections/1/eligibility/${ALI}`);
    expect(elig.body).toMatchObject({ hasVoted: true, votedOption: 2, canVote: false });
  });

  it("rejects forged deliveries", async () => {
    const { app } = setup();
    const { body } = webhookDelivery("whevt_x", 101, [created(1, 101)]);
    const res = await request(app).post("/webhooks/alchemy").set("content-type", "application/json").set("x-alchemy-signature", "00".repeat(32)).send(body);
    expect(res.status).toBe(401);
    expect(await db.election.count()).toBe(0);
  });

  it("is idempotent: a retried delivery changes nothing", async () => {
    const { app } = setup();
    const logs = [created(1, 101)];
    await deliver(app, "whevt_1", 101, logs);
    const again = await deliver(app, "whevt_1", 101, logs);
    expect(again.body).toEqual({ ok: true, duplicate: true });
    expect(await db.chainEvent.count()).toBe(1);
  });

  it("defers a vote that arrives before its election, and the reconciler repairs it", async () => {
    const { app, chain, reconciler } = setup();
    const election = created(1, 101);
    const vote = encodeLog("VoteCast", [1, ALI, 0], 102);
    await deliver(app, "whevt_v", 102, [vote]); // out of order
    expect(await db.vote.count()).toBe(0);

    chain.logs = [election, vote];
    chain.head = 110;
    await reconciler.tick();
    expect(await db.vote.count()).toBe(1);
  });
});

describe("Reconciler", () => {
  it("backfills history from the deploy block and confirms events", async () => {
    const { chain, reconciler, app } = setup();
    chain.logs = [created(1, 101), encodeLog("VoteCast", [1, ALI, 1], 105), encodeLog("VoteCast", [1, SARA, 0], 130)];
    chain.head = 131; // confirmations = 2 -> safe head 129
    const r = await reconciler.tick();
    expect(r).toMatchObject({ from: 100, to: 129 });
    expect(await db.vote.count()).toBe(1); // block 130 not final yet
    expect(await db.chainEvent.count({ where: { confirmed: false } })).toBe(0);

    chain.head = 140;
    await reconciler.tick();
    const detail = await request(app).get("/api/elections/1");
    expect(detail.body.totalVotes).toBe(2);
    expect(detail.body.pendingVotes).toBe(0);
  });

  it("removes a webhook vote that was reorged out of the canonical chain", async () => {
    const { app, chain, reconciler } = setup();
    const election = created(1, 101);
    const orphanVote = encodeLog("VoteCast", [1, ALI, 2], 105, 0, blockHash(105, "f")); // on a fork
    await deliver(app, "whevt_e", 101, [election]);
    await deliver(app, "whevt_o", 105, [orphanVote], blockHash(105, "f"));
    expect((await request(app).get("/api/elections/1")).body.totalVotes).toBe(1);

    chain.logs = [election]; // canonical chain: the vote never happened
    chain.head = 120;
    const r = await reconciler.tick();
    expect(r?.removed).toBe(1);
    expect((await request(app).get("/api/elections/1")).body.totalVotes).toBe(0);
  });

  it("ignores late webhook retries for blocks already finalized", async () => {
    const { app, chain, reconciler } = setup();
    chain.logs = [created(1, 101)];
    chain.head = 150;
    await reconciler.tick(); // finalized up to 148
    await deliver(app, "whevt_late", 120, [encodeLog("VoteCast", [1, ALI, 0], 120, 0, blockHash(120), txHash())]);
    expect(await db.vote.count()).toBe(0); // reconciler data is authoritative for finalized blocks
  });
});

describe("API validation", () => {
  it("returns 400 for invalid input and 404 for unknown resources", async () => {
    const { app } = setup();
    expect((await request(app).get("/api/elections/abc")).status).toBe(400);
    expect((await request(app).get("/api/elections?pageSize=1000")).status).toBe(400);
    expect((await request(app).get("/api/elections/1/eligibility/not-an-address")).status).toBe(400);
    expect((await request(app).get("/api/elections/999")).status).toBe(404);
    expect((await request(app).get("/api/nope")).status).toBe(404);
  });

  it("reports admin role from the chain and voting history from the database", async () => {
    const { app, chain } = setup();
    chain.admins.add(ALI);
    await deliver(app, "whevt_1", 101, [created(1, 101), encodeLog("VoteCast", [1, ALI, 1], 101, 1)]);
    const res = await request(app).get(`/api/accounts/${ALI}`);
    expect(res.body).toMatchObject({ isElectionAdmin: true, votes: [{ electionId: 1, optionLabel: "Land records", confirmed: false }] });
  });
});
