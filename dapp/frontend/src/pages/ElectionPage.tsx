import { useParams } from "react-router";
import { short } from "../components/ConnectButton";
import { StatusBadge } from "../components/StatusBadge";
import { TxStatus } from "../components/TxStatus";
import { EXPLORER } from "../config";
import { useElection, useEligibility, useVotes } from "../hooks/queries";
import { useTransaction } from "../hooks/useTransaction";
import { votingContract } from "../lib/contract";
import { useWallet } from "../wallet/WalletProvider";

export function ElectionPage() {
  const id = Number(useParams().id);
  const { account, chainOk, getSigner } = useWallet();
  const { data: e, isPending, error } = useElection(id);
  const { data: votes } = useVotes(id);
  const { data: elig } = useEligibility(id, account);
  const tx = useTransaction();

  if (isPending) return <p className="muted">Loading…</p>;
  if (error || !e) return <p className="error">{error?.message ?? "Not found"}</p>;

  const vote = (option: number) =>
    tx.run(async () => votingContract(await getSigner()).getFunction("vote")(id, option));

  const busy = tx.state.kind === "wallet" || tx.state.kind === "pending";
  const canVote = !!account && chainOk && !!elig?.canVote && !busy;

  return (
    <section>
      <div className="row">
        <h1>
          #{e.id} {e.title}
        </h1>
        <StatusBadge status={e.status} />
      </div>
      <p className="muted">
        {new Date(e.startTime).toLocaleString()} → {new Date(e.endTime).toLocaleString()} ·{" "}
        {e.allowlistOnly ? `${e.registeredVoters} registered voters` : "open to everyone"} · created in{" "}
        <a href={`${EXPLORER}/tx/${e.createdTx}`} target="_blank" rel="noreferrer">
          {short(e.createdTx)}
        </a>
      </p>

      <div className="card">
        <h2>
          Results · {e.totalVotes} votes {e.pendingVotes > 0 && <span className="muted">({e.pendingVotes} awaiting confirmation)</span>}
        </h2>
        {e.options.map((o) => {
          const pct = e.totalVotes ? Math.round((o.votes / e.totalVotes) * 100) : 0;
          const mine = elig?.votedOption === o.index;
          return (
            <div key={o.index} className="option">
              <div className="row">
                <span>
                  {o.label} {mine && <span className="badge badge-active">your vote</span>}
                </span>
                <span className="muted">
                  {o.votes} · {pct}%
                </span>
              </div>
              <div className="bar">
                <div style={{ width: `${pct}%` }} />
              </div>
              {e.status === "active" && (
                <button disabled={!canVote} onClick={() => void vote(o.index)}>
                  Vote for “{o.label}”
                </button>
              )}
            </div>
          );
        })}
        <TxStatus state={tx.state} />
        {e.status === "active" && !account && <p className="muted">Connect your wallet to vote.</p>}
        {elig && !elig.isRegistered && <p className="muted">Your address is not registered for this election.</p>}
        {elig?.hasVoted && <p className="muted">You have voted in this election.</p>}
      </div>

      <div className="card">
        <h2>Latest votes</h2>
        <table>
          <thead>
            <tr>
              <th>Voter</th>
              <th>Option</th>
              <th>Block</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {votes?.items.map((v) => (
              <tr key={v.txHash}>
                <td>{short(v.voter)}</td>
                <td>{e.options[v.option]?.label}</td>
                <td>
                  <a href={`${EXPLORER}/tx/${v.txHash}`} target="_blank" rel="noreferrer">
                    {v.blockNumber}
                  </a>
                </td>
                <td>{v.confirmed ? "✔ final" : "⏳ pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
