import { Router } from "express";
import { isAddress } from "ethers";
import { z } from "zod";
import type { ChainReader } from "../lib/chain.ts";
import type { Db } from "../lib/db.ts";

const address = z.string().refine((a) => isAddress(a), "invalid address").transform((a) => a.toLowerCase());

export function accountsRouter(db: Db, chain: ChainReader) {
  const r = Router();
  const adminCache = new Map<string, { value: boolean; at: number }>();

  // GET /api/accounts/:address -> role (read from the contract) + voting history (from the database)
  r.get("/:address", async (req, res) => {
    const addr = address.parse(req.params.address);
    let cached = adminCache.get(addr);
    if (!cached || Date.now() - cached.at > 60_000) {
      cached = { value: await chain.isElectionAdmin(addr), at: Date.now() };
      adminCache.set(addr, cached);
    }
    const votes = await db.vote.findMany({
      where: { voter: addr },
      orderBy: { blockNumber: "desc" },
      include: { election: { select: { title: true, options: true } }, event: { select: { confirmed: true } } },
    });
    res.json({
      address: addr,
      isElectionAdmin: cached.value,
      votes: votes.map((v) => ({
        electionId: v.electionId,
        title: v.election.title,
        option: v.option,
        optionLabel: v.election.options[v.option] ?? null,
        txHash: v.txHash,
        castAt: v.castAt,
        confirmed: v.event.confirmed,
      })),
    });
  });

  return r;
}
