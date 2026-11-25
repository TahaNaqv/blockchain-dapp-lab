import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Which database do the tests use?
//  - TEST_DATABASE_URL set (CI, or a Neon test database) -> exactly that one.
//  - otherwise a LOCAL database named after a fingerprint of your migrations, e.g. "voting_test_3f9a1c2b".
//    Change your schema/migrations -> a fresh, empty test database is created automatically (nothing is ever dropped).
function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const dir = path.resolve(import.meta.dirname, "prisma/migrations");
  const hash = createHash("sha256");
  for (const name of readdirSync(dir).sort()) {
    hash.update(name);
    try {
      hash.update(readFileSync(path.join(dir, name, "migration.sql")));
    } catch {
      /* migration_lock.toml etc. */
    }
  }
  return `postgresql://voting:voting@localhost:5432/voting_test_${hash.digest("hex").slice(0, 8)}`;
}

const DATABASE_URL = testDatabaseUrl();
process.env.RESOLVED_TEST_DATABASE_URL = DATABASE_URL; // read by test/global-setup.ts

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false, // tests share one database
    env: {
      NODE_ENV: "test",
      DATABASE_URL,
      RPC_URL: "http://127.0.0.1:1", // never used: tests inject a fake chain
      ALCHEMY_WEBHOOK_SIGNING_KEY: "whsec_test_signing_key",
      ALCHEMY_WEBHOOK_ID: "wh_test",
      CONFIRMATIONS: "2",
    },
  },
});
