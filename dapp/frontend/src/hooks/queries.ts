// Server state via TanStack Query: caching, background refetch, polling while votes are pending.
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ElectionStatus } from "../lib/types";

export const keys = {
  elections: (status?: ElectionStatus) => ["elections", status ?? "all"] as const,
  election: (id: number) => ["election", id] as const,
  votes: (id: number) => ["votes", id] as const,
  eligibility: (id: number, address?: string) => ["eligibility", id, address] as const,
  account: (address?: string) => ["account", address] as const,
  stats: ["stats"] as const,
};

export const useElections = (status?: ElectionStatus) =>
  useQuery({ queryKey: keys.elections(status), queryFn: ({ signal }) => api.elections(status, 1, signal), refetchInterval: 15_000 });

export const useElection = (id: number) =>
  useQuery({
    queryKey: keys.election(id),
    queryFn: ({ signal }) => api.election(id, signal),
    // Poll faster while some votes are still unconfirmed or the election is live
    refetchInterval: (q) => (q.state.data?.pendingVotes || q.state.data?.status === "active" ? 5_000 : 30_000),
  });

export const useVotes = (id: number) => useQuery({ queryKey: keys.votes(id), queryFn: ({ signal }) => api.votes(id, 1, signal), refetchInterval: 10_000 });

export const useEligibility = (id: number, address?: string) =>
  useQuery({ queryKey: keys.eligibility(id, address), queryFn: ({ signal }) => api.eligibility(id, address!, signal), enabled: !!address });

export const useAccount = (address?: string) =>
  useQuery({ queryKey: keys.account(address), queryFn: ({ signal }) => api.account(address!, signal), enabled: !!address });

export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: ({ signal }) => api.stats(signal), refetchInterval: 15_000 });
