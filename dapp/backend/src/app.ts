import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { accountsRouter } from "./api/accounts.ts";
import { electionsRouter } from "./api/elections.ts";
import { systemRouter } from "./api/system.ts";
import { env } from "./config/env.ts";
import type { ChainReader } from "./lib/chain.ts";
import type { Db } from "./lib/db.ts";
import { logger } from "./lib/logger.ts";
import { errorHandler, notFound } from "./middleware/errors.ts";
import { alchemyWebhookRouter } from "./webhooks/alchemy.ts";

export interface AppDeps {
  db: Db;
  chain: ChainReader;
  getLastConfirmedBlock: () => Promise<number>;
}

export function createApp({ db, chain, getLastConfirmedBlock }: AppDeps) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // behind a reverse proxy / PaaS load balancer

  app.use(pinoHttp({ logger, genReqId: (req) => (req.headers["x-request-id"] as string) ?? randomUUID(), autoLogging: env.NODE_ENV !== "test" }));
  app.use(helmet());

  // Webhook first: it needs the RAW body for signature verification (no JSON parser, no CORS, no rate limit).
  if (env.webhookEnabled) app.use("/webhooks/alchemy", alchemyWebhookRouter(db, getLastConfirmedBlock));

  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));

  app.use(systemRouter(db, chain, getLastConfirmedBlock));
  app.use("/api/elections", electionsRouter(db));
  app.use("/api/accounts", accountsRouter(db, chain));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
