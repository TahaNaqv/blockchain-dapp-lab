import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://voting:voting@localhost:5432/voting_test";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false, // tests share one database
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      RPC_URL: "http://127.0.0.1:1", // never used: tests inject a fake chain
      ALCHEMY_WEBHOOK_SIGNING_KEY: "whsec_test_signing_key",
      ALCHEMY_WEBHOOK_ID: "wh_test",
      CONFIRMATIONS: "2",
    },
  },
});
