import type { ElectionStatus } from "../lib/types";

export function StatusBadge({ status }: { status: ElectionStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}
