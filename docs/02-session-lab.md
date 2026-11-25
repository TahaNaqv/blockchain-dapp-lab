# 🧱 Hands-On Blockchain Lab — "From Hash to DApp"

**FAST-NUCES Islamabad · Blockchain course (Dr. Noshina Tariq) · Guest session**
Wednesday 25 Nov · 11:30 AM – 1:00 PM

> We work the way blockchain engineers do in industry: **Hardhat** (framework) + **VS Code** + **MetaMask** + **Etherscan**,
> deploying to **Sepolia** — Ethereum's public test network. Real blockchain, real nodes worldwide, every transaction public on
> **sepolia.etherscan.io** — but the ETH is free test ETH.
>
> Setup didn't work on your laptop? **Pair up** with someone whose setup works and drive together.
>
> ⚠️ Use a **practice MetaMask wallet only**. Never paste the private key of a wallet that holds real money anywhere.

---

## ✅ Before class (at home — needs ~30 min and good internet)

📘 **Full step-by-step instructions for Windows, macOS and Linux: [01-setup.md](01-setup.md).** Quick version:

| Need | How |
|---|---|
| **Node.js LTS** (26; 22.13+ / 24 also work) | nodejs.org → LTS installer. Check: `node -v` |
| **VS Code** | code.visualstudio.com (+ "Solidity" extension by Nomic Foundation) |
| **MetaMask** + practice wallet | metamask.io only → Create new wallet → network selector → **Show test networks** → **Sepolia** |
| **Free test ETH** | Copy your address (`0x…`) → **Google Cloud Web3 faucet** (https://cloud.google.com/application/web3/faucet/ethereum/sepolia) → sign in with Google → paste address → **Get 0.05 Sepolia ETH**. Didn't work? Ask in the class group — the presenter can send you some. |
| **Course repo** | `git clone https://github.com/TahaNaqv/blockchain-dapp-lab.git` → terminal in `blockchain-dapp-lab/session/hardhat-lab` → `npm install` → `npx hardhat test` → **14 passing** ✅ |

> 🪟 PowerShell says *"running scripts is disabled on this system"*? Run once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (answer **Y**) — or use **Command Prompt**.

---

## Lab 1 — Hash, Mine, Tamper (8 min)

Open **`session/playground/blockchain_playground.html`** (double-click — works offline).

1. **Hash:** type `FAST NUCES`, then change one letter. Is the new hash even *similar*?
2. **Chain:** each block's **Previous hash** = the **Hash** of the block before it.
3. **Tamper:** in Block #1 change `10 coins` → `1000 coins`. Which blocks turn red — and why the *later* ones too?
4. **Cover it up:** click **⛏ Mine** on Block #1. Is the chain valid now? What would you need to do?
5. **Difficulty:** switch 3 → 4 and mine. How much slower? (≈16× — why?)

Prefer code? In `session/hardhat-lab`: `npx hardhat run scripts/lab1/mini-blockchain.ts` — the same blockchain in ~100 lines of TypeScript (tasks at the bottom of the file).

> 💡 Rewriting history = redoing the proof-of-work for *every later block*, faster than the whole network.

**Meanwhile:** MetaMask → **Sepolia** → do you have **~0.05 SepoliaETH**? No → tell the presenter now.

---

## Lab 2 — Your First Contract: Write → Test → Deploy to Sepolia (22 min)

### 2.1 The project (3 min)
Open `session/hardhat-lab` in VS Code:
```
contracts/            HelloBlockchain.sol, ClassRoom.sol, FastToken.sol, security/
test/                 *.t.sol = Solidity tests   ·   *.ts = TypeScript tests
ignition/modules/     deployment recipes          ignition/parameters.json = deployment settings
scripts/              hello.ts, interact.ts, vote.ts   (talk to the blockchain from code)
hardhat.config.ts     compiler version + the "sepolia" network
```

### 2.2 Read the contract (3 min) — `contracts/HelloBlockchain.sol`

```solidity
contract HelloBlockchain {
    string public message;          // state: stored on-chain forever ("public" = free getter)
    address public lastUpdatedBy;
    uint256 public updateCount;

    event MessageChanged(address indexed by, string oldMessage, string newMessage);

    constructor(string memory _initialMessage) { ... }            // runs ONCE, at deployment

    function setMessage(string calldata _newMessage) external {   // WRITE -> transaction -> gas
        require(bytes(_newMessage).length > 0, "Message cannot be empty");
        emit MessageChanged(msg.sender, message, _newMessage);
        ...
    }

    function whoAmI() external view returns (address) { ... }     // READ (view) -> free
}
```

### 2.3 Compile & test (3 min)
```bash
npx hardhat build
npx hardhat test mocha      # see "HelloBlockchain" tests pass
```

### 2.4 Store your key safely (4 min)
MetaMask → account menu → **Account details** → **Show private key** → password → copy. ⚠️ Practice wallet only!
```bash
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```
First time: create a **keystore password**, then paste the key. It's stored **encrypted** — never in code, never on GitHub.
Hardhat asks for the keystore password whenever you use Sepolia.

### 2.5 Deploy to Sepolia (4 min)
Edit `ignition/parameters.json` → change `initialMessage` to your own message. Then:
```bash
npx hardhat ignition deploy ignition/modules/HelloBlockchain.ts --network sepolia --parameters ignition/parameters.json
```
Type **y** to "Confirm deploy to network sepolia (11155111)?". Wait ~12 s. Copy your **contract address**.
Open `https://sepolia.etherscan.io/address/<your address>` — your contract is live, on thousands of machines.

### 2.6 Talk to it from code (5 min)
```bash
npx hardhat run scripts/hello.ts --network sepolia
# custom message — Git Bash/macOS/Linux:
NEW_MESSAGE="FAST rocks" npx hardhat run scripts/hello.ts --network sepolia
# PowerShell:
$env:NEW_MESSAGE="FAST rocks"; npx hardhat run scripts/hello.ts --network sepolia
```
The script shows: **[read]** calls (free, instant) → **[write]** a transaction (signed, gas, waits for a block — open the
Etherscan link!) → **[events]** your `MessageChanged` logs → **[revert]** `setMessage("")` rejected *before* you pay anything.

**Answer:** Why was reading free and instant, while writing cost gas and took ~12 s? On Etherscan, find your tx's **block**, **gas used**,
**fee** and **nonce**.

---

## Lab 3 — Testing Like a Professional (12 min)

```bash
npx hardhat test           # all 14 tests, < 1 second
npx hardhat test solidity  # only Solidity tests
npx hardhat test mocha     # only TypeScript tests
```
Tests run on Hardhat's **in-memory simulator** — no network, no gas, instant. In industry you test *everything* here before
spending a single wei on a real network.

Open **`test/ClassRoom.t.sol`** (Solidity test — same syntax as Foundry):
- `vm.prank(ali)` → the next call comes **from** Ali.
- `vm.expectRevert(ClassRoom.AlreadyVoted.selector)` → we *expect* this to fail.
- `testFuzz_InvalidOptionReverts(uint256 option)` → runs with **256 random inputs**.

Open **`test/HelloBlockchain.ts`** (TypeScript test — how a DApp sees your contract):
`loadFixture`, `ethers.deployContract(...)`, `hello.connect(ali).setMessage(...)`, `.to.emit(...).withArgs(...)`, `.to.be.revertedWith(...)`.

🧪 **Your turn (pick one):**
- `test/HelloBlockchain.ts`: test that `whoAmI()` called by `sara` returns `sara.address`.
- `test/ClassRoom.t.sol`: write `test_PostRequiresRegistration()` — an unregistered address calling `post` must revert with `NotRegistered`.

Run again → **15 passing**. 🎉

---

## Lab 4 — Launch Your Own Cryptocurrency (ERC-20) on Sepolia (17 min)

1. Read `contracts/FastToken.sol` — OpenZeppelin's audited ERC-20 + `Ownable` + a capped `mint`. Run `npx hardhat test mocha` → FastToken tests.
2. Edit `ignition/parameters.json` → **your** token name & symbol (e.g. `"Sara Coin"`, `"SARA"`).
3. Deploy:
   ```bash
   npx hardhat ignition deploy ignition/modules/FastToken.ts --network sepolia --parameters ignition/parameters.json
   ```
4. Get your neighbour's address and send them 100 tokens from code:
   ```bash
   # Git Bash / macOS / Linux
   FRIEND_ADDRESS=0xNeighbourAddress npx hardhat run scripts/interact.ts --network sepolia
   # PowerShell
   $env:FRIEND_ADDRESS="0xNeighbourAddress"; npx hardhat run scripts/interact.ts --network sepolia
   ```
   Read `scripts/interact.ts`: provider → contract (ABI + address) → read → write (signed tx) → wait → events. That's every DApp.
5. Open `https://sepolia.etherscan.io/token/<your token address>` → **Holders**, **Transfers**.
6. MetaMask (Sepolia) → **Tokens → Import tokens** → your token address → **900** left. Your neighbour imports *your* token → sees **100**.
   Send each other more tokens from MetaMask.

**Answer:** Why does Etherscan show `totalSupply` as `1000000000000000000000`? Who can call `mint`, and which test proves it?

---

## Lab 5 — Hack a Bank, Then Prove the Fix With Tests (10 min)

The **DAO hack (2016)** drained ~3.6M ETH with this bug: send money *before* updating the balance.
(We do this in the simulator — attacking contracts on a public network is not a classroom activity.)
```bash
npx hardhat test solidity
```
Find `re-entries: 10` and `loot (wei): 11000000000000000000` — the attacker put in 1 ETH and took out 11.
1. Read `contracts/security/VulnerableBank.sol` → `withdraw()`. Which line is in the wrong place?
2. Read `Attacker.sol` → `receive()`. Why does it run in the *middle* of `withdraw()`?
3. **Break the fix:** in `SafeBank.sol` move `balances[msg.sender] = 0;` *below* the `call`, **and** delete `nonReentrant`.
   Run the tests → `test_SafeBankBlocksTheAttack` goes **red** 🔴. Undo → **green** 🟢.
4. Bonus: put back `nonReentrant` but keep the line in the wrong place. Red or green? Why?

**Name the pattern that fixes it:** C______ → E______ → I__________

---

## ⭐ Lab 6 — The Voting DApp: Whole Class, One Contract, Full Stack (8 min)

The presenter deployed the **Voting** contract (from [`dapp/`](../dapp) in this repo) on Sepolia and runs its **Express backend**
(PostgreSQL + Alchemy webhook) and **React frontend** on the projector. Address on the board: `0x______________________________`
```bash
# Git Bash / macOS / Linux - first just look, then vote (OPTION = 0..3)
VOTING_ADDRESS=0x... npx hardhat run scripts/vote.ts --network sepolia
VOTING_ADDRESS=0x... OPTION=0 npx hardhat run scripts/vote.ts --network sepolia
# PowerShell
$env:VOTING_ADDRESS="0x..."; $env:OPTION="0"; npx hardhat run scripts/vote.ts --network sepolia
```
Watch the projector: Alchemy sends your vote to the backend → it's stored in PostgreSQL as *pending* → the React app updates →
a few blocks later it becomes *final*. Run the script again with another option → `✘ Vote rejected: AlreadyVoted`.

**Think:** the *counting* can't be rigged. Can the *election*? (Hint: how many wallets can one person create?)

---

## 🏗️ Take-home ASSIGNMENT — build a full-stack DApp
**Hardhat (contracts) + Node/Express (backend) + React (frontend), all TypeScript, on Sepolia.**
Same architecture as the Voting DApp: **React → Express API → PostgreSQL**, **Alchemy webhook + reconciler** listening to your contract.
Brief, project ideas and rubric: **[ASSIGNMENT.md](../ASSIGNMENT.md)** · Starter: **[`dapp/`](../dapp)** · How-to: **[04-build-your-dapp.md](04-build-your-dapp.md)** · **[03-alchemy.md](03-alchemy.md)**.

## 🏠 Extra practice (optional)
1. Add a voting **deadline** to `ClassRoom` (`block.timestamp`) + a test using `vm.warp`; deploy v2 to Sepolia.
2. Verify your token's source on Etherscan: `npx hardhat ignition verify <deployment-id>` (needs a free Etherscan API key in config).
3. Write `transfer` / `balanceOf` for a token **without** OpenZeppelin, and test it.
4. Play **Ethernaut** levels 1–5 (ethernaut.openzeppelin.com) — runs on Sepolia.
5. Try **Foundry** (getfoundry.sh): your `.t.sol` tests use the same syntax — `forge test` runs them.

## 📚 Learn more
Hardhat docs — hardhat.org/docs · Solidity docs — docs.soliditylang.org · Solidity by Example · Cyfrin Updraft (free) ·
OpenZeppelin Wizard — wizard.openzeppelin.com · Damn Vulnerable DeFi · *Mastering Ethereum* (free book)
