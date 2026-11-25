import { Contract, Interface, type Signer } from "ethers";
import { VOTING_ABI, CONTRACT_ADDRESS } from "../generated/contract";

export const votingInterface = new Interface(VOTING_ABI);
export const isContractConfigured = !/^0x0{40}$/.test(CONTRACT_ADDRESS);

export function votingContract(signer: Signer) {
  return new Contract(CONTRACT_ADDRESS, VOTING_ABI, signer);
}

const FRIENDLY: Record<string, string> = {
  AlreadyVoted: "You have already voted in this election.",
  NotEligible: "Your address is not registered for this election.",
  ElectionNotActive: "This election is not open for voting right now.",
  ElectionIsCancelled: "This election was cancelled.",
  ElectionNotFound: "This election does not exist.",
  InvalidOption: "That option does not exist.",
  InvalidTitle: "Title must be 1–120 characters.",
  InvalidOptions: "Provide 2–10 options, each 1–60 characters.",
  InvalidTimes: "End time must be after the start time and in the future.",
  EnforcedPause: "Voting is paused by an administrator.",
  AccessControlUnauthorizedAccount: "Your wallet doesn't have permission for this action.",
};

/** Turn wallet / RPC / contract errors into a sentence a user understands. */
export function explainError(err: unknown): string {
  const e = err as { code?: string | number; data?: string; info?: { error?: { data?: string; code?: number } }; shortMessage?: string; message?: string };
  if (e.code === "ACTION_REJECTED" || e.code === 4001 || e.info?.error?.code === 4001) return "You rejected the request in your wallet.";
  if (e.code === "INSUFFICIENT_FUNDS") return "Not enough SepoliaETH to pay for gas. Get some from a faucet.";
  const data = e.data ?? e.info?.error?.data;
  if (typeof data === "string" && data.startsWith("0x") && data.length >= 10) {
    try {
      const parsed = votingInterface.parseError(data);
      if (parsed) return FRIENDLY[parsed.name] ?? `Contract rejected the transaction: ${parsed.name}`;
    } catch {
      /* not one of our errors */
    }
  }
  return e.shortMessage ?? e.message ?? "Something went wrong.";
}
