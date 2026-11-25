import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { TxStatus } from "../components/TxStatus";
import { useAccount } from "../hooks/queries";
import { useTransaction } from "../hooks/useTransaction";
import { appContract } from "../lib/contract";
import { useWallet } from "../wallet/WalletProvider";

export function CreateElectionPage() {
  const { account, getSigner } = useWallet();
  const { data: me } = useAccount(account);
  const tx = useTransaction();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState("Option A\nOption B");
  const [hours, setHours] = useState(24);
  const [allowlist, setAllowlist] = useState(false);

  if (!me?.isElectionAdmin) return <p className="muted">Only wallets with ELECTION_ADMIN_ROLE can create elections.</p>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const list = options.split("\n").map((s) => s.trim()).filter(Boolean);
    const start = Math.floor(Date.now() / 1000);
    const ok = await tx.run(async () =>
      appContract(await getSigner()).getFunction("createElection")(title, list, start, start + Math.round(hours * 3600), allowlist),
    );
    if (ok) setTimeout(() => navigate("/"), 1500);
  }

  return (
    <section className="card narrow">
      <h1>New election</h1>
      <form onSubmit={(e) => void submit(e)}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </label>
        <label>
          Options (one per line, 2–10)
          <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={5} />
        </label>
        <label>
          Duration (hours)
          <input type="number" min={0.1} step={0.1} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        </label>
        <label className="check">
          <input type="checkbox" checked={allowlist} onChange={(e) => setAllowlist(e.target.checked)} /> Registered voters only
        </label>
        <button type="submit" disabled={tx.state.kind === "wallet" || tx.state.kind === "pending"}>
          Create election (sends a transaction)
        </button>
      </form>
      <TxStatus state={tx.state} />
    </section>
  );
}
