/**
 * Lab 1 - Build a blockchain in ~100 lines of TypeScript (Node's built-in crypto only).
 * Run:  npx hardhat run scripts/lab1/mini-blockchain.ts
 *
 * You will see:
 *   1. Hashing: tiny input change -> totally different hash (avalanche effect)
 *   2. Mining (Proof of Work): searching for a nonce so the hash starts with N zeros
 *   3. Chaining: each block stores the previous block's hash
 *   4. Tampering: change one old transaction -> the whole chain becomes INVALID
 */
import { createHash } from "node:crypto";

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

class Block {
  nonce = 0;
  hash: string;
  readonly timestamp = Date.now();

  constructor(
    public readonly index: number,
    public transactions: string[],
    public readonly prevHash: string,
  ) {
    this.hash = this.computeHash();
  }

  computeHash(): string {
    return sha256(
      JSON.stringify({
        index: this.index,
        timestamp: this.timestamp,
        tx: this.transactions,
        prev: this.prevHash,
        nonce: this.nonce,
      }),
    );
  }

  /** Proof of Work: keep changing the nonce until the hash starts with `difficulty` zeros. */
  mine(difficulty: number): void {
    const target = "0".repeat(difficulty);
    const start = performance.now();
    this.nonce = 0;
    this.hash = this.computeHash();
    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.computeHash();
    }
    const secs = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`  Block ${this.index} mined | nonce=${String(this.nonce).padStart(8)} | ${secs.padStart(5)}s | ${this.hash.slice(0, 20)}...`);
  }
}

class Blockchain {
  chain: Block[];

  constructor(public readonly difficulty = 4) {
    const genesis = new Block(0, ["Genesis block"], "0".repeat(64));
    genesis.mine(difficulty);
    this.chain = [genesis];
  }

  addBlock(transactions: string[]): void {
    const block = new Block(this.chain.length, transactions, this.chain[this.chain.length - 1].hash);
    block.mine(this.difficulty);
    this.chain.push(block);
  }

  isValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const cur = this.chain[i];
      const prev = this.chain[i - 1];
      if (cur.hash !== cur.computeHash()) {
        console.log(`  ✗ Block ${i}: stored hash doesn't match its contents (data was tampered)`);
        return false;
      }
      if (cur.prevHash !== prev.hash) {
        console.log(`  ✗ Block ${i}: prevHash link broken`);
        return false;
      }
      if (!cur.hash.startsWith("0".repeat(this.difficulty))) {
        console.log(`  ✗ Block ${i}: not mined (no valid proof of work)`);
        return false;
      }
    }
    return true;
  }
}

console.log("\n=== 1. HASHING (avalanche effect) ===");
for (const msg of ["FAST NUCES", "FAST NUCEs", "FAST NUCES!"]) {
  console.log(`  sha256(${JSON.stringify(msg).padEnd(15)}) = ${sha256(msg)}`);
}

console.log("\n=== 2. MINING: difficulty vs. time ===");
for (let d = 1; d <= 4; d++) new Block(1, ["demo"], "0".repeat(64)).mine(d); // try 5 and 6 yourself (Task T1)

console.log("\n=== 3. BUILD A CHAIN (difficulty 4) ===");
const bc = new Blockchain(4);
bc.addBlock(["Ali -> Sara : 10 coins", "Sara -> Hamza : 3 coins"]);
bc.addBlock(["Hamza -> Ali : 1 coin"]);
bc.addBlock(["Ayesha -> Ali : 7 coins"]);
for (const b of bc.chain) {
  console.log(`  #${b.index} prev=${b.prevHash.slice(0, 12)}... hash=${b.hash.slice(0, 12)}... tx=${JSON.stringify(b.transactions)}`);
}
console.log("  Chain valid?", bc.isValid());

console.log("\n=== 4. TAMPER: Ali changes 10 coins -> 1000 coins in block 1 ===");
bc.chain[1].transactions[0] = "Ali -> Sara : 1000 coins";
console.log("  Chain valid?", bc.isValid());

console.log("\n  Ali re-mines block 1 to fix its hash...");
bc.chain[1].mine(bc.difficulty);
console.log("  Chain valid?", bc.isValid());
console.log("  -> He must re-mine EVERY later block, faster than the rest of the network.");
console.log("     That is why rewriting history needs >50% of the network's hash power.\n");

// ---------------- YOUR TASKS ----------------
// T1. Change the difficulty to 5 and 6. How does mining time grow? (roughly x16 per extra zero - why?)
// T2. Add a method printBalances() that replays all transactions and prints each person's balance.
// T3. Make isValid() also reject a block whose timestamp is earlier than the previous block's.
