// Types of the backend API responses (keep in sync with backend/src/api).
export type ElectionStatus = "upcoming" | "active" | "ended" | "cancelled";

export interface Page<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

export interface ElectionSummary {
  id: number;
  title: string;
  optionCount: number;
  startTime: string;
  endTime: string;
  allowlistOnly: boolean;
  status: ElectionStatus;
  totalVotes: number;
}

export interface ElectionDetail {
  id: number;
  title: string;
  creator: string;
  startTime: string;
  endTime: string;
  allowlistOnly: boolean;
  status: ElectionStatus;
  registeredVoters: number | null;
  totalVotes: number;
  pendingVotes: number;
  options: { index: number; label: string; votes: number }[];
  createdTx: string;
}

export interface VoteItem {
  voter: string;
  option: number;
  txHash: string;
  blockNumber: number;
  castAt: string;
  confirmed: boolean;
}

export interface Eligibility {
  electionId: number;
  address: string;
  status: ElectionStatus;
  hasVoted: boolean;
  votedOption: number | null;
  isRegistered: boolean;
  canVote: boolean;
}

export interface Account {
  address: string;
  isElectionAdmin: boolean;
  votes: { electionId: number; title: string; option: number; optionLabel: string | null; txHash: string; castAt: string; confirmed: boolean }[];
}

export interface Stats {
  elections: number;
  votes: number;
  uniqueVoters: number;
  sync: { lastConfirmedBlock: number; chainHead: number | null; lagBlocks: number | null; webhookEnabled: boolean };
}
