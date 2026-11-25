// Alchemy Custom Webhook (GraphQL) receiver.
// Security: HMAC-SHA256 of the RAW body with the webhook's signing key, compared in constant time.
// Reliability: deliveries are de-duplicated by id; failures return 500 so Alchemy retries (exponential backoff).
import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.ts";
import { decodeLog } from "../indexer/decode.ts";
import { ingest } from "../indexer/ingest.ts";
import type { Db } from "../lib/db.ts";
import { logger } from "../lib/logger.ts";

export function isValidAlchemySignature(rawBody: Buffer, signature: string | undefined, signingKey: string): boolean {
  if (!signature || !signingKey) return false;
  const expected = createHmac("sha256", signingKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const num = z.union([z.number(), z.string()]).transform((v) => Number(v));
const payloadSchema = z.object({
  webhookId: z.string(),
  id: z.string(),
  type: z.string(),
  event: z.object({
    data: z.object({
      block: z.object({
        hash: z.string(),
        number: num,
        timestamp: num,
        logs: z.array(
          z.object({
            data: z.string(),
            topics: z.array(z.string()),
            index: num,
            account: z.object({ address: z.string() }),
            transaction: z.object({ hash: z.string(), status: num.optional() }),
          }),
        ),
      }),
    }),
    sequenceNumber: z.string().optional(),
  }),
});

export function alchemyWebhookRouter(db: Db, getLastConfirmedBlock: () => Promise<number>) {
  const router = Router();

  router.post("/", express.raw({ type: "*/*", limit: "2mb" }), async (req, res) => {
    const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!isValidAlchemySignature(raw, req.header("x-alchemy-signature"), env.ALCHEMY_WEBHOOK_SIGNING_KEY)) {
      logger.warn("webhook rejected: invalid signature");
      res.status(401).json({ error: "invalid signature" });
      return;
    }

    let payload: z.infer<typeof payloadSchema>;
    try {
      payload = payloadSchema.parse(JSON.parse(raw.toString("utf8")));
    } catch (err) {
      logger.warn({ err }, "webhook rejected: unexpected payload shape");
      res.status(400).json({ error: "unexpected payload" }); // 4xx -> check your GraphQL query selects block{hash number timestamp logs{...}}
      return;
    }
    if (env.ALCHEMY_WEBHOOK_ID && payload.webhookId !== env.ALCHEMY_WEBHOOK_ID) {
      res.status(403).json({ error: "unknown webhook" });
      return;
    }

    const block = payload.event.data.block;
    const logs = block.logs.filter((l) => l.account.address.toLowerCase() === env.contractAddress && l.transaction.status !== 0);

    // Idempotency: one row per delivery id. A duplicate delivery is acknowledged and ignored.
    try {
      await db.webhookDelivery.create({ data: { id: payload.id, webhookId: payload.webhookId, logCount: logs.length } });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
      throw err;
    }

    try {
      const lastConfirmed = await getLastConfirmedBlock();
      let applied = 0;
      // A late retry for a block the reconciler already finalized adds nothing - the reconciler's data is authoritative.
      if (block.number > lastConfirmed) {
        for (const l of logs) {
          const ev = decodeLog(
            { address: l.account.address, topics: l.topics, data: l.data, blockNumber: block.number, blockHash: block.hash, transactionHash: l.transaction.hash, logIndex: l.index },
            block.timestamp,
          );
          if (ev && (await ingest(db, ev, "WEBHOOK")) === "applied") applied++;
        }
      }
      logger.info({ delivery: payload.id, block: block.number, logs: logs.length, applied }, "webhook processed");
      res.status(200).json({ ok: true, applied });
    } catch (err) {
      // Roll back the idempotency record so Alchemy's retry is processed again.
      await db.webhookDelivery.delete({ where: { id: payload.id } }).catch(() => undefined);
      logger.error({ err, delivery: payload.id }, "webhook processing failed; Alchemy will retry");
      res.status(500).json({ error: "processing failed" });
    }
  });

  return router;
}
