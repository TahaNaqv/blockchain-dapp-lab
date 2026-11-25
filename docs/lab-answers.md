# ✅ Lab Answers ([02-session-lab.md](02-session-lab.md))

> Try each question yourself **first**. You learn by being stuck for a few minutes, not by reading the answer.

## Lab 1: Hash, Mine, Tamper
1. **Is the new hash similar?** No. Changing one letter changes the hash completely and unpredictably (the *avalanche effect*). You can't
   guess an input from its hash, and you can't find two inputs with the same hash.
2. *(observation)* Each block's **Previous hash** is the **Hash** of the block before it. That link is the "chain".
3. **Which blocks turn red, and why the later ones?** Block #1's data changed, so its hash changed and no longer starts with the required zeros.
   Block #2 stores the *old* hash of #1 as its "previous hash", so its own content (and hash) changed too, and so on down the chain.
   **One edit breaks everything after it.**
4. **After re-mining Block #1, is the chain valid?** Not yet. Block #1 is valid again, but block #2 still points to the old hash. You must
   re-mine **every later block**. On a real network you'd have to do it faster than all honest miners add new blocks, which needs more than
   50 % of the network's computing power (a *51 % attack*).
5. **Why ≈16× slower per extra zero?** A hash is written in hexadecimal: each character has 16 possible values. Requiring one more leading
   `0` makes a valid hash 16 times rarer, so on average you need 16 times more nonce attempts.

**`mini-blockchain.ts` tasks:** T1: difficulty 5 ≈ 16× slower than 4, and 6 ≈ 16× slower again. T2: loop over every block's transactions, parse
`"A -> B : N coins"`, subtract from A and add to B in a `Map`. T3: in `isValid()`, also return `false` if `cur.timestamp < prev.timestamp`.

## Lab 2: First contract
**Why was reading free and instant, but writing cost gas and took ~12 s?** A read (a *call*) is answered by **one** node from its copy of
the blockchain, so nothing changes and nobody else needs to agree. A write is a **transaction**: signed with your key, sent to the network,
executed by **every** node, and stored forever in the next block (~12 s on Sepolia). Gas pays for that work.
**On Etherscan:** *Block* = the block it was included in · *Gas used* = computation consumed · *Transaction fee* = gas used × gas price ·
*Nonce* = your account's transaction counter (0 for your first, then 1, 2…). It stops anyone replaying your transaction.

## Lab 3: Testing (the "your turn" solutions)
```ts
// test/HelloBlockchain.ts
it("whoAmI returns the caller", async function () {
  const { hello, sara } = await networkHelpers.loadFixture(deployHelloFixture);
  expect(await hello.connect(sara).whoAmI()).to.equal(sara.address);
});
```
```solidity
// test/ClassRoom.t.sol
function test_PostRequiresRegistration() public {
    vm.prank(sara);
    vm.expectRevert(ClassRoom.NotRegistered.selector);
    room.post("hi");
}
```
Either one → **15 passing** (both → 16).

## Lab 4: Your token
**Why is `totalSupply` `1000000000000000000000`?** The contract has no decimal numbers. The token uses 18 decimals, so 1 token is stored
as 10¹⁸ units: 1,000 tokens = 1,000 × 10¹⁸. Wallets divide by 10¹⁸ when they display it.
**Who can call `mint`, and which test proves it?** Only the **owner** (the deployer, via `Ownable`'s `onlyOwner`), and never above
`MAX_SUPPLY`. Proven by `"only the owner can mint"` (reverts with `OwnableUnauthorizedAccount`) and `"cannot mint beyond MAX_SUPPLY"` in
`test/FastToken.ts`.

## Lab 5: Re-entrancy
1. **Which line is in the wrong place?** `balances[msg.sender] = 0;` comes **after** `msg.sender.call{value: amount}("")`. The bank pays
   first and updates its records second.
2. **Why does `receive()` run in the middle of `withdraw()`?** Sending ETH to a **contract** runs that contract's `receive()` function
   immediately, before `call` returns. The attacker's `receive()` calls `withdraw()` again while its balance is still recorded as 1 ETH,
   so it gets paid again, and again (10 re-entries).
3. *(break the fix)* With the line moved **and** `nonReentrant` removed, `SafeBank` is as vulnerable as `VulnerableBank`, so the test goes red.
4. **Bonus: `nonReentrant` back, line still in the wrong place?** **Green.** The lock makes the second `withdraw()` call revert, so the
   attacker can't re-enter, even though the ordering is wrong. That's **defence in depth**: two independent protections, so one mistake
   isn't fatal. (Still fix the ordering!)

**The pattern:** **C**hecks → **E**ffects → **I**nteractions. Validate inputs, update your own state, and only then call other contracts or send ETH.

## Lab 6: Whole class, one contract
**Can the election be rigged?** The **counting** can't: the contract enforces one vote per address, and everyone can verify the result.
But **one person can create many addresses** (wallets are free) and vote many times. This is called a *Sybil attack*. Blockchains give
**integrity and transparency**, not **identity**. Real e-voting needs an identity check (e.g. an allowlist of verified students, like the
Voting contract's `allowlistOnly` mode, or identity like NADRA), and often privacy too.
