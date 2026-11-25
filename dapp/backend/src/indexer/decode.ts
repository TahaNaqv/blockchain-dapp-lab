import { contractInterface, type RawLog } from "../lib/chain.ts";

export type AppEvent =
  | {
      name: "ElectionCreated";
      args: { electionId: number; creator: string; title: string; options: string[]; startTime: number; endTime: number; allowlistOnly: boolean };
    }
  | { name: "VotersRegistered"; args: { electionId: number; voters: string[] } }
  | { name: "VoteCast"; args: { electionId: number; voter: string; option: number } }
  | { name: "ElectionCancelled"; args: { electionId: number } };

export type DecodedLog = AppEvent & {
  id: string; // `${txHash}:${logIndex}`
  blockNumber: number;
  blockHash: string;
  blockTimestamp: number;
  txHash: string;
  logIndex: number;
};

/** Decode one of OUR four events; returns null for anything else (RoleGranted, Paused, ...). */
export function decodeLog(log: RawLog, blockTimestamp: number): DecodedLog | null {
  let parsed;
  try {
    parsed = contractInterface.parseLog({ topics: log.topics, data: log.data });
  } catch {
    return null;
  }
  if (!parsed) return null;

  const base = {
    id: `${log.transactionHash.toLowerCase()}:${log.logIndex}`,
    blockNumber: log.blockNumber,
    blockHash: log.blockHash.toLowerCase(),
    blockTimestamp,
    txHash: log.transactionHash.toLowerCase(),
    logIndex: log.logIndex,
  };
  const a = parsed.args;
  switch (parsed.name) {
    case "ElectionCreated":
      return {
        ...base,
        name: "ElectionCreated",
        args: {
          electionId: Number(a.electionId),
          creator: String(a.creator).toLowerCase(),
          title: String(a.title),
          options: Array.from(a.options as string[]),
          startTime: Number(a.startTime),
          endTime: Number(a.endTime),
          allowlistOnly: Boolean(a.allowlistOnly),
        },
      };
    case "VotersRegistered":
      return { ...base, name: "VotersRegistered", args: { electionId: Number(a.electionId), voters: Array.from(a.voters as string[]).map((v) => v.toLowerCase()) } };
    case "VoteCast":
      return { ...base, name: "VoteCast", args: { electionId: Number(a.electionId), voter: String(a.voter).toLowerCase(), option: Number(a.option) } };
    case "ElectionCancelled":
      return { ...base, name: "ElectionCancelled", args: { electionId: Number(a.electionId) } };
    default:
      return null;
  }
}
