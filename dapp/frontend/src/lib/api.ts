// Typed client for the Express backend. The frontend never reads the chain for data - the backend is the read layer.
import { API_URL } from "../config";
import type { Account, ElectionDetail, ElectionStatus, ElectionSummary, Eligibility, Page, Stats, VoteItem } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { signal, headers: { accept: "application/json" } });
  } catch {
    throw new ApiError(0, "Cannot reach the backend. Is it running?");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  elections: (status?: ElectionStatus, page = 1, signal?: AbortSignal) =>
    get<Page<ElectionSummary>>(`/api/elections?page=${page}${status ? `&status=${status}` : ""}`, signal),
  election: (id: number, signal?: AbortSignal) => get<ElectionDetail>(`/api/elections/${id}`, signal),
  votes: (id: number, page = 1, signal?: AbortSignal) => get<Page<VoteItem>>(`/api/elections/${id}/votes?page=${page}`, signal),
  eligibility: (id: number, address: string, signal?: AbortSignal) => get<Eligibility>(`/api/elections/${id}/eligibility/${address}`, signal),
  account: (address: string, signal?: AbortSignal) => get<Account>(`/api/accounts/${address}`, signal),
  stats: (signal?: AbortSignal) => get<Stats>("/api/stats", signal),
};
