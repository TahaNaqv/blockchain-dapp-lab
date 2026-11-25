# 🗳️ Voting DApp — production-grade reference (Hardhat · Express · PostgreSQL · React — all TypeScript)

The reference application for the session and the template for the take-home assignment.
On-chain elections on **Ethereum Sepolia**, an **event-indexing backend** fed by **Alchemy webhooks**, a **PostgreSQL** database, and a
**React** frontend that reads everything from the backend while users sign votes with **MetaMask**.

```
                                     ┌──────────────────────── Ethereum Sepolia ────────────────────────┐
                                     │                 Voting.sol  (AccessControl · Pausable)            │
                                     └───▲───────────────────────────┬──────────────────────▲──────────┘
                      user signs vote tx │                           │ logs                 │ eth_getLogs / eth_call
                       (MetaMask, RPC)   │              ┌────────────▼─────────────┐        │ (Alchemy RPC)
                                         │              │  Alchemy Custom Webhook  │        │
┌────────────────────────────┐           │              │  (GraphQL log filter)    │        │
│ frontend/  React + Vite    │───────────┘              └────────────┬─────────────┘        │
│ TanStack Query · ethers    │                                       │ POST (HMAC-signed)   │
│ MetaMask (signing only)    │      HTTPS / JSON       ┌─────────────▼──────────────────────┴───────┐      ┌──────────────────┐
│                            │ ───────────────────────▶│ backend/  Node · Express 5 · TypeScript    │─────▶│ PostgreSQL       │
│  ALL reads go to the API   │◀─────────────────────── │  /webhooks/alchemy  (listener, push)       │ Prisma│ events + read-   │
└────────────────────────────┘                         │  Reconciler         (backfill, confirm,     │◀─────│ models (Election,│
                                                       │                      reorg repair, pull)    │      │ Vote, Voter)     │
                                                       │  REST API (elections, results, accounts)    │      └──────────────────┘
                                                       └─────────────────────────────────────────────┘
          contracts/ Hardhat 3: Solidity · tests (Solidity + TS) · Ignition deploy · export ABI/address to the apps
```

**Read path:** React → Express API → PostgreSQL. **Write path:** React → MetaMask signs → Sepolia → (Alchemy webhook + reconciler) → PostgreSQL.
**Why the user's wallet signs votes (not the backend):** a vote must be provably from the voter. If the backend signed, it could vote
for anyone and the blockchain would prove nothing. (Gas-less voting through a relayer with EIP-712 signatures is a valid advanced design — see "Next steps".)

---

## Contents
1. [Tech stack & why](#1-tech-stack--why) · 2. [Repository layout](#2-repository-layout) · 3. [Run it (step by step)](#3-run-it-step-by-step) ·
4. [API reference](#4-api-reference) · 5. [Design decisions](#5-design-decisions-the-enterprise-part) · 6. [Testing & CI](#6-testing--ci) ·
7. [Deploying to production](#7-deploying-to-production) · 8. [Troubleshooting](#8-troubleshooting) · 9. [Next steps](#9-next-steps)

---

## 1. Tech stack & why

| Layer | Choice | Why |
|---|---|---|
| Smart contracts | **Hardhat 3**, Solidity 0.8.28, OpenZeppelin 5 (`AccessControl`, `Pausable`), Ignition | Industry-standard framework; TS tests + Foundry-style Solidity tests & fuzzing; reproducible deployments |
| RPC & events | **Alchemy** (RPC + Custom Webhooks) | Reliable node provider with a free tier; webhooks push contract events instead of polling |
| Backend | **Node.js 22+/24, Express 5, TypeScript**, zod, pino, helmet, express-rate-limit | Mainstream, simple, well understood; validation, structured logs and security headers built in |
| Database | **PostgreSQL 17** via **Prisma 7** (pinned 7.10.1) | Relational integrity (FKs + cascades power reorg repair), migrations, type-safe queries. Prisma 8 is still a release candidate — we pin the stable 7.x |
| Frontend | **React 19, Vite, TypeScript**, React Router 7, TanStack Query 5, ethers 6 | Standard React stack; TanStack Query handles caching/polling of API data |
| Ops | Docker Compose (Postgres), Dockerfile (backend), GitHub Actions CI | Same setup on every laptop and in CI |

## 2. Repository layout

```
contracts/                 Hardhat 3 workspace
  contracts/Voting.sol       elections · open or allowlist · roles · pause · custom errors · events
  test/Voting.t.sol          13 Solidity tests (incl. 2 fuzz tests)        test/Voting.ts  5 TS tests
  ignition/modules/Voting.ts deployment (admin = deployer)
  scripts/export-to-apps.ts  ABI + address + deploy block -> backend & frontend (run after every deploy)
  scripts/print-webhook-query.ts   prints the Alchemy GraphQL webhook query for YOUR contract
  scripts/create-election.ts       create an election from the CLI
backend/                   Express workspace
  prisma/schema.prisma       ChainEvent · Election · Vote · Voter · WebhookDelivery · SyncState
  src/config/env.ts          env validation (zod) - the app refuses to start with bad config
  src/webhooks/alchemy.ts    LISTENER: signature check, dedupe, ingest (low latency)
  src/indexer/               decode · ingest (idempotent projections) · reconciler (truth: backfill/confirm/reorgs)
  src/api/                   REST routes          src/app.ts  app factory      src/server.ts  bootstrap + graceful shutdown
  test/                      12 tests against a real PostgreSQL (webhook, idempotency, reorg, validation)
  Dockerfile                 multi-stage production image (non-root, migrations on start)
frontend/                  React workspace
  src/wallet/                MetaMask provider (connect, switch network, signer)
  src/lib/api.ts             typed API client          src/lib/contract.ts  contract + friendly error decoding
  src/hooks/                 TanStack Query hooks · useTransaction (wallet -> pending -> confirmed/failed)
  src/pages/                 Elections · Election (results + vote) · New election (admins) · My votes
docker-compose.yml         PostgreSQL (and optionally the backend)
.github/workflows/ci.yml   tests + typecheck + build on every push
```

## 3. Run it (step by step)

**Prerequisites:** Node.js 22.13+ (LTS 26 recommended), Git, VS Code, MetaMask on Sepolia with test ETH,
a free **Alchemy** account (see [docs/03-alchemy.md](../docs/03-alchemy.md)), and **either** Docker Desktop **or** a free cloud Postgres (Neon / Supabase).

### 3.1 Install
```bash
npm install                 # all three workspaces (also generates the Prisma client)
```

### 3.2 Contracts → Sepolia
```bash
npm run test -w contracts                                   # 18 passing
cd contracts
npx hardhat keystore set SEPOLIA_RPC_URL                    # https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>
npx hardhat keystore set SEPOLIA_PRIVATE_KEY                # your PRACTICE wallet (becomes the election admin)
cd ..
npm run deploy:sepolia                                      # y to confirm
npm run export                                              # writes ABI/address/deploy block into backend + frontend
```

### 3.3 Database
- **Docker:** `npm run db:up` → `DATABASE_URL="postgresql://voting:voting@localhost:5432/voting"`
- **Cloud (no install):** create a free project on **neon.tech** → copy the connection string (`postgresql://…?sslmode=require`).

### 3.4 Backend
```bash
cp backend/.env.example backend/.env      # fill DATABASE_URL and RPC_URL (Alchemy)
npm run db:migrate                        # creates the tables (prisma migrate dev)
npm run backend                           # http://localhost:4000  - watch the logs: "reconciled block range"
```
Check: http://localhost:4000/ready → `{"ok":true,"database":true,"rpc":true}`

### 3.5 Real-time events: Alchemy webhook (listener)
1. Expose your local backend: `ngrok http 4000` → copy the `https://….ngrok-free.app` URL.
2. `npm run webhook:query` → copy the printed GraphQL query (it filters **your** contract and its 4 events).
3. Alchemy dashboard → **Webhooks** → **Create Webhook** → **Custom Webhook** → network **Ethereum Sepolia** →
   URL `https://<ngrok>/webhooks/alchemy` → paste the query → **Test Webhook** → **Create Webhook**.
4. Copy the webhook's **Signing key** → `ALCHEMY_WEBHOOK_SIGNING_KEY` in `backend/.env` (optionally `ALCHEMY_WEBHOOK_ID`) → restart the backend.
   Without a webhook everything still works — the reconciler alone indexes events, just ~1–2 minutes later.

### 3.6 Frontend
```bash
cp frontend/.env.example frontend/.env    # VITE_API_URL=http://localhost:4000
npm run frontend                          # http://localhost:5173
```
Connect MetaMask (the deployer wallet sees **New election**) → create an election → vote from another account →
the vote appears within seconds as *pending* (webhook) and becomes *final* after `CONFIRMATIONS` blocks (reconciler).
CLI alternative: `cd contracts && TITLE="…" OPTIONS="A,B,C" HOURS=2 npx hardhat run scripts/create-election.ts --network sepolia`.

## 4. API reference

| Method & path | Description |
|---|---|
| `GET /health` | Liveness (process up) |
| `GET /ready` | Readiness: database + RPC reachable (`503` if not) |
| `GET /api/stats` | Counts + indexer sync status (`lastConfirmedBlock`, `chainHead`, `lagBlocks`) |
| `GET /api/elections?status=active\|upcoming\|ended\|cancelled&page&pageSize` | Paginated list |
| `GET /api/elections/:id` | Details, live results per option, `pendingVotes` (not yet final) |
| `GET /api/elections/:id/votes?page&pageSize` | Latest votes with `confirmed` flag |
| `GET /api/elections/:id/eligibility/:address` | `hasVoted`, `votedOption`, `isRegistered`, `canVote` |
| `GET /api/accounts/:address` | `isElectionAdmin` (read from the contract) + voting history |
| `POST /webhooks/alchemy` | Alchemy Custom Webhook receiver (HMAC-verified; only if a signing key is configured) |

Errors: `400` validation (with details), `401` bad webhook signature, `404` not found, `429` rate limited, `500` generic (no internals leaked).

## 5. Design decisions (the "enterprise" part)

1. **The chain is the source of truth; the database is a rebuildable index.** Drop the database and restart: the reconciler rebuilds everything from the deployment block.
2. **Two ingestion paths.** *Webhook (push)* = low latency, but deliveries can be retried, duplicated, out of order or from a block later reorged.
   *Reconciler (pull)* = correctness: scans finalized blocks (`head − CONFIRMATIONS`) via `eth_getLogs`, confirms events, repairs gaps.
3. **Idempotency everywhere.** Events are keyed by `txHash:logIndex`; webhook deliveries by their id. Re-processing anything is harmless.
4. **Event sourcing + projections.** Each `Election`/`Vote`/`Voter` row references the `ChainEvent` that created it (`ON DELETE CASCADE`).
   A reorg deletes the orphaned event → its projections disappear → counts can't drift. Counts are aggregated (`GROUP BY`), never incremented.
5. **Finality is explicit.** Votes seen only by the webhook are `pending` until confirmed; the UI shows it.
6. **Alchemy free-plan aware.** `eth_getLogs` is limited to **10 blocks per request** on the free plan → `LOG_CHUNK_BLOCKS=10` and a request
   delay; raise it on paid plans or other providers.
7. **Security.** Webhook HMAC over the *raw* body with constant-time comparison; optional webhook-id pinning; zod validation on every input;
   helmet headers; CORS allow-list; rate limiting; request ids in logs; secrets only in env (validated at boot); no private keys in the backend
   or frontend; non-root Docker user; contract roles (`ELECTION_ADMIN_ROLE`, `PAUSER_ROLE`) and an emergency pause.
8. **Operability.** Structured JSON logs (pino), liveness/readiness endpoints, graceful shutdown, migrations as code, CI on every push.

## 6. Testing & CI
```bash
npm run test -w contracts    # 18 tests (13 Solidity incl. fuzz, 5 TypeScript), coverage: npm run coverage -w contracts
npm run db:up                # tests need PostgreSQL (or set TEST_DATABASE_URL)
npm run test -w backend      # 12 tests: signature, webhook ingestion, idempotency, out-of-order, backfill, reorg, late retries, API validation
npm run test -w frontend     # error decoding
npm run typecheck            # all workspaces
```
CI (`.github/workflows/ci.yml`) runs all of this on every push with a PostgreSQL service container.

## 7. Deploying to production
| Piece | Example (free tiers exist) | Notes |
|---|---|---|
| Database | Neon / Supabase / RDS | Use the pooled connection string; run `npm run db:deploy -w backend` (`prisma migrate deploy`) on release |
| Backend | Render / Railway / Fly.io (Docker) | `docker build -f backend/Dockerfile .` from the repo root; set env vars; health check `/ready`; **run ONE instance of the reconciler** (or add a leader lock) |
| Frontend | Vercel / Netlify | Build `npm run build -w frontend`; set `VITE_API_URL`; add the frontend origin to `CORS_ORIGINS` |
| Webhook | Alchemy | Point it at `https://<backend>/webhooks/alchemy`; keep the signing key secret; rotate if leaked |

Production checklist: secrets in the platform's secret store (never in Git) · `NODE_ENV=production` · `CONFIRMATIONS` ≥ 6 on Sepolia
(≥ 12–64 on mainnet) · monitor `/api/stats` `lagBlocks` · alerts on 5xx and webhook 401s · database backups · audit the contract before mainnet.

## 8. Troubleshooting
| Problem | Fix |
|---|---|
| `No contract address yet` (backend or frontend) | `npm run deploy:sepolia` then `npm run export`; restart |
| `Invalid environment configuration` at boot | The listed variable is missing/invalid in `backend/.env` |
| `P1001: Can't reach database server` | Start Postgres (`npm run db:up`) or fix `DATABASE_URL` (Neon needs `?sslmode=require`) |
| `/ready` → `rpc:false` | Wrong Alchemy URL/key, or Sepolia not enabled on the Alchemy app |
| Reconciler slow to catch up | Free plan = 10 blocks per `eth_getLogs`; it catches up ~500 blocks per tick. Normal on first start if the deploy was days ago |
| Webhook returns `401` | Signing key in `.env` doesn't match the webhook's key (each webhook has its own) |
| Webhook returns `400 unexpected payload` | Your GraphQL query must select `block { hash number timestamp logs { data topics index account{address} transaction{hash status} } }` — use `npm run webhook:query` |
| Votes stay "pending" | The reconciler confirms after `CONFIRMATIONS` blocks (~12 s each on Sepolia) — wait ~1–2 min; check `/api/stats` |
| Frontend: "Cannot reach the backend" | Backend not running, wrong `VITE_API_URL`, or origin missing from `CORS_ORIGINS` |
| MetaMask: "Your wallet doesn't have permission" | Only the deployer (or wallets granted `ELECTION_ADMIN_ROLE`) can create elections |
| `ENOSPC: System limit for number of file watchers reached` (Linux) | Too many file watchers (VS Code etc.): `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf && sudo sysctl -p` |

## 9. Next steps
- **Gas-less voting:** voters sign EIP-712 typed data; a backend relayer submits `voteBySig` and pays gas (needs a server key in a KMS, nonce management, rate limits).
- **Privacy:** commit–reveal or zero-knowledge voting (votes are public on a normal chain).
- **Sybil resistance:** allowlists from verified identity, token-weighted votes (OpenZeppelin `Governor` + `ERC20Votes`), or Merkle-proof allowlists.
- **wagmi + viem + RainbowKit** in the frontend; **The Graph / Ponder** as an alternative indexer; OpenAPI docs for the API.
