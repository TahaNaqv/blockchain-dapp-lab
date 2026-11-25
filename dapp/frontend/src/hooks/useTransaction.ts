// A reusable transaction state machine: wallet -> pending -> confirmed | failed.
import { useQueryClient } from "@tanstack/react-query";
import type { ContractTransactionResponse } from "ethers";
import { useCallback, useState } from "react";
import { explainError } from "../lib/contract";

export type TxState =
  | { kind: "idle" }
  | { kind: "wallet" }
  | { kind: "pending"; hash: string }
  | { kind: "confirmed"; hash: string }
  | { kind: "failed"; message: string; hash?: string };

export function useTransaction() {
  const [state, setState] = useState<TxState>({ kind: "idle" });
  const queryClient = useQueryClient();

  const run = useCallback(
    async (send: () => Promise<ContractTransactionResponse>) => {
      setState({ kind: "wallet" });
      let hash: string | undefined;
      try {
        const tx = await send(); // ethers simulates first -> contract reverts surface here, before any gas is spent
        hash = tx.hash;
        setState({ kind: "pending", hash });
        const receipt = await tx.wait();
        if (receipt?.status !== 1) throw new Error("Transaction reverted");
        setState({ kind: "confirmed", hash });
        // The backend sees the event via the Alchemy webhook within seconds; refresh everything.
        await queryClient.invalidateQueries();
        return true;
      } catch (err) {
        setState({ kind: "failed", message: explainError(err), hash });
        return false;
      }
    },
    [queryClient],
  );

  return { state, run, reset: () => setState({ kind: "idle" }) };
}
