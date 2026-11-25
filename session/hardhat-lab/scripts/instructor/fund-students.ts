// INSTRUCTOR TOOL (students don't need this) - send Sepolia test ETH to every student address in a file.
//
//   ADDRESSES_FILE=addresses.csv AMOUNT_ETH=0.01 npx hardhat run scripts/instructor/fund-students.ts --network sepolia
//
// The file can be anything containing addresses (Google Form CSV export, WhatsApp paste, one per line):
// every 0x... address is extracted, validated and de-duplicated. Addresses that already hold >= AMOUNT are skipped,
// so it is safe to re-run after more students submit the form.
// Uses the SEPOLIA_PRIVATE_KEY of YOUR funded test wallet. DRY_RUN=1 prints the plan without sending.
import { readFileSync } from "node:fs";
import { network } from "hardhat";

const file = process.env.ADDRESSES_FILE ?? "addresses.csv";
const amountEth = process.env.AMOUNT_ETH ?? "0.01";
const dryRun = process.env.DRY_RUN === "1";

const { ethers } = await network.create();
const [funder] = await ethers.getSigners();
const amount = ethers.parseEther(amountEth);

const raw = readFileSync(file, "utf8");
const found = raw.match(/0x[0-9a-fA-F]{40}/g) ?? [];
const unique = [...new Set(found.map((a) => a.toLowerCase()))]
  .filter((a) => ethers.isAddress(a))
  .map((a) => ethers.getAddress(a))
  .filter((a) => a !== funder.address);

const todo: string[] = [];
for (const a of unique) {
  if ((await ethers.provider.getBalance(a)) < amount) todo.push(a);
}

const balance = await ethers.provider.getBalance(funder.address);
const needed = amount * BigInt(todo.length);
console.log(`Funder   : ${funder.address}  (${ethers.formatEther(balance)} ETH)`);
console.log(`Addresses: ${unique.length} unique in ${file}, ${todo.length} need funding x ${amountEth} ETH = ${ethers.formatEther(needed)} ETH`);
if (needed > balance) {
  console.error(`✘ Not enough ETH: need ${ethers.formatEther(needed)}, have ${ethers.formatEther(balance)}. Lower AMOUNT_ETH or top up.`);
  process.exit(1);
}
if (dryRun) {
  console.log("DRY_RUN=1 -> nothing sent.");
  process.exit(0);
}
if (todo.length === 0) process.exit(0);

// Send all transfers back-to-back with explicit nonces (no waiting between them), then wait for all.
let nonce = await ethers.provider.getTransactionCount(funder.address, "pending");
const sent = [];
for (const to of todo) {
  const tx = await funder.sendTransaction({ to, value: amount, nonce: nonce++ });
  console.log(`  -> ${to}  ${tx.hash}`);
  sent.push(tx);
}
console.log(`\nWaiting for ${sent.length} transactions to be mined...`);
const receipts = await Promise.all(sent.map((tx) => tx.wait()));
console.log(`✔ Funded ${receipts.filter((r) => r?.status === 1).length}/${sent.length} students with ${amountEth} ETH each.`);
