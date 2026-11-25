# 🧩 Build Your Own DApp from the Starter — Step by Step

This guide turns the **Voting DApp** in [`dapp/`](../dapp) into **your** project. Each step changes one layer, and you test it
before moving on. The running example is idea **#2 Tip Jar** from [ASSIGNMENT.md](../ASSIGNMENT.md): creators register, fans tip them
in ETH, creators withdraw. Swap in your own names as you go.

> ✅ **Before you start**
> 1. Run the unchanged Voting DApp once ([dapp/README.md](../dapp/README.md)), locally (§3A) or on Sepolia (§3B). If the starter doesn't
>    run on your laptop, your version won't either.
> 2. Read **[05-how-it-works.md](05-how-it-works.md)** (follow one vote through the code, 10 minutes). Unknown word? → [GLOSSARY.md](GLOSSARY.md).
>
> All commands below run from the **`dapp/` folder** unless a step says otherwise. Windows: use **PowerShell**; each command is a single line.

---

## 0. The map: what to keep, what to change

| Keep as-is (infrastructure, already works) | Change (your app) |
|---|---|
| `backend/src/config/` · `lib/logger.ts` · `lib/db.ts` · `middleware/` · `server.ts` | `contracts/contracts/Voting.sol` → **your contract** (+ its tests) |
| `backend/src/webhooks/alchemy.ts` (signature check, duplicates) | `contracts/ignition/modules/` · `contracts/scripts/dapp.config.ts` · `contracts/package.json` scripts |
| `backend/src/indexer/reconciler.ts` (history, confirmations, reorgs) | `backend/prisma/schema.prisma` → **your tables** |
| `backend/test/helpers.ts`, `signature.test.ts`, `global-setup.ts` | `backend/src/indexer/decode.ts` + `ingest.ts` → **your events** |
| Prisma models `ChainEvent`, `WebhookDelivery`, `SyncState` | `backend/src/api/*` + `app.ts` → **your endpoints** |
| `frontend/src/wallet/` · `hooks/useTransaction.ts` · `components/TxStatus.tsx` · `components/ConnectButton.tsx` | `frontend/src/lib/*`, `hooks/queries.ts`, `pages/*`, `main.tsx`, `components/Layout.tsx` → **your UI** |

The data flow for every feature you add:
**contract function → emits event → backend decodes event → stores rows → API returns rows → React shows them; a button calls the contract.**

### The complete list of files that mention voting
Use it as your to-do list. To find any leftovers at the end:
```bash
# bash / Git Bash
grep -rniE "election|voting|vote" contracts/contracts contracts/scripts contracts/test backend/src/api backend/src/indexer backend/prisma/schema.prisma frontend/src frontend/test --include=*.ts --include=*.tsx --include=*.sol --include=*.prisma -l | grep -v generated
```
```powershell
# PowerShell
Get-ChildItem contracts\contracts,contracts\scripts,contracts\test,backend\src\api,backend\src\indexer,frontend\src,frontend\test -Recurse -Include *.ts,*.tsx,*.sol | Where-Object FullName -notmatch "generated" | Select-String -Pattern "election|voting|vote" -List | Select-Object Path
```

| Layer | File | What to do |
|---|---|---|
| contracts | `contracts/Voting.sol`, `test/Voting.t.sol`, `test/Voting.ts` | Replace with your contract + tests (step 2) |
| contracts | `ignition/modules/Voting.ts` | Replace with your module (step 2.3) |
| contracts | `scripts/dapp.config.ts` | Your contract + module names (step 2.4) |
| contracts | `package.json` → `deploy:*` and `election:*` scripts | Point `deploy:*` at your module; delete `election:*` (step 2.4) |
| contracts | `scripts/create-election.ts` | Delete (or turn it into a seed script for your app) |
| backend | `prisma/schema.prisma` | Your models (step 3) |
| backend | `src/indexer/decode.ts` (`AppEvent`, `switch`) · `ingest.ts` (`project()`) | Your events (steps 4–5) |
| backend | `src/api/elections.ts`, `dto.ts`, `accounts.ts` | Replace with your routes (step 6) |
| backend | `src/api/system.ts` (`/api/stats`) · `src/app.ts` (route mounting) | Count/mount your things (step 6) |
| backend | `src/lib/chain.ts` (`isElectionAdmin`) + `test/helpers.ts` (`FakeChain.isElectionAdmin`) | Delete both, or turn into your own role check (step 6) |
| backend | `test/indexing.test.ts` | Rewrite for your events (step 6) |
| frontend | `lib/types.ts`, `lib/api.ts`, `hooks/queries.ts` | Your API types/functions/queries (step 7) |
| frontend | `lib/contract.ts` → `FRIENDLY` | Messages for your custom errors (step 7) |
| frontend | `pages/*` · `main.tsx` (routes) · `components/Layout.tsx` (brand, nav, footer) · `components/StatusBadge.tsx` · `index.html` (title) | Your pages (step 7) |
| frontend | `test/contract.test.ts` | Use one of your errors (step 7) |

---

## 1. Design on paper first (30 minutes that save days)

Write down:
1. **State:** what does the contract store? *(each creator's name and current balance)*
2. **Functions** and **who** may call them: `register(name)` *anyone*, `tip(creator, message)` *anyone, payable*, `withdraw()` *registered creators*.
3. **Events**, one per state change, carrying everything the backend needs:
   `CreatorRegistered(creator, name)`, `Tipped(creator, fan, amount, message)`, `Withdrawn(creator, amount)`.
4. **Errors:** `AlreadyRegistered`, `NotRegistered`, `ZeroTip`, `NothingToWithdraw`.
5. **Pages:** creators list · creator page (tip form + tips) · my dashboard (balance + withdraw).
6. **API:** `GET /api/creators` · `GET /api/creators/:address` (incl. balance) · `GET /api/creators/:address/tips` · `GET /api/stats`.

> 💡 The backend knows **only what events tell it**. The dashboard needs the balance, so the backend must see both **tips** and
> **withdrawals**. That's why `Withdrawn` exists and why we store it (step 3).

---

## 2. Contract (`contracts/`)

**2.1 Write it:** `contracts/contracts/TipJar.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TipJar {
    struct Creator { string name; uint256 balance; bool registered; }
    mapping(address => Creator) public creators;

    event CreatorRegistered(address indexed creator, string name);
    event Tipped(address indexed creator, address indexed fan, uint256 amount, string message);
    event Withdrawn(address indexed creator, uint256 amount);

    error AlreadyRegistered();
    error NotRegistered();
    error ZeroTip();
    error NothingToWithdraw();

    function register(string calldata name) external {
        if (creators[msg.sender].registered) revert AlreadyRegistered();
        creators[msg.sender] = Creator(name, 0, true);
        emit CreatorRegistered(msg.sender, name);
    }

    function tip(address creator, string calldata message) external payable {
        if (!creators[creator].registered) revert NotRegistered();
        if (msg.value == 0) revert ZeroTip();
        creators[creator].balance += msg.value;
        emit Tipped(creator, msg.sender, msg.value, message);
    }

    function withdraw() external {
        uint256 amount = creators[msg.sender].balance;
        if (amount == 0) revert NothingToWithdraw();
        creators[msg.sender].balance = 0;                  // effects BEFORE the interaction (re-entrancy safe)
        emit Withdrawn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }
}
```
Delete `contracts/Voting.sol`, `test/Voting.t.sol`, `test/Voting.ts`, `ignition/modules/Voting.ts` and `scripts/create-election.ts`.

**2.2 Test it:** write `contracts/test/TipJar.ts` (copy the style of the old `Voting.ts`). Cover every function **and** every error:
```ts
import { expect } from "chai";
import { network } from "hardhat";
const { ethers, networkHelpers } = await network.create();

describe("TipJar", function () {
  async function deploy() {
    const [creator, fan] = await ethers.getSigners();
    const jar = await ethers.deployContract("TipJar");
    await jar.connect(creator).register("Ali");
    return { jar, creator, fan };
  }
  it("tips and withdraws", async function () {
    const { jar, creator, fan } = await networkHelpers.loadFixture(deploy);
    await expect(jar.connect(fan).tip(creator.address, "gm", { value: 10n }))
      .to.emit(jar, "Tipped").withArgs(creator.address, fan.address, 10n, "gm");
    await expect(jar.connect(creator).withdraw()).to.changeEtherBalance(ethers, creator, 10n);
  });
  it("rejects a tip of zero", async function () {
    const { jar, creator, fan } = await networkHelpers.loadFixture(deploy);
    await expect(jar.connect(fan).tip(creator.address, "x")).to.be.revertedWithCustomError(jar, "ZeroTip");
  });
  // ...AlreadyRegistered, NotRegistered, NothingToWithdraw - aim for 8+ tests
});
```
```bash
npm run test -w contracts          # all contract tests
npm run coverage -w contracts      # which lines did you miss?
```

**2.3 Deployment module:** `contracts/ignition/modules/TipJar.ts`
```ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("TipJarModule", (m) => ({ tipJar: m.contract("TipJar") }));
```

**2.4 Rename in one place.** In `contracts/scripts/dapp.config.ts` set `CONTRACT_NAME = "TipJar"` and `IGNITION_MODULE = "TipJarModule"`.
In `contracts/package.json`, replace `ignition/modules/Voting.ts` with `ignition/modules/TipJar.ts` in the three `deploy:*` scripts.
Delete the two `election:*` scripts (also in the root `package.json`).

**2.5 Develop locally first (fast, free), deploy to Sepolia at the end.**
```bash
npm run chain              # terminal 1: a local blockchain at http://127.0.0.1:8545 (leave it running)
npm run deploy:local       # terminal 2: deploy your contract to it
npm run export:local       # ABI + address -> backend & frontend
```
Backend `.env` for local mode: `RPC_URL="http://127.0.0.1:8545"`, `CONFIRMATIONS=0`, `LOG_CHUNK_BLOCKS=1000` (no webhook needed).
MetaMask: the app adds the "Hardhat Local" network for you. Import a test account: copy a private key printed by `npm run chain`
→ MetaMask → *Add account → Import account*. Those keys are public test keys, so use them only locally.
*Restarted the chain?* Everything on it is gone. Run `deploy:local` and `export:local` again, run `npm run db:reset`, and in MetaMask use
*Settings → Advanced → Clear activity tab data*.

**When it all works → Sepolia:**
```bash
npm run deploy:sepolia     # first time   (keystore: SEPOLIA_RPC_URL + SEPOLIA_PRIVATE_KEY)
npm run export             # ABI + address -> backend & frontend
npm run webhook:query      # GraphQL query for YOUR events (generated automatically from your ABI)
```
**Changed the contract after deploying?** Ignition refuses to deploy a *changed* module over the old one. Use
`npm run deploy:sepolia:reset` (new contract, new address), then `npm run export`, `npm run db:reset`, and create a **new** Alchemy
webhook with the new query, putting its new signing key in `backend/.env` ([03-alchemy.md](03-alchemy.md) §5.5).

---

## 3. Database (`backend/prisma/schema.prisma`)

Keep `ChainEvent`, `WebhookDelivery` and `SyncState`. Replace `Election`, `Vote` and `Voter` with your tables. Each row points to the event that
created it (`onDelete: Cascade`), which is what makes reorg handling automatic ([GLOSSARY](GLOSSARY.md#reorg)):
```prisma
model Creator {
  address     String       @id            // lower-case address
  name        String
  eventId     String       @unique
  event       ChainEvent   @relation("CreatorRegisteredEvent", fields: [eventId], references: [id], onDelete: Cascade)
  tips        Tip[]
  withdrawals Withdrawal[]
}

model Tip {
  id         String     @id                // = ChainEvent.id
  event      ChainEvent @relation(fields: [id], references: [id], onDelete: Cascade)
  creator    String
  creatorRef Creator    @relation(fields: [creator], references: [address], onDelete: Cascade)
  fan        String
  amountWei  String                        // uint256 as text - too big for Int
  message    String
  tippedAt   DateTime
  @@index([creator])
  @@index([fan])
}

model Withdrawal {
  id          String     @id               // = ChainEvent.id
  event       ChainEvent @relation("WithdrawnEvent", fields: [id], references: [id], onDelete: Cascade)
  creator     String
  creatorRef  Creator    @relation(fields: [creator], references: [address], onDelete: Cascade)
  amountWei   String
  withdrawnAt DateTime
  @@index([creator])
}
```
In `model ChainEvent`, replace the old back-relation lines (`election`, `cancelledElection`, `vote`, `voters`) with:
```prisma
  creator    Creator?    @relation("CreatorRegisteredEvent")
  tip        Tip?
  withdrawal Withdrawal? @relation("WithdrawnEvent")
```
Then delete the old migrations folder `backend/prisma/migrations/` and create yours (Postgres must be running):
```bash
npm run db:migrate -- --name tipjar
```

---

## 4. Decode your events (`backend/src/indexer/decode.ts`)

Replace the members of the `AppEvent` type and the cases of the `switch` (keep everything else):
```ts
export type AppEvent =
  | { name: "CreatorRegistered"; args: { creator: string; name: string } }
  | { name: "Tipped"; args: { creator: string; fan: string; amount: string; message: string } }
  | { name: "Withdrawn"; args: { creator: string; amount: string } };
```
```ts
  switch (parsed.name) {
    case "CreatorRegistered":
      return { ...base, name: "CreatorRegistered", args: { creator: String(a.creator).toLowerCase(), name: String(a.name) } };
    case "Tipped":
      return { ...base, name: "Tipped", args: { creator: String(a.creator).toLowerCase(), fan: String(a.fan).toLowerCase(), amount: a.amount.toString(), message: String(a.message) } };
    case "Withdrawn":
      return { ...base, name: "Withdrawn", args: { creator: String(a.creator).toLowerCase(), amount: a.amount.toString() } };
    default:
      return null;
  }
```
Rules: **addresses in lower case** · **uint256 → string** (never `Number()` for wei) · small ids/counters may use `Number()`.
`contractInterface` (in `lib/chain.ts`) is built from your exported ABI, so it already understands your events.

---

## 5. Store them (`backend/src/indexer/ingest.ts` → `project()`)

`ingest()` already stores the raw `ChainEvent` exactly once. You only write the **projection**: how each event changes your tables.
Replace the `case`s inside `project()`. Use **upserts**, so processing an event twice is harmless:
```ts
    case "CreatorRegistered": {
      const data = { name: ev.args.name, eventId: ev.id };
      await tx.creator.upsert({ where: { address: ev.args.creator }, create: { address: ev.args.creator, ...data }, update: data });
      return "applied";
    }
    case "Tipped": {
      if (!(await tx.creator.findUnique({ where: { address: ev.args.creator } }))) return defer(ev); // arrived early -> reconciler retries
      await tx.tip.upsert({
        where: { id: ev.id },
        create: { id: ev.id, creator: ev.args.creator, fan: ev.args.fan, amountWei: ev.args.amount, message: ev.args.message, tippedAt: new Date(ev.blockTimestamp * 1000) },
        update: {},
      });
      return "applied";
    }
    case "Withdrawn": {
      if (!(await tx.creator.findUnique({ where: { address: ev.args.creator } }))) return defer(ev);
      await tx.withdrawal.upsert({
        where: { id: ev.id },
        create: { id: ev.id, creator: ev.args.creator, amountWei: ev.args.amount, withdrawnAt: new Date(ev.blockTimestamp * 1000) },
        update: {},
      });
      return "applied";
    }
```

---

## 6. API routes (`backend/src/api/`)

Create `backend/src/api/creators.ts` (modelled on `elections.ts`). Validate every input with zod and return plain JSON:
```ts
import { Router } from "express";
import { isAddress } from "ethers";
import { z } from "zod";
import type { Db } from "../lib/db.ts";

const address = z.string().refine((a) => isAddress(a), "invalid address").transform((a) => a.toLowerCase());
const sum = (rows: { amountWei: string }[]) => rows.reduce((s, r) => s + BigInt(r.amountWei), 0n);

export function creatorsRouter(db: Db) {
  const r = Router();

  // GET /api/creators
  r.get("/", async (_req, res) => {
    const creators = await db.creator.findMany({ include: { _count: { select: { tips: true } } }, orderBy: { name: "asc" } });
    res.json(creators.map((c) => ({ address: c.address, name: c.name, tipCount: c._count.tips })));
  });

  // GET /api/creators/:address  -> details + balance = all tips - all withdrawals
  r.get("/:address", async (req, res) => {
    const addr = address.parse(req.params.address);       // invalid -> 400 (handled by the error middleware)
    const c = await db.creator.findUnique({ where: { address: addr }, include: { tips: true, withdrawals: true } });
    if (!c) {
      res.status(404).json({ error: "creator not found" });
      return;
    }
    const received = sum(c.tips);
    const withdrawn = sum(c.withdrawals);
    res.json({ address: c.address, name: c.name, receivedWei: received.toString(), withdrawnWei: withdrawn.toString(), balanceWei: (received - withdrawn).toString() });
  });

  // GET /api/creators/:address/tips
  r.get("/:address/tips", async (req, res) => {
    const addr = address.parse(req.params.address);
    const tips = await db.tip.findMany({ where: { creator: addr }, orderBy: { tippedAt: "desc" }, include: { event: { select: { confirmed: true } } } });
    res.json(tips.map((t) => ({ fan: t.fan, amountWei: t.amountWei, message: t.message, tippedAt: t.tippedAt, confirmed: t.event.confirmed })));
  });

  return r;
}
```
Then:
- **`app.ts`:** replace the `electionsRouter`/`accountsRouter` imports and `app.use(...)` lines with `app.use("/api/creators", creatorsRouter(db));`.
- **Delete** `api/elections.ts`, `api/dto.ts`, `api/accounts.ts`.
- **`lib/chain.ts`:** delete `isElectionAdmin` from the `ChainReader` interface and from `RpcChainReader`. In `test/helpers.ts`, delete `admins` and `isElectionAdmin` from `FakeChain`.
  *(Need a role check? Replace it with your own, e.g. `isOwner(address)`.)*
- **`api/system.ts` → `/api/stats`:** count your tables (`db.creator.count()`, `db.tip.count()`, …).
- **`test/indexing.test.ts`:** rewrite for your events. The helpers work for any event:
  ```ts
  const registered = encodeLog("CreatorRegistered", [CREATOR, "Ali"], 101);
  const tip = encodeLog("Tipped", [CREATOR, FAN, 10n ** 16n, "gm"], 102);
  await deliver(app, "whevt_1", 101, [registered]);          // a signed Alchemy-style webhook
  ```
  Keep the "rejects forged deliveries", "idempotent" and "reorg" tests: they protect the infrastructure.

```bash
npm run test -w backend            # needs Postgres (npm run db:up)
npm run backend                    # then open http://localhost:4000/api/creators in your browser
```

---

## 7. Frontend (`frontend/src/`)

| File | Change |
|---|---|
| `lib/types.ts` | Types of **your** API responses (`Creator`, `CreatorDetail`, `TipItem`) |
| `lib/api.ts` | One function per endpoint: `creators: (signal?: AbortSignal) => get<Creator[]>("/api/creators", signal)` |
| `hooks/queries.ts` | `useCreators()`, `useCreator(address)`, `useTips(address)` with `useQuery` (copy the existing ones) |
| `lib/contract.ts` → `FRIENDLY` | `NothingToWithdraw: "You have no tips to withdraw yet."`, `ZeroTip: "Enter an amount greater than 0."`, … |
| `pages/*` + `main.tsx` | Your pages and routes; delete the election pages |
| `components/Layout.tsx` | Brand name, nav links, footer stats (it reads `useStats`, so update it to your `/api/stats` fields) |
| `components/StatusBadge.tsx` · `index.html` | Delete the badge (or reuse it) · change the page `<title>` |
| `test/contract.test.ts` | Use one of your errors: `contractInterface.encodeErrorResult("NothingToWithdraw", [])` → your FRIENDLY text |

A write action uses the ready-made `useTransaction` hook. This is the full pattern for sending a tip, from a page component:
```tsx
import { parseEther } from "ethers";
import { useState } from "react";
import { TxStatus } from "../components/TxStatus";
import { useTransaction } from "../hooks/useTransaction";
import { appContract } from "../lib/contract";
import { useWallet } from "../wallet/WalletProvider";

export function TipForm({ creator }: { creator: string }) {
  const { account, chainOk, getSigner } = useWallet();
  const tx = useTransaction();
  const [amount, setAmount] = useState("0.001");
  const [message, setMessage] = useState("");

  const sendTip = () =>
    tx.run(async () => appContract(await getSigner()).getFunction("tip")(creator, message, { value: parseEther(amount) }));

  return (
    <div className="card">
      <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="ETH" />
      <button disabled={!account || !chainOk} onClick={() => void sendTip()}>Send tip</button>
      <TxStatus state={tx.state} />
    </div>
  );
}
```
After a confirmed transaction, `useTransaction` refreshes all queries. Within seconds the backend has the event and your list updates.
Show `confirmed: false` items as **"pending"**, like the Voting DApp does. **Display wei:** `formatEther(BigInt(t.amountWei))` → `"0.01"`.

---

## 8. Final checklist
- [ ] `npm run test` (contracts + backend + frontend) ✅ · `npm run typecheck` ✅ · `npm run build -w frontend` ✅
- [ ] The leftover search from §0 finds nothing (except words you chose on purpose)
- [ ] Deployed to Sepolia → `npm run export` → `npm run webhook:query` → Alchemy webhook created with **this** query, signing key in `backend/.env`
- [ ] Your own `README.md`: what the app does, how to run it, contract address + Etherscan link, screenshots, demo video
- [ ] `git status` shows **no `.env`** files staged

## 9. Putting it in your own GitHub repository
1. Create an empty repository on GitHub (e.g. `tipjar-dapp`).
2. Copy the **contents** of `dapp/` (not the folder itself) into it. Leave out `node_modules/` and `.env` files.
   The included `.gitignore` and `.github/workflows/ci.yml` come along, so your CI works at the root of your repo.
3. `npm install` → `git add . && git commit -m "Initial commit"` → push. GitHub → **Actions** shows your CI run.

## 10. Common mistakes
| Mistake | Symptom | Fix |
|---|---|---|
| Forgot `npm run export` after deploying | Backend/frontend talk to the **old** contract | Run it after **every** deploy, then restart backend & frontend |
| Redeployed a changed contract with `deploy:sepolia` | Ignition error about the module having changed / reconciliation | `npm run deploy:sepolia:reset`, then export + `db:reset` + new webhook |
| Webhook still has the old query/address | Only the reconciler (slow) updates data | New webhook with `npm run webhook:query`, new signing key in `.env` |
| Stored wei as `Number` | Wrong/rounded amounts | Store as `String`, convert with `BigInt` |
| Event missing a field the UI needs | Can't show it without reading the chain | Add it to the event and redeploy (`deploy:sepolia:reset`) |
| Changed `schema.prisma` but didn't migrate | `P2021: table does not exist` | `npm run db:migrate -- --name <change>` |
| New contract, old database rows | Old data / old sync checkpoint remain | `npm run db:reset` (deletes all data, re-applies migrations), then restart the backend |
| `keystore set` says the key already exists | You set it in the session, and the keystore is shared by all projects | Nothing to do, or add `--force` to replace it |
