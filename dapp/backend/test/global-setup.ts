// Creates the test database (if needed) and applies all migrations before the test run.
import { execSync } from "node:child_process";
import pg from "pg";

export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "postgresql://voting:voting@localhost:5432/voting_test");
  const dbName = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: "test" } });
}
