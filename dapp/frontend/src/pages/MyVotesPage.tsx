import { Link } from "react-router";
import { EXPLORER } from "../config";
import { useAccount } from "../hooks/queries";
import { useWallet } from "../wallet/WalletProvider";

export function MyVotesPage() {
  const { account } = useWallet();
  const { data, isPending } = useAccount(account);
  if (!account) return <p className="muted">Connect your wallet to see your votes.</p>;
  if (isPending) return <p className="muted">Loading…</p>;
  return (
    <section>
      <h1>My votes</h1>
      {data?.votes.length === 0 && <p className="muted">You haven't voted yet.</p>}
      <ul className="list">
        {data?.votes.map((v) => (
          <li key={v.txHash} className="card">
            <Link to={`/elections/${v.electionId}`}>{v.title}</Link> — you voted <b>{v.optionLabel}</b> ·{" "}
            <a href={`${EXPLORER}/tx/${v.txHash}`} target="_blank" rel="noreferrer">
              tx ↗
            </a>{" "}
            <span className="muted">{v.confirmed ? "final" : "pending"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
