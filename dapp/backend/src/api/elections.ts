import { Router } from "express";
import { isAddress } from "ethers";
import { z } from "zod";
import type { Db } from "../lib/db.ts";
import { electionStatus } from "./dto.ts";

const listQuery = z.object({
  status: z.enum(["upcoming", "active", "ended", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const idParam = z.object({ id: z.coerce.number().int().positive() });
const pageQuery = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
const address = z.string().refine((a) => isAddress(a), "invalid address").transform((a) => a.toLowerCase());

export function electionsRouter(db: Db) {
  const r = Router();

  // GET /api/elections?status=active&page=1&pageSize=20
  r.get("/", async (req, res) => {
    const q = listQuery.parse(req.query);
    const now = new Date();
    const where =
      q.status === "cancelled" ? { cancelledEventId: { not: null } }
      : q.status === "upcoming" ? { cancelledEventId: null, startTime: { gt: now } }
      : q.status === "active" ? { cancelledEventId: null, startTime: { lte: now }, endTime: { gt: now } }
      : q.status === "ended" ? { cancelledEventId: null, endTime: { lte: now } }
      : {};
    const [total, rows] = await Promise.all([
      db.election.count({ where }),
      db.election.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { _count: { select: { votes: true } } },
      }),
    ]);
    res.json({
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: rows.map((e) => ({
        id: e.id,
        title: e.title,
        optionCount: e.options.length,
        startTime: e.startTime,
        endTime: e.endTime,
        allowlistOnly: e.allowlistOnly,
        status: electionStatus(e, now),
        totalVotes: e._count.votes,
      })),
    });
  });

  // GET /api/elections/:id  -> details + live results
  r.get("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const e = await db.election.findUnique({ where: { id }, include: { createdEvent: true, _count: { select: { voters: true } } } });
    if (!e) {
      res.status(404).json({ error: `election ${id} not found` });
      return;
    }
    const grouped = await db.vote.groupBy({ by: ["option"], where: { electionId: id }, _count: { _all: true } });
    const pending = await db.vote.count({ where: { electionId: id, event: { confirmed: false } } });
    const counts = new Map(grouped.map((g) => [g.option, g._count._all]));
    const totalVotes = grouped.reduce((s, g) => s + g._count._all, 0);
    res.json({
      id: e.id,
      title: e.title,
      creator: e.creator,
      startTime: e.startTime,
      endTime: e.endTime,
      allowlistOnly: e.allowlistOnly,
      status: electionStatus(e),
      registeredVoters: e.allowlistOnly ? e._count.voters : null,
      totalVotes,
      pendingVotes: pending, // seen via webhook, not yet final (CONFIRMATIONS)
      options: e.options.map((label, index) => ({ index, label, votes: counts.get(index) ?? 0 })),
      createdTx: e.createdEvent.txHash,
    });
  });

  // GET /api/elections/:id/votes?page=1
  r.get("/:id/votes", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const q = pageQuery.parse(req.query);
    const [total, votes] = await Promise.all([
      db.vote.count({ where: { electionId: id } }),
      db.vote.findMany({
        where: { electionId: id },
        orderBy: [{ blockNumber: "desc" }, { id: "desc" }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { event: { select: { confirmed: true } } },
      }),
    ]);
    res.json({
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: votes.map((v) => ({ voter: v.voter, option: v.option, txHash: v.txHash, blockNumber: v.blockNumber, castAt: v.castAt, confirmed: v.event.confirmed })),
    });
  });

  // GET /api/elections/:id/eligibility/:address
  r.get("/:id/eligibility/:address", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const addr = address.parse(req.params.address);
    const e = await db.election.findUnique({ where: { id } });
    if (!e) {
      res.status(404).json({ error: `election ${id} not found` });
      return;
    }
    const [vote, registration] = await Promise.all([
      db.vote.findUnique({ where: { electionId_voter: { electionId: id, voter: addr } } }),
      e.allowlistOnly ? db.voter.findUnique({ where: { electionId_address: { electionId: id, address: addr } } }) : null,
    ]);
    const status = electionStatus(e);
    const registered = !e.allowlistOnly || !!registration;
    res.json({
      electionId: id,
      address: addr,
      status,
      hasVoted: !!vote,
      votedOption: vote?.option ?? null,
      isRegistered: registered,
      canVote: status === "active" && registered && !vote,
    });
  });

  return r;
}
