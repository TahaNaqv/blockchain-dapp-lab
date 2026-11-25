import { existsSync } from "node:fs";
import { z } from "zod";
import { CHAIN_ID, CONTRACT_ADDRESS, DEPLOY_BLOCK } from "../generated/contract.ts";

if (existsSync(".env") && process.env.NODE_ENV !== "test") process.loadEnvFile(".env");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().url(),
  RPC_URL: z.string().url(),
  ALCHEMY_WEBHOOK_SIGNING_KEY: z.string().default(""),
  ALCHEMY_WEBHOOK_ID: z.string().default(""),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  CONFIRMATIONS: z.coerce.number().int().min(0).default(6),
  RECONCILE_INTERVAL_SECONDS: z.coerce.number().positive().default(15),
  LOG_CHUNK_BLOCKS: z.coerce.number().int().min(1).default(10),
  MAX_BLOCKS_PER_TICK: z.coerce.number().int().min(1).default(500),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("✘ Invalid environment configuration (see backend/.env.example):");
  for (const issue of parsed.error.issues) console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  chainId: CHAIN_ID,
  contractAddress: CONTRACT_ADDRESS.toLowerCase(),
  deployBlock: DEPLOY_BLOCK,
  webhookEnabled: parsed.data.ALCHEMY_WEBHOOK_SIGNING_KEY.length > 0,
};

export type Env = typeof env;

export function assertContractConfigured() {
  if (/^0x0{40}$/.test(CONTRACT_ADDRESS)) {
    console.error("✘ No contract address yet. Deploy the contract, then run `npm run export` (see README).");
    process.exit(1);
  }
}
