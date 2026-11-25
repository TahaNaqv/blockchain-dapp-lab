import { pino } from "pino";
import { env } from "../config/env.ts";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
  base: { service: "dapp-backend" },
  redact: ["req.headers.authorization", "req.headers['x-alchemy-signature']"],
});
