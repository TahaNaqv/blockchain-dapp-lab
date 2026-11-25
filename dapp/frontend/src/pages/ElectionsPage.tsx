import { useState } from "react";
import { Link } from "react-router";
import { StatusBadge } from "../components/StatusBadge";
import { useElections } from "../hooks/queries";
import type { ElectionStatus } from "../lib/types";

const FILTERS: (ElectionStatus | undefined)[] = [undefined, "active", "upcoming", "ended", "cancelled"];

export function ElectionsPage() {
  const [status, setStatus] = useState<ElectionStatus>();
  const { data, isPending, error } = useElections(status);

  return (
    <section>
      <div className="row">
        <h1>Elections</h1>
        <div className="filters">
          {FILTERS.map((f) => (
            <button key={f ?? "all"} className={f === status ? "chip active" : "chip"} onClick={() => setStatus(f)}>
              {f ?? "all"}
            </button>
          ))}
        </div>
      </div>
      {isPending && <p className="muted">Loading…</p>}
      {error && <p className="error">{error.message}</p>}
      {data?.items.length === 0 && <p className="muted">No elections yet.</p>}
      <div className="cards">
        {data?.items.map((e) => (
          <Link key={e.id} to={`/elections/${e.id}`} className="card election-card">
            <div className="row">
              <h3>
                #{e.id} {e.title}
              </h3>
              <StatusBadge status={e.status} />
            </div>
            <p className="muted">
              {e.optionCount} options · {e.totalVotes} votes · {e.allowlistOnly ? "registered voters only" : "open to everyone"}
            </p>
            <p className="muted">ends {new Date(e.endTime).toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
