// Prints the GraphQL query for an Alchemy *Custom Webhook* that delivers ONLY this contract's events.
//   npm run webhook:query      (after deploy + export)
import { readFileSync } from "node:fs";
import path from "node:path";
import { Interface } from "ethers";
import { CONTRACT_NAME, IGNORED_EVENTS } from "./dapp.config.js";

const root = path.resolve(import.meta.dirname, "..");
const generated = readFileSync(path.resolve(root, "../backend/src/generated/contract.ts"), "utf8");
const address = generated.match(/CONTRACT_ADDRESS = "(0x[0-9a-fA-F]{40})"/)?.[1];
if (!address || /^0x0{40}$/.test(address)) throw new Error("Deploy and run `npm run export` first.");

const { abi } = JSON.parse(readFileSync(path.join(root, `artifacts/contracts/${CONTRACT_NAME}.sol/${CONTRACT_NAME}.json`), "utf8"));
const iface = new Interface(abi);
// Every event your contract declares, minus OpenZeppelin admin events (see dapp.config.ts)
const events: string[] = [];
iface.forEachEvent((e) => {
  if (!IGNORED_EVENTS.includes(e.name)) events.push(e.name);
});
const topics = events.map((n) => iface.getEvent(n)!.topicHash);

const query = `{
  block {
    hash
    number
    timestamp
    logs(filter: {addresses: ["${address}"], topics: [[${topics.map((t) => `"${t}"`).join(", ")}]]}) {
      data
      topics
      index
      account { address }
      transaction { hash index status }
    }
  }
}`;
console.log("\nPaste this into Alchemy → Webhooks → Create Webhook → Custom Webhook (network: ETH_SEPOLIA):\n");
console.log(query);
console.log("\nEvent topic0 hashes:");
for (const [i, n] of events.entries()) console.log(`  ${n.padEnd(18)} ${topics[i]}`);
