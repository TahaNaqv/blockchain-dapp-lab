import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { env } from "../config/env.ts";

export function createDb(url = env.DATABASE_URL) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export type Db = ReturnType<typeof createDb>;
