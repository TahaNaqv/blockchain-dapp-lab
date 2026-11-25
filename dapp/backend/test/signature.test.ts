import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidAlchemySignature } from "../src/webhooks/alchemy.ts";

describe("isValidAlchemySignature", () => {
  const key = "whsec_abc";
  const body = Buffer.from('{"hello":"world"}');
  const good = createHmac("sha256", key).update(body).digest("hex");

  it("accepts the correct HMAC-SHA256 hex digest of the raw body", () => {
    expect(isValidAlchemySignature(body, good, key)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(isValidAlchemySignature(Buffer.from('{"hello":"w0rld"}'), good, key)).toBe(false);
  });
  it("rejects a wrong key, a missing header and a length mismatch", () => {
    expect(isValidAlchemySignature(body, good, "other")).toBe(false);
    expect(isValidAlchemySignature(body, undefined, key)).toBe(false);
    expect(isValidAlchemySignature(body, good.slice(2), key)).toBe(false);
  });
});
