import { EXPLORER } from "../config";
import type { TxState } from "../hooks/useTransaction";

export function TxStatus({ state }: { state: TxState }) {
  const link = (hash: string) => (
    <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">
      view on Etherscan ↗
    </a>
  );
  switch (state.kind) {
    case "idle":
      return null;
    case "wallet":
      return <p className="tx muted">Confirm in your wallet…</p>;
    case "pending":
      return <p className="tx">⏳ Waiting for the next block (~12 s)… {link(state.hash)}</p>;
    case "confirmed":
      return <p className="tx ok">✔ Confirmed on-chain. {link(state.hash)}</p>;
    case "failed":
      return (
        <p className="tx error" role="alert">
          ✘ {state.message} {state.hash && link(state.hash)}
        </p>
      );
  }
}
