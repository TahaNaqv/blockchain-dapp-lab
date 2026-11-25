// Lab 2 - talk to YOUR deployed HelloBlockchain on Sepolia.
// 1) npx hardhat ignition deploy ignition/modules/HelloBlockchain.ts --network sepolia --parameters ignition/parameters.json
// 2) npx hardhat run scripts/hello.ts --network sepolia
//    Optional: NEW_MESSAGE="anything you like"   (PowerShell: $env:NEW_MESSAGE="...")
import { readFileSync } from "node:fs";
import { network } from "hardhat";

const { ethers } = await network.create();
const { chainId } = await ethers.provider.getNetwork();
const explorer = chainId === 11155111n ? "https://sepolia.etherscan.io" : undefined;

const deployed = JSON.parse(
  readFileSync(`ignition/deployments/chain-${chainId}/deployed_addresses.json`, "utf8"),
);
const address: string = deployed["HelloBlockchainModule#HelloBlockchain"];
const hello = await ethers.getContractAt("HelloBlockchain", address);
const [me] = await ethers.getSigners();

console.log(`Contract : ${address}`);
if (explorer) console.log(`           ${explorer}/address/${address}`);

// 1. READ - a "call": answered by one node from its copy of the chain. Free, instant, no signature.
console.log(`\n[read]  message       = "${await hello.message()}"`);
console.log(`[read]  lastUpdatedBy = ${await hello.lastUpdatedBy()}`);
console.log(`[read]  updateCount   = ${await hello.updateCount()}`);
console.log(`[read]  whoAmI()      = ${await hello.whoAmI()}   (me: ${me.address})`);

// 2. WRITE - a "transaction": signed with your private key, executed by every node, costs gas, waits for a block.
const newMessage = process.env.NEW_MESSAGE ?? `Hello from ${me.address.slice(0, 8)} at FAST!`;
const tx = await hello.setMessage(newMessage);
console.log(`\n[write] setMessage("${newMessage}")`);
console.log(`        tx hash : ${tx.hash}`);
if (explorer) console.log(`        explorer: ${explorer}/tx/${tx.hash}`);
console.log(`        waiting for the next block (~12 s)...`);
const receipt = await tx.wait();
console.log(`        mined in block #${receipt?.blockNumber} · gas used ${receipt?.gasUsed} · nonce ${tx.nonce}`);
console.log(`[read]  message       = "${await hello.message()}"`);

// 3. EVENTS - the logs your contract emitted (what frontends/indexers listen to)
const logs = await hello.queryFilter(hello.filters.MessageChanged(), Math.max(0, (receipt?.blockNumber ?? 0) - 5000), "latest");
console.log(`\n[events] ${logs.length} MessageChanged event(s):`);
for (const e of logs) console.log(`   ${e.args.by.slice(0, 8)}…  "${e.args.oldMessage}" -> "${e.args.newMessage}"`);

// 4. A REVERT - simulate first (staticCall). Nodes reject it before you sign, so you pay nothing.
try {
  await hello.setMessage.staticCall("");
} catch (err: any) {
  const msg = String(err.message ?? "");
  const reason = err.reason ?? msg.match(/reason string '([^']+)'/)?.[1] ?? err.shortMessage ?? msg.split("\n")[0];
  console.log(`\n[revert] setMessage("") would fail: ${reason}`);
  console.log(`         -> "all or nothing": a failing transaction changes no state at all.`);
}
