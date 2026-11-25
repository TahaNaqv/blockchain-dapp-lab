# 🧩 Build Your Own DApp from the Starter — Step by Step

This guide turns the **Voting DApp** in [`dapp/`](../dapp) into **your** project. Each step changes one layer, and you test it
before moving on. The running example is idea **#2 Tip Jar** from [ASSIGNMENT.md](../ASSIGNMENT.md): creators register, fans tip them
in ETH, creators withdraw. Swap in your own names as you go.

> ✅ **Before you start:** run the unchanged Voting DApp end to end once ([dapp/README.md](../dapp/README.md) §3). If the starter doesn't
> work on your laptop, your version won't either. Fix setup first.

---

## 0. The map: what to keep, what to change

| Keep as-is (infrastructure) | Change (your app) |
|---|---|
| `backend/src/config/env.ts` · `lib/logger.ts` · `lib/db.ts` · `middleware/` · `app.ts` · `server.ts` (small edits) | `contracts/contracts/Voting.sol` → **your contract** + its tests |
| `backend/src/webhooks/alchemy.ts` (signature check, dedupe) | `contracts/ignition/modules/*` · `contracts/scripts/dapp.config.ts` |
| `backend/src/indexer/reconciler.ts` (backfill, confirmations, reorgs) | `backend/prisma/schema.prisma` → **your tables** |
| Prisma models `ChainEvent`, `WebhookDelivery`, `SyncState` | `backend/src/indexer/decode.ts` + `ingest.ts` → **your events** |
| `frontend/src/wallet/` · `hooks/useTransaction.ts` · `components/TxStatus.tsx` | `backend/src/api/*` → **your endpoints** |
| Docker Compose, `.env.example` files, CI | `frontend/src/lib/{types,api,contract}.ts`, `hooks/queries.ts`, `pages/*` → **your UI** |

Data flow for every feature you add:
**contract function → emits event → backend decodes event → stores rows → API returns rows → React shows them; the user's button calls the contract.**

---

## 1. Design on paper first (30 minutes that save days)

Write down:
1. **State**: what does the contract store? *(creator name & balance)*
2. **Functions** and **who** may call them: `register(name)` *anyone*, `tip(creator, message)` *anyone, payable*, `withdraw()` *registered creators*.
3. **Events**, one per state change, carrying everything the backend needs:
   `CreatorRegistered(creator, name)`, `Tipped(creator, fan, amount, message)`, `Withdrawn(creator, amount)`.
4. **Errors**: `AlreadyRegistered`, `NotRegistered`, `ZeroTip`, `NothingToWithdraw`.
5. **Pages**: creators list, creator detail (tip form and tips list), "my dashboard" (withdraw).
6. **API**: `GET /api/creators`, `GET /api/creators/:address`, `GET /api/creators/:address/tips`, `GET /api/stats`.

> 💡 The backend knows **only what events tell it**. If the UI needs a value (e.g. the tip message), put it in the event.

---

## 2. Contract (`contracts/`)

**2.1 Write it:** `contracts/contracts/TipJar.sol` (delete `Voting.sol` and its tests when yours work):
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

**2.2 Test it:** copy the style of `test/Voting.t.sol` (Solidity) and/or `test/Voting.ts` (TypeScript). Cover every function **and** every revert:
```bash
npx hardhat test            # aim for ≥ 8 tests
npx hardhat test --coverage # see what you missed
```

**2.3 Deployment module:** `ignition/modules/TipJar.ts`
```ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("TipJarModule", (m) => ({ tipJar: m.contract("TipJar") }));
```

**2.4 Rename in ONE place:** `contracts/scripts/dapp.config.ts` → `CONTRACT_NAME = "TipJar"`, `IGNITION_MODULE = "TipJarModule"`.
Update the `deploy:sepolia` script in `contracts/package.json` to `ignition/modules/TipJar.ts`.

**2.5 Deploy & export:**
```bash
npm run deploy:sepolia        # from dapp/  (keystore: SEPOLIA_RPC_URL + SEPOLIA_PRIVATE_KEY)
npm run export                # writes ABI + address into backend/src/generated & frontend/src/generated
npm run webhook:query         # prints the Alchemy GraphQL query for YOUR events (automatically)
```

---

## 3. Database (`backend/prisma/schema.prisma`)

Keep `ChainEvent`, `WebhookDelivery`, `SyncState`. Replace `Election`, `Vote` and `Voter` with your tables. Each row points at the event
that created it (`onDelete: Cascade`), which is what makes reorg handling automatic:
```prisma
model Creator {
  address   String     @id            // lower-case
  name      String
  eventId   String     @unique
  event     ChainEvent @relation("CreatorRegisteredEvent", fields: [eventId], references: [id], onDelete: Cascade)
  tips      Tip[]
}

model Tip {
  id        String     @id            // = ChainEvent.id
  event     ChainEvent @relation(fields: [id], references: [id], onDelete: Cascade)
  creator   String
  creatorRef Creator   @relation(fields: [creator], references: [address], onDelete: Cascade)
  fan       String
  amountWei String                     // uint256 as text (too big for Int)
  message   String
  tippedAt  DateTime
  @@index([creator])
  @@index([fan])
}
```
In `model ChainEvent`, replace the old back-relations (`election`, `cancelledElection`, `vote`, `voters`) with yours:
```prisma
  creator Creator? @relation("CreatorRegisteredEvent")
  tip     Tip?
```
Then (with Postgres running):
```bash
cd backend && npx prisma migrate dev --name tipjar     # creates the migration + regenerates the client
```
*(Fresh start? Delete `backend/prisma/migrations/` first, so your history doesn't contain the voting tables.)*

---

## 4. Decode your events (`backend/src/indexer/decode.ts`)

Describe each event's arguments, then convert each from the raw ethers value:
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
Rules: **addresses lower-case** · **uint256 → string** (never `Number()` for wei!) · small ids/counters may use `Number()`.
(`votingInterface` in `lib/chain.ts` is built from the exported ABI, so it already understands your contract. Rename it if you like.)

---

## 5. Store them (`backend/src/indexer/ingest.ts` → `project()`)

`ingest()` already stores the raw `ChainEvent` idempotently. You only write the **projection**, i.e. how each event changes your tables.
Use **upserts** so processing the same event twice is harmless:
```ts
case "CreatorRegistered":
  await tx.creator.upsert({
    where: { address: ev.args.creator },
    create: { address: ev.args.creator, name: ev.args.name, eventId: ev.id },
    update: { name: ev.args.name, eventId: ev.id },
  });
  return "applied";
case "Tipped":
  if (!(await tx.creator.findUnique({ where: { address: ev.args.creator } }))) return defer(ev); // out of order -> reconciler fixes
  await tx.tip.upsert({
    where: { id: ev.id },
    create: { id: ev.id, creator: ev.args.creator, fan: ev.args.fan, amountWei: ev.args.amount, message: ev.args.message, tippedAt: new Date(ev.blockTimestamp * 1000) },
    update: {},
  });
  return "applied";
case "Withdrawn":
  return "applied"; // nothing to store - or keep a Withdrawal table if your UI shows history
```

---

## 6. API routes (`backend/src/api/`)

Copy `elections.ts` → `creators.ts` and adapt. Validate every input with zod and return plain JSON:
```ts
r.get("/", async (_req, res) => {
  const creators = await db.creator.findMany({ include: { _count: { select: { tips: true } } }, orderBy: { name: "asc" } });
  res.json(creators.map((c) => ({ address: c.address, name: c.name, tipCount: c._count.tips })));
});

r.get("/:address/tips", async (req, res) => {
  const addr = address.parse(req.params.address);          // zod: 400 on bad input
  const tips = await db.tip.findMany({ where: { creator: addr }, orderBy: { tippedAt: "desc" }, include: { event: { select: { confirmed: true } } } });
  res.json(tips.map((t) => ({ fan: t.fan, amountWei: t.amountWei, message: t.message, tippedAt: t.tippedAt, confirmed: t.event.confirmed })));
});
```
Mount it in `app.ts`: `app.use("/api/creators", creatorsRouter(db));` and remove the election routes.
`/api/stats` in `api/system.ts` → count your own tables.
`api/accounts.ts` + `lib/chain.ts#isElectionAdmin` → delete, or change it to your own role check (e.g. "is this address a registered creator?").

**Test with your browser:** `http://localhost:4000/api/creators`. Update `backend/test/indexing.test.ts`: the helpers `encodeLog()` and
`webhookDelivery()` work for any event, e.g. `encodeLog("Tipped", [CREATOR, FAN, 10n**16n, "gm"], 101)`.

---

## 7. Frontend (`frontend/src/`)

| File | Change |
|---|---|
| `lib/types.ts` | Types of **your** API responses (`Creator`, `TipItem`, …) |
| `lib/api.ts` | One function per endpoint: `creators: () => get<Creator[]>("/api/creators")` |
| `hooks/queries.ts` | `useCreators()`, `useTips(address)` with `useQuery` |
| `lib/contract.ts` | `FRIENDLY` messages for your custom errors (`NothingToWithdraw: "You have no tips to withdraw yet."`) |
| `pages/*` + `main.tsx` routes | Your pages; delete the election pages |

A write action uses the ready-made `useTransaction` hook. Here's a tip with ETH attached:
```tsx
import { parseEther } from "ethers";
const tx = useTransaction();
const sendTip = () =>
  tx.run(async () => votingContract(await getSigner()).getFunction("tip")(creatorAddress, message, { value: parseEther(amountEth) }));
// ...
<button onClick={() => void sendTip()}>Send tip</button>
<TxStatus state={tx.state} />
```
*(`votingContract()` just builds a `Contract` from the exported ABI and address, so it's already your contract. Rename it to `appContract()` if you like.)*
After a confirmed transaction, `useTransaction` refreshes all queries. Within seconds the webhook has stored the event and your list updates.
Show `confirmed: false` items as **"pending"**, like the Voting DApp does.

**Display wei correctly:** `formatEther(BigInt(t.amountWei))` → `"0.01"`.

---

## 8. Final checklist
- [ ] `npm run test -w contracts` ✅ · `npm run test -w backend` ✅ · `npm run typecheck` ✅ · `npm run build -w frontend` ✅
- [ ] Deployed → `npm run export` → `npm run webhook:query` → Alchemy webhook updated with the **new** query (and the new signing key in `.env`)
- [ ] Old Voting code removed (contract, tests, pages, routes); no `Election` left in your UI
- [ ] README rewritten for **your** app; screenshots; contract address; demo video
- [ ] `git status` shows **no `.env`** files staged

## 9. Common mistakes
| Mistake | Symptom | Fix |
|---|---|---|
| Forgot `npm run export` after redeploying | Backend/frontend talk to the **old** contract | Run it after **every** deploy, then restart both apps |
| Webhook still uses the old query/address | Nothing arrives via the webhook; only the reconciler (slow) updates data | Re-run `npm run webhook:query`, edit the webhook in Alchemy |
| Stored wei as `Number` | Wrong/rounded amounts | Store as `String` (or `Decimal`), convert with `BigInt` |
| Event missing a field the UI needs | Can't show it without reading the chain | Add it to the event, redeploy (new contract = new address) |
| Changed `schema.prisma` but didn't migrate | `P2021 table does not exist` | `npx prisma migrate dev --name <change>` |
| New contract, old database rows | Old data (and an old sync checkpoint) remain | Start clean: `cd backend && npx prisma migrate reset` (deletes all data, re-applies migrations), then restart the backend |
