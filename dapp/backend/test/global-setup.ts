// Creates the test database (if needed) and applies all migrations before the test run.
import { execSync } from "node:child_process";
import pg from "pg";

export default async function setup() {
  const url = new URL(process.env.RESOLVED_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? "postgresql://voting:voting@localhost:5432/voting_test");
  const dbName = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  // Create the test database if we can (local Docker Postgres). On hosted Postgres (e.g. Neon) create it in the
  // dashboard instead and point TEST_DATABASE_URL at it - then this step is simply skipped.
  const client = new pg.Client({ connectionString: admin.toString() });
  try {
    await client.connect();
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    console.warn(`(could not auto-create "${dbName}" - assuming it already exists: ${(err as Error).message})`);
  } finally {
    await client.end().catch(() => undefined);
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: "test" } });
}
