// Idempotent event ingestion + projection into read-models.
// Safe to call many times with the same log (webhook retries, reconciler re-scans).
import type { Db } from "../lib/db.ts";
import { logger } from "../lib/logger.ts";
import type { DecodedLog } from "./decode.ts";

export type IngestSource = "WEBHOOK" | "RECONCILER";
export type IngestResult = "applied" | "deferred";

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

export async function ingest(db: Db, ev: DecodedLog, source: IngestSource): Promise<IngestResult> {
  return db.$transaction(async (tx) => {
    const existing = await tx.chainEvent.findUnique({ where: { id: ev.id } });
    if (existing && existing.blockHash !== ev.blockHash) {
      // Same tx re-included in a different block after a reorg: drop the stale version (cascades to read-models).
      await tx.chainEvent.delete({ where: { id: ev.id } });
    }
    const confirmed = source === "RECONCILER";
    await tx.chainEvent.upsert({
      where: { id: ev.id },
      create: {
        id: ev.id,
        eventName: ev.name,
        blockNumber: ev.blockNumber,
        blockHash: ev.blockHash,
        blockTimestamp: new Date(ev.blockTimestamp * 1000),
        txHash: ev.txHash,
        logIndex: ev.logIndex,
        args: ev.args,
        source,
        confirmed,
      },
      update: confirmed ? { confirmed: true } : {},
    });
    return project(tx, ev);
  });
}

async function project(tx: Tx, ev: DecodedLog): Promise<IngestResult> {
  switch (ev.name) {
    case "ElectionCreated": {
      const a = ev.args;
      const data = {
        title: a.title,
        options: a.options,
        startTime: new Date(a.startTime * 1000),
        endTime: new Date(a.endTime * 1000),
        allowlistOnly: a.allowlistOnly,
        creator: a.creator,
        createdEventId: ev.id,
      };
      await tx.election.upsert({ where: { id: a.electionId }, create: { id: a.electionId, ...data }, update: data });
      return "applied";
    }
    case "VotersRegistered": {
      if (!(await tx.election.findUnique({ where: { id: ev.args.electionId } }))) return defer(ev);
      await tx.voter.createMany({
        data: ev.args.voters.map((address) => ({ electionId: ev.args.electionId, address, eventId: ev.id })),
        skipDuplicates: true,
      });
      return "applied";
    }
    case "VoteCast": {
      if (!(await tx.election.findUnique({ where: { id: ev.args.electionId } }))) return defer(ev);
      const clash = await tx.vote.findUnique({ where: { electionId_voter: { electionId: ev.args.electionId, voter: ev.args.voter } } });
      if (clash && clash.id !== ev.id) {
        // Impossible on a canonical chain (contract allows one vote) - only after a reorg. Newest evidence wins.
        await tx.vote.delete({ where: { id: clash.id } });
      }
      await tx.vote.upsert({
        where: { id: ev.id },
        create: {
          id: ev.id,
          electionId: ev.args.electionId,
          voter: ev.args.voter,
          option: ev.args.option,
          blockNumber: ev.blockNumber,
          txHash: ev.txHash,
          castAt: new Date(ev.blockTimestamp * 1000),
        },
        update: {},
      });
      return "applied";
    }
    case "ElectionCancelled": {
      const updated = await tx.election.updateMany({ where: { id: ev.args.electionId }, data: { cancelledEventId: ev.id } });
      return updated.count ? "applied" : defer(ev);
    }
  }
}

function defer(ev: DecodedLog): IngestResult {
  // The parent record this event refers to is not indexed yet - out-of-order delivery.
  // The raw event is stored; the reconciler re-applies it when it processes the block range in order.
  logger.warn({ event: ev.name, id: ev.id, args: ev.args }, "projection deferred: parent record not indexed yet");
  return "deferred";
}
