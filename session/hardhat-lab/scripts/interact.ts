// Talk to your deployed token from code - exactly what a DApp backend/frontend does.
// 1) npx hardhat ignition deploy ignition/modules/FastToken.ts --network sepolia --parameters ignition/parameters.json
// 2) npx hardhat run scripts/interact.ts --network sepolia
//    Optional: set FRIEND_ADDRESS to a classmate's address to send them 100 of your tokens.
import { readFileSync } from "node:fs";
import { network } from "hardhat";

const { ethers } = await network.create();
const { chainId } = await ethers.provider.getNetwork();
const explorer = chainId === 11155111n ? "https://sepolia.etherscan.io" : undefined;

// Ignition records every deployment address per chain:
const deployed = JSON.parse(
  readFileSync(`ignition/deployments/chain-${chainId}/deployed_addresses.json`, "utf8"),
);
const tokenAddress: string = deployed["FastTokenModule#FastToken"];
const token = await ethers.getContractAt("FastToken", tokenAddress);

const [me] = await ethers.getSigners();
const friend = process.env.FRIEND_ADDRESS ?? "0x000000000000000000000000000000000000dEaD";
const fmt = (v: bigint) => ethers.formatUnits(v, 18);

console.log(`Token   : ${await token.name()} (${await token.symbol()}) at ${tokenAddress}`);
if (explorer) console.log(`          ${explorer}/token/${tokenAddress}`);
console.log(`Block   : #${await ethers.provider.getBlockNumber()}   chainId ${chainId}`);
console.log(`Me      : ${me.address}`);
console.log(`          ${fmt(await token.balanceOf(me.address))} tokens · ${ethers.formatEther(await ethers.provider.getBalance(me.address))} ETH`);

// WRITE: send 100 tokens (a transaction signed with your private key)
const tx = await token.transfer(friend, ethers.parseUnits("100", 18));
console.log(`\nSending 100 tokens -> ${friend} ... (waiting for a block, ~12 s)`);
const receipt = await tx.wait();
console.log(`  tx hash : ${tx.hash}`);
if (explorer) console.log(`  explorer: ${explorer}/tx/${tx.hash}`);
console.log(`  block   : #${receipt?.blockNumber}   gas used: ${receipt?.gasUsed}`);

// READ: balances after (free calls)
console.log(`\nMe      : ${fmt(await token.balanceOf(me.address))}`);
console.log(`Friend  : ${fmt(await token.balanceOf(friend))}`);

// EVENTS: Transfer events of this token since it was deployed
// Some RPC plans (e.g. Alchemy free: 10 blocks per eth_getLogs) limit the range -> fall back to the last few blocks.
const toBlock = receipt?.blockNumber ?? 0;
const events = await token
  .queryFilter(token.filters.Transfer(), Math.max(0, toBlock - 5000), toBlock)
  .catch(() => token.queryFilter(token.filters.Transfer(), Math.max(0, toBlock - 9), toBlock));
console.log(`\nTransfer history (${events.length} events):`);
for (const e of events) console.log(`  ${e.args.from.slice(0, 8)}… -> ${e.args.to.slice(0, 8)}…  ${fmt(e.args.value)}`);
