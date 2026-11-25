// Create an election from the command line (admin wallet = SEPOLIA_PRIVATE_KEY).
//   TITLE="Best use-case?" OPTIONS="Remittances,Land records,Digital ID" HOURS=2 ALLOWLIST=false \
//     npx hardhat run scripts/create-election.ts --network sepolia
import { readFileSync } from "node:fs";
import path from "node:path";
import { network } from "hardhat";

const { ethers } = await network.create();
const { chainId } = await ethers.provider.getNetwork();
const deployed = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, `../ignition/deployments/chain-${chainId}/deployed_addresses.json`), "utf8"),
);
const voting = await ethers.getContractAt("Voting", deployed["VotingModule#Voting"]);

const title = process.env.TITLE ?? "Which blockchain use-case would help Pakistan most?";
const options = (process.env.OPTIONS ?? "Remittances,Land records,Supply chain,Digital identity").split(",").map((s) => s.trim());
const hours = Number(process.env.HOURS ?? 2);
const allowlist = process.env.ALLOWLIST === "true";

const now = (await ethers.provider.getBlock("latest"))!.timestamp;
const tx = await voting.createElection(title, options, now, now + Math.round(hours * 3600), allowlist);
console.log(`creating election... ${tx.hash}`);
const receipt = await tx.wait();
const log = receipt!.logs.map((l) => voting.interface.parseLog(l)).find((p) => p?.name === "ElectionCreated");
console.log(`✔ election #${log?.args.electionId} "${title}" (${options.length} options, ${hours} h, allowlist=${allowlist})`);
