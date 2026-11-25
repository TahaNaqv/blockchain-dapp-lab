import { describe, expect, it } from "vitest";
import { explainError, contractInterface } from "../src/lib/contract";

describe("explainError", () => {
  it("decodes our custom errors into friendly messages", () => {
    const data = contractInterface.encodeErrorResult("AlreadyVoted", ["0x00000000000000000000000000000000000000a1"]);
    expect(explainError({ data })).toBe("You have already voted in this election.");
  });
  it("detects a wallet rejection", () => {
    expect(explainError({ code: "ACTION_REJECTED" })).toBe("You rejected the request in your wallet.");
    expect(explainError({ code: 4001 })).toBe("You rejected the request in your wallet.");
  });
  it("falls back to the RPC message", () => {
    expect(explainError({ shortMessage: "network error" })).toBe("network error");
  });
});
