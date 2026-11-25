// Lab 6 - vote in the class election on the shared Voting DApp contract (Sepolia).
//
// Git Bash / macOS / Linux:
//   VOTING_ADDRESS=0x... OPTION=0 npx hardhat run scripts/vote.ts --network sepolia
// Windows PowerShell:
//   $env:VOTING_ADDRESS="0x..."; $env:OPTION="0"; npx hardhat run scripts/vote.ts --network sepolia
// Optional: ELECTION_ID (default 1). Run without OPTION to just see the election and results.
import { network } from "hardhat";

// We only need the functions/errors we call - a "human-readable ABI" (no need for the contract's source code).
const VOTING_ABI = [
  "function getElection(uint256) view returns (tuple(string title, uint64 startTime, uint64 endTime, bool allowlistOnly, bool cancelled, uint8 optionCount, uint32 totalVotes, address creator))",
  "function getOptions(uint256) view returns (string[])",
  "function getResults(uint256) view returns (uint256[])",
  "function canVote(uint256, address) view returns (bool)",
  "function hasVoted(uint256, address) view returns (bool)",
  "function vote(uint256 electionId, uint8 option)",
  "error AlreadyVoted(address voter)",
  "error NotEligible(address voter)",
  "error ElectionNotActive(uint256 electionId)",
  "error InvalidOption(uint8 option)",
  "error ElectionIsCancelled(uint256 electionId)",
  "error ElectionNotFound(uint256 electionId)",
];

const address = process.env.VOTING_ADDRESS;
if (!address) throw new Error("Set VOTING_ADDRESS (written on the board)");
const electionId = BigInt(process.env.ELECTION_ID ?? 1);
const option = process.env.OPTION;

const { ethers } = await network.create();
const [me] = await ethers.getSigners();
const voting = new ethers.Contract(address, VOTING_ABI, me);

async function show() {
  const [e, options, results] = await Promise.all([voting.getElection(electionId), voting.getOptions(electionId), voting.getResults(electionId)]);
  console.log(`\nElection #${electionId}: ${e.title}  (${e.totalVotes} votes${e.cancelled ? ", CANCELLED" : ""})`);
  (options as string[]).forEach((label, i) => console.log(`  [${i}] ${label.padEnd(30)} ${results[i]}`));
}

await show();
console.log(`\nMe: ${me.address}   can vote: ${await voting.canVote(electionId, me.address)}`);

if (option !== undefined) {
  try {
    const tx = await voting.vote(electionId, Number(option));
    console.log(`\nVoting for option ${option}...  tx ${tx.hash}`);
    console.log(`https://sepolia.etherscan.io/tx/${tx.hash}`);
    await tx.wait();
    console.log("✔ Vote recorded on-chain. Watch the projector - the backend picks it up via the Alchemy webhook.");
    await show();
  } catch (err) {
    // Decode the contract's custom error into its name
    const data = (err as { data?: string }).data;
    const parsed = data ? voting.interface.parseError(data) : null;
    console.log(`\n✘ Vote rejected: ${parsed ? parsed.name : (err as Error).message.split("\n")[0]}`);
  }
}
