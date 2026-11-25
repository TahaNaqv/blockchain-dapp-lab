// Everything that talks to the blockchain goes through this small interface,
// so the indexer can be tested with a fake chain (including reorgs).
import { Contract, Interface, JsonRpcProvider, type Log } from "ethers";
import { VOTING_ABI } from "../generated/contract.ts";
import { env } from "../config/env.ts";

export const votingInterface = new Interface(VOTING_ABI);

export interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
}

export interface ChainReader {
  getBlockNumber(): Promise<number>;
  getLogs(fromBlock: number, toBlock: number): Promise<RawLog[]>;
  getBlockTimestamp(blockNumber: number): Promise<number>;
  isElectionAdmin(address: string): Promise<boolean>;
}

export class RpcChainReader implements ChainReader {
  readonly provider: JsonRpcProvider;
  private readonly contract: Contract;
  private readonly timestamps = new Map<number, number>();

  constructor(rpcUrl = env.RPC_URL) {
    this.provider = new JsonRpcProvider(rpcUrl, env.chainId, { staticNetwork: true });
    this.contract = new Contract(env.contractAddress, VOTING_ABI, this.provider);
  }

  getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  async getLogs(fromBlock: number, toBlock: number): Promise<RawLog[]> {
    const logs: Log[] = await this.provider.getLogs({ address: env.contractAddress, fromBlock, toBlock });
    return logs.map((l) => ({
      address: l.address,
      topics: [...l.topics],
      data: l.data,
      blockNumber: l.blockNumber,
      blockHash: l.blockHash,
      transactionHash: l.transactionHash,
      logIndex: l.index,
    }));
  }

  async getBlockTimestamp(blockNumber: number) {
    const cached = this.timestamps.get(blockNumber);
    if (cached !== undefined) return cached;
    const block = await this.provider.getBlock(blockNumber);
    if (!block) throw new Error(`Block ${blockNumber} not found`);
    if (this.timestamps.size > 5_000) this.timestamps.clear();
    this.timestamps.set(blockNumber, block.timestamp);
    return block.timestamp;
  }

  async isElectionAdmin(address: string) {
    const role = (await this.contract.getFunction("ELECTION_ADMIN_ROLE")()) as string;
    return (await this.contract.getFunction("hasRole")(role, address)) as boolean;
  }
}
