# 🗳️ Voting DApp — Full-Stack Starter (Hardhat · Express · PostgreSQL · React, all TypeScript)

A complete, working decentralized app and the **starting point for your assignment**:
on-chain elections, a backend that **listens** to the contract's events and stores them in **PostgreSQL**, and a **React** frontend that
reads everything from the backend while users sign votes with **MetaMask**.

> 🙂 **You don't need to understand every line.** The backend contains some real-world machinery (webhook security, a reconciler,
> reorg handling). It already works, so treat it as a black box at first. Start with **[docs/05-how-it-works.md](../docs/05-how-it-works.md)**
> (follow one vote through the code), then **[docs/04-build-your-dapp.md](../docs/04-build-your-dapp.md)** to make it your own.
> Unknown word → **[docs/GLOSSARY.md](../docs/GLOSSARY.md)**.

```mermaid
flowchart LR
    U([User]) --> FE["React frontend<br/>(Vite, TanStack Query)"]
    FE -- "HTTP: all reads" --> BE["Express backend<br/>(API + indexer)"]
    BE <--> DB[("PostgreSQL<br/>(Prisma)")]
    FE -- "MetaMask signs writes" --> SC["Voting contract<br/>(Sepolia)"]
    SC -- "events" --> AL["Alchemy webhook"]
    AL -- "POST /webhooks/alchemy" --> BE
    BE -- "eth_getLogs (reconciler)" --> SC
```
**Reads:** React → Express API → PostgreSQL. **Writes:** React → MetaMask signs → contract → event → backend → PostgreSQL.
The user's wallet signs votes, never the backend. Otherwise the backend could vote for anyone and the blockchain would prove nothing.

---

## Contents
1. [What's inside](#1-whats-inside) · 2. [Install](#2-install) · 3A. [Run locally (fast, free)](#3a-run-locally-fast-free--use-this-while-developing) ·
3B. [Run on Sepolia (the real thing)](#3b-run-on-sepolia-the-real-thing) · 4. [API](#4-api-reference) · 5. [How it stays correct](#5-how-it-stays-correct-optional-reading) ·
6. [Testing & CI](#6-testing--ci) · 7. [Deploying online](#7-deploying-online-bonus) · 8. [Troubleshooting](#8-troubleshooting)

## 1. What's inside

| Folder | Stack | What it does |
|---|---|---|
| `contracts/` | Hardhat 3 · Solidity · OpenZeppelin | `Voting.sol` (roles, open/allowlist elections, pause, custom errors, events) · 18 tests · deployment · helper scripts |
| `backend/` | Express 5 · Prisma 7 · PostgreSQL · ethers | Webhook listener · indexer (decode → store) · reconciler · REST API · 12 tests |
| `frontend/` | React 19 · Vite · React Router · TanStack Query · ethers | Elections list · vote page with live results · admin "New election" · "My votes" |
| `docker-compose.yml` | PostgreSQL 17 | `npm run db:up` |
| `.github/workflows/ci.yml` | GitHub Actions | Tests + typecheck + build. Comes with you when you copy `dapp/` into your own repo |

Useful scripts (run them from this `dapp/` folder):

| Command | Does |
|---|---|
| `npm test` | Contract + backend + frontend tests (backend needs PostgreSQL) |
| `npm run typecheck` / `npm run build` | Type-check everything / production builds |
| `npm run chain` · `npm run deploy:local` · `npm run export:local` · `npm run election:local` | Local blockchain workflow (3A) |
| `npm run deploy:sepolia` · `npm run export` · `npm run election:sepolia` · `npm run webhook:query` | Sepolia workflow (3B) |
| `npm run deploy:sepolia:reset` | Deploy a **changed** contract again (new address) |
| `npm run db:up` · `npm run db:migrate` · `npm run db:reset` | Start Docker Postgres · apply migrations · wipe the database (asks no questions!) |
| `npm run backend` · `npm run frontend` | Start the API (:4000) / the web app (:5173) |

## 2. Install
**Prerequisites** ([docs/01-setup.md](../docs/01-setup.md)): Node.js LTS (22.13+), **Git**, VS Code, MetaMask.
Database: **Docker Desktop** (`npm run db:up`) **or** a free cloud PostgreSQL at **neon.tech**.
```bash
cd dapp
npm install          # installs all three workspaces and generates the Prisma client
npm run test -w contracts   # ✅ 18 passing
```

---

## 3A. Run locally (fast, free): use this while developing

Everything runs on your laptop: a local blockchain (chain id 31337), no test ETH, no Alchemy, no ngrok.

**Terminal 1: local blockchain** (leave it running)
```bash
npm run chain
```
It prints 20 test accounts with 10,000 ETH each, plus their private keys (public test keys: **local use only**).

**Terminal 2: deploy + data**
```bash
npm run deploy:local          # deploy Voting to the local chain (account #0 = admin)
npm run export:local          # copy ABI + address into backend/ and frontend/
npm run election:local        # create a demo election (open for 2 hours)
npm run db:up                 # PostgreSQL in Docker (or use a Neon URL below)
```
Create `backend/.env` from the example:
```bash
cp backend/.env.example backend/.env          # bash / PowerShell
copy backend\.env.example backend\.env        # Command Prompt
```
and set these lines in `backend/.env`:
```
DATABASE_URL="postgresql://voting:voting@localhost:5432/voting"    # or your Neon URL
RPC_URL="http://127.0.0.1:8545"
CONFIRMATIONS=0
LOG_CHUNK_BLOCKS=1000
```
```bash
npm run db:migrate            # create the tables
npm run backend               # http://localhost:4000 - log shows "backend started" then "indexer up to date"
```
**Terminal 3: the app**
```bash
npm run frontend              # http://localhost:5173
```
In the browser: **Connect wallet** → MetaMask offers to add **"Hardhat Local"** → approve. Then import account **#0**
(MetaMask → account menu → *Add account / Import account* → paste the private key of Account #0 from terminal 1) to be the admin,
and import #1, #2… to vote as other people.

> Restarted `npm run chain`? The local chain starts empty. Run `deploy:local`, `export:local`, `election:local` and `npm run db:reset` again,
> and in MetaMask use *Settings → Advanced → Clear activity tab data* (otherwise MetaMask remembers old nonces).

---

## 3B. Run on Sepolia (the real thing)

**1. Keys** (from `dapp/contracts`): you need an **Alchemy** RPC URL ([docs/03-alchemy.md](../docs/03-alchemy.md)) and your practice wallet with
SepoliaETH. The Hardhat keystore is **shared by all your Hardhat projects**: if you already set a key in the session, skip it
(or add `--force` to replace it).
```bash
cd contracts
npx hardhat keystore set SEPOLIA_RPC_URL        # https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>
npx hardhat keystore set SEPOLIA_PRIVATE_KEY    # practice wallet = election admin
cd ..
```
**2. Deploy + export + an election**
```bash
npm run deploy:sepolia        # type y to confirm
npm run export                # ABI + address + deploy block -> backend & frontend
npm run election:sepolia      # demo election (open 2 hours)
```
Custom election: bash `TITLE="Best use-case?" OPTIONS="A,B,C" HOURS=2 npm run election:sepolia` ·
PowerShell `$env:TITLE="Best use-case?"; $env:OPTIONS="A,B,C"; $env:HOURS="2"; npm run election:sepolia`.

**3. Database + backend:** as in 3A, but in `backend/.env` use your **Alchemy** URL for `RPC_URL`, `CONFIRMATIONS=6` and `LOG_CHUNK_BLOCKS=10`
(Alchemy's free plan allows only 10 blocks per `eth_getLogs` request). Then `npm run db:migrate` and `npm run backend`.
Check http://localhost:4000/ready → `{"ok":true,"database":true,"rpc":true}`.

**4. Real-time events: Alchemy webhook (recommended).** Without it, the reconciler still finds every event, ~1–2 minutes later.
1. Terminal: `ngrok http 4000` → copy the `https://….ngrok-free.app` URL.
2. `npm run webhook:query` → copy the printed GraphQL query (it filters **your** contract and events).
3. Alchemy → **Webhooks** → **Create Webhook** → **Custom Webhook** → Ethereum **Sepolia** → URL `https://<ngrok>/webhooks/alchemy` → paste query → **Create**.
4. Copy the webhook's **Signing key** → `ALCHEMY_WEBHOOK_SIGNING_KEY` in `backend/.env` → restart the backend.
   Details & screenshots-in-words: [docs/03-alchemy.md §5](../docs/03-alchemy.md).

**5. Frontend:** `npm run frontend` → connect MetaMask (Sepolia) → vote. Your vote appears within seconds as **pending** and becomes
**final** after `CONFIRMATIONS` blocks.

**Changed the contract?** `npm run deploy:sepolia:reset` → `npm run export` → `npm run db:reset` → new webhook with the new query/key.

## 4. API reference

| Method & path | Returns |
|---|---|
| `GET /health` | `{ ok: true }` if the process is up |
| `GET /ready` | Database + RPC reachable? (`503` if not) |
| `GET /api/stats` | Counts + indexer status (`lastConfirmedBlock`, `chainHead`, `lagBlocks`) |
| `GET /api/elections?status=active\|upcoming\|ended\|cancelled&page&pageSize` | Paginated list |
| `GET /api/elections/:id` | Details, results per option, `pendingVotes` |
| `GET /api/elections/:id/votes?page&pageSize` | Latest votes with `confirmed` flag |
| `GET /api/elections/:id/eligibility/:address` | `hasVoted`, `votedOption`, `isRegistered`, `canVote` |
| `GET /api/accounts/:address` | `isElectionAdmin` (read from the contract) + voting history |
| `POST /webhooks/alchemy` | Alchemy webhook receiver (only if a signing key is configured) |

Errors: `400` invalid input (with details) · `401` bad webhook signature · `403` unknown webhook id · `404` not found · `429` too many requests · `500` server error.

## 5. How it stays correct (optional reading)
*Not needed for the assignment: this explains what the infrastructure you're reusing does.*
1. **The chain is the source of truth; the database is a fast index.** Delete the database and the reconciler rebuilds it from the deploy block.
2. **Two ways in:** the *webhook* (push, seconds) and the *reconciler* (pull via `eth_getLogs`; fills gaps, confirms after `CONFIRMATIONS` blocks).
3. **Idempotent:** events are keyed `txHash:logIndex` and webhook deliveries by their id, so processing twice changes nothing (Alchemy retries).
4. **Reorg-safe:** each `Vote`/`Election`/`Voter` row points to its `ChainEvent` with `ON DELETE CASCADE`. If a reorg removes an event,
   its rows disappear, and counts are computed with `GROUP BY`, so they can't drift.
5. **Secure by default:** webhook HMAC on the raw body (constant-time compare), zod validation, helmet, CORS allow-list, rate limiting,
   env validated at startup, no private keys in backend or frontend, contract roles + emergency pause.

## 6. Testing & CI
```bash
npm run test -w contracts   # 18 tests (Solidity incl. fuzz + TypeScript) · coverage: npm run coverage -w contracts
npm run test -w backend     # 12 tests against PostgreSQL: webhook signature, duplicates, out-of-order, backfill, reorg, validation
npm run test -w frontend    # error decoding
npm run typecheck           # all workspaces
```
Backend tests need PostgreSQL. With Docker (`npm run db:up`) they create their own test database automatically
(`voting_test_<fingerprint>`; a fresh one whenever your migrations change). **With Neon:** create a separate database (e.g. `test`) in the
Neon dashboard and set `TEST_DATABASE_URL` to its URL first: bash `TEST_DATABASE_URL="postgresql://..." npm run test -w backend`,
PowerShell `$env:TEST_DATABASE_URL="postgresql://..."; npm run test -w backend`.

CI (`.github/workflows/ci.yml`) runs everything on every push with a PostgreSQL service.

## 7. Deploying online (bonus)
| Piece | Example (free tiers exist) | Notes |
|---|---|---|
| Database | Neon / Supabase | Run `npm run db:deploy -w backend` (applies migrations) on release |
| Backend | Render / Railway / Fly.io | Docker: run `docker build -f backend/Dockerfile -t dapp-backend .` **from this `dapp/` folder**; set env vars; health check `/ready`; run **one** instance |
| Frontend | Vercel / Netlify | `npm run build -w frontend`, set `VITE_API_URL`, add the frontend URL to `CORS_ORIGINS` |
| Webhook | Alchemy | Point it at `https://<your-backend>/webhooks/alchemy` |

## 8. Troubleshooting
| Problem | Fix |
|---|---|
| `No contract address yet` (backend or frontend) | Deploy, then `npm run export` (Sepolia) or `npm run export:local`; restart |
| `Invalid environment configuration` at backend start | The listed variable is missing/invalid in `backend/.env` |
| `HHE7: Configuration Variable "SEPOLIA_RPC_URL" not found` | `cd contracts` → `npx hardhat keystore set SEPOLIA_RPC_URL` (your Alchemy URL) |
| `keystore set` says the key already exists | The keystore is shared by all your Hardhat projects; it's already set. `--force` replaces it |
| Ignition error after changing the contract (module changed / reconciliation) | `npm run deploy:sepolia:reset`, then `export`, `db:reset`, new webhook |
| `P1001: Can't reach database server` / empty `DATABASE_URL` | Start Postgres (`npm run db:up`) or fix `DATABASE_URL` in `backend/.env` (Neon needs `?sslmode=require`) |
| `P2021: table does not exist` | `npm run db:migrate` |
| `/ready` → `rpc:false` | Wrong `RPC_URL` (Alchemy key? Sepolia enabled?), or `npm run chain` not running in local mode |
| Backend log stops at "backend started" for a while | The reconciler is catching up on history (10 blocks per request on Alchemy free). It logs "indexer up to date" when done |
| Webhook returns `401` / `403` | Signing key (`401`) or webhook id (`403`) in `.env` doesn't match that webhook |
| Webhook returns `400 unexpected payload` | Use the query from `npm run webhook:query` (it selects the fields the backend needs) |
| Votes stay "pending" | They become final after `CONFIRMATIONS` blocks (~12 s each on Sepolia) |
| Frontend: "Cannot reach the backend" | Backend not running, wrong `VITE_API_URL`, or origin missing from `CORS_ORIGINS` |
| MetaMask: "Your wallet doesn't have permission" | Only the deployer (or wallets granted `ELECTION_ADMIN_ROLE`) can create elections |
| MetaMask "nonce too high" / stuck after restarting the local chain | MetaMask → Settings → Advanced → **Clear activity tab data** |
| `ENOSPC: System limit for number of file watchers reached` (Linux) | `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf && sudo sysctl -p` |
| Windows: `&&` or `VAR=value` errors | You're in PowerShell 5: run commands one per line; use the PowerShell forms given above |
