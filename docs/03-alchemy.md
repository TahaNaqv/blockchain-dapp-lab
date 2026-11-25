# ⚡ Alchemy Guide — RPC & Webhooks for Your DApp

**For:** BS students building the full-stack DApp (Hardhat + Express + React) · FAST-NUCES Islamabad
**Verified against Alchemy's official docs on 25 Nov 2026.** Dashboards change — if a button moved, look for the same words.

---

## 1. Why you need Alchemy

Your app has to talk to Ethereum. That means sending JSON-RPC requests (`eth_call`, `eth_sendRawTransaction`, `eth_getLogs`, …)
to an **Ethereum node**. Running your own node is expensive, so almost every team uses a **node provider**: Alchemy, Infura,
QuickNode, etc. Alchemy gives you:

| Product | What it does in our Voting DApp |
|---|---|
| **RPC endpoint** (HTTPS / WebSocket) | Hardhat deploys through it; the backend reads logs, blocks and contract state through it |
| **Webhooks** ("Notify") | Alchemy **pushes** your contract's events to your backend the moment they're mined, so you don't have to keep polling |
| Dashboard & logs | See every request your app made, errors, and usage |

> MetaMask uses its own RPC for the user's transactions. **Your** code (Hardhat, backend) uses **your** Alchemy key.

---

## 2. Create a free account, app and API key

1. Go to **https://dashboard.alchemy.com/signup** → sign up with Google or e-mail. (A new account already comes with a default app and API key.)
2. Create an app for this project: dashboard → **Team Overview** (team menu) → **Apps** tab → **Create new app** →
   name `my-dapp` → select the chain **Ethereum** and network **Sepolia** → **Create App**.
3. On the app's page, copy the **API key** (top-right), or open the **Endpoints** tab for full URLs:

| Use | URL |
|---|---|
| HTTPS RPC (Hardhat, backend) | `https://eth-sepolia.g.alchemy.com/v2/<YOUR_API_KEY>` |
| WebSocket (optional, subscriptions) | `wss://eth-sepolia.g.alchemy.com/v2/<YOUR_API_KEY>` |

🔐 **Your API key is a secret.** Anyone with it spends your quota. Keep it in the Hardhat keystore / `.env` (git-ignored) — never in
code, screenshots or GitHub. If it leaks, delete the key in the dashboard and create a new one.

---

## 3. Free plan limits (what they mean for you)

| Limit (Free plan) | Value | What it means |
|---|---|---|
| Compute Units (CU) per month | **30,000,000** | Every RPC call costs CUs (simple calls ~10–30, `eth_getLogs` more). Plenty for a student project. |
| Throughput | **300 CU/second** (10-second rolling window) | Bursts beyond it get HTTP **429**. Our backend throttles requests. |
| Apps | **5** | One per project is enough. |
| Webhooks | **5** | One Custom Webhook per contract/project. |
| `eth_getLogs` block range | **10 blocks per request** | You can't ask for "all logs from block 0 to now" in one call. Our reconciler fetches **10 blocks at a time** (`LOG_CHUNK_BLOCKS=10`). |

> These numbers come from Alchemy's pricing and `eth_getLogs` docs. Paid plans raise them (e.g. unlimited `eth_getLogs` range on Ethereum).

---

## 4. Using the RPC URL

### 4.1 Hardhat (deployments, scripts)
```bash
cd dapp/contracts
npx hardhat keystore set SEPOLIA_RPC_URL        # paste https://eth-sepolia.g.alchemy.com/v2/<KEY>
npx hardhat keystore set SEPOLIA_PRIVATE_KEY    # practice wallet (skip if you set it in the session)
```
`dapp/contracts/hardhat.config.ts` reads both with `configVariable(...)`. They're stored **encrypted**, never in your code.
The keystore is **shared by all your Hardhat projects**: set each key once (`--force` replaces it).

> The **session labs** (`session/hardhat-lab`) don't need Alchemy: they use a free public RPC by default. You *can* point them at
> Alchemy with the environment variable `SEPOLIA_RPC_URL` (bash `export SEPOLIA_RPC_URL=...`, PowerShell `$env:SEPOLIA_RPC_URL="..."`).

### 4.2 Backend (`backend/.env`)
```
RPC_URL="https://eth-sepolia.g.alchemy.com/v2/<KEY>"
LOG_CHUNK_BLOCKS=10        # free plan limit for eth_getLogs
```
Quick test: it should print the latest block number (hex in bash, a result object in PowerShell):
```bash
# bash / Git Bash / macOS / Linux
curl -s -X POST -H "content-type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' https://eth-sepolia.g.alchemy.com/v2/<KEY>
```
```powershell
# PowerShell
Invoke-RestMethod -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' -Uri "https://eth-sepolia.g.alchemy.com/v2/<KEY>"
```
Easiest of all: start the backend and open http://localhost:4000/ready → `"rpc": true`.

---

## 5. Webhooks — listening to your contract's events

### 5.1 Why webhooks?
Without webhooks, a backend must **poll**: "any new events? … any now? … now?" — slow and wasteful.
With a webhook, **Alchemy calls your backend** (`POST /webhooks/alchemy`) whenever a new block contains your contract's events.

### 5.2 Which webhook type?
| Type | Use for |
|---|---|
| Address Activity | ETH / token transfers to or from a list of wallets |
| NFT Activity | NFT transfers |
| **Custom Webhook (GraphQL)** | **Any smart-contract event** — filter logs by contract address and event signature (topic0). ✅ **This is ours.** |

Custom webhooks support **Ethereum Sepolia** (network `ETH_SEPOLIA`).

### 5.3 The GraphQL query
After deploying and running `npm run export`, generate the exact query for **your** contract:
```bash
npm run webhook:query
```
It prints something like:
```graphql
{
  block {
    hash
    number
    timestamp
    logs(filter: {addresses: ["0xYourVotingContract"], topics: [["0x<ElectionCreated>", "0x<VotersRegistered>", "0x<VoteCast>", "0x<ElectionCancelled>"]]}) {
      data
      topics
      index
      account { address }
      transaction { hash index status }
    }
  }
}
```
- `addresses` = only **your** contract. `topics[0]` = only your **four event signatures** (keccak256 of `VoteCast(uint256,address,uint8)` etc.).
- ⚠️ Alchemy warns: an empty topic filter matches **all** events → huge volume. Always filter.
- The backend needs `block.hash/number/timestamp` and each log's `data/topics/index/account/transaction` — that's why they're selected.

### 5.4 Local development: expose your backend with ngrok
Alchemy can't reach `localhost`. Alchemy's docs recommend **ngrok**:
1. Sign up at **ngrok.com** (free) → install → `ngrok config add-authtoken <YOUR_TOKEN>`.
2. Start your backend (`npm run backend`, port 4000), then: `ngrok http 4000`.
3. Copy the `https://<random>.ngrok-free.app` URL. Your webhook URL is **`https://<random>.ngrok-free.app/webhooks/alchemy`**.
4. ngrok's inspector at **http://localhost:4040** shows every request Alchemy sends — great for debugging.
(The free ngrok URL changes each restart → update the webhook URL in Alchemy when it does.)

### 5.5 Create the webhook (dashboard)
1. Dashboard → **Webhooks** (make sure your app is selected) → **Create Webhook** → **Custom Webhook**.
2. Chain **Ethereum**, network **Sepolia**.
3. Webhook URL: `https://<ngrok-or-production-domain>/webhooks/alchemy`.
4. Paste the GraphQL query from `npm run webhook:query`.
5. *(Optional)* **Test Webhook**: to test, the dashboard needs a specific block, so it may ask you to fill in a block hash. You can skip the
   test. When you create the webhook, Alchemy automatically runs your query on **every new block**.
6. **Create Webhook**. You should see it listed as **Active**.
7. Open the webhook → copy the **Signing key** (top right) → `backend/.env`:
   ```
   ALCHEMY_WEBHOOK_SIGNING_KEY="whsec_..."
   ALCHEMY_WEBHOOK_ID="wh_..."      # optional: reject deliveries from any other webhook
   ```
8. Restart the backend. Vote in the app → the backend log shows `webhook processed` within seconds.

**Redeployed your contract (new address) or added events?** The old webhook still filters the *old* address. Create a **new** webhook with
the new `npm run webhook:query`, put **its** signing key (and id) in `backend/.env`, and delete the old webhook (the free plan allows 5).
**ngrok restarted (new URL)?** Edit the webhook's URL in the dashboard, or create a new one.

*(Automation option: the Notify API `POST https://dashboard.alchemy.com/api/create-webhook` with header `X-Alchemy-Token` creates the same
webhook from a script; body `{ network: "ETH_SEPOLIA", webhook_type: "GRAPHQL", webhook_url, graphql_query }`.)*

### 5.6 Webhook security — verifying the signature
Anyone on the internet can POST to your URL. Alchemy signs each delivery:
- Header **`X-Alchemy-Signature`** = **HMAC-SHA256** of the **raw request body**, keyed with your webhook's **signing key**, hex-encoded.
- You must hash the **raw bytes** — not `JSON.stringify(req.body)` (re-serialising changes bytes → signature mismatch).

Our implementation (`backend/src/webhooks/alchemy.ts`):
```ts
export function isValidAlchemySignature(rawBody: Buffer, signature: string | undefined, signingKey: string): boolean {
  if (!signature || !signingKey) return false;
  const expected = createHmac("sha256", signingKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);   // constant-time compare (no timing attacks)
}
```
The route uses `express.raw()` (not `express.json()`) so the raw body is available. Invalid signature → **401**.

### 5.7 Delivery behaviour — and how our backend copes
| Alchemy behaviour (from its docs) | Our backend's answer |
|---|---|
| Your endpoint must return **200**; other codes are **retried with exponential backoff** (up to 10 min on the free plan) | Return 500 only when processing failed, so Alchemy retries |
| Retries can deliver the **same event twice**; no exactly-once guarantee is documented | De-duplicate by delivery id (`WebhookDelivery` table) **and** event id `txHash:logIndex` |
| First-time deliveries are in order; retries may not be | Out-of-order events are stored and re-applied by the reconciler |
| Chain **reorgs** can drop a block you were already told about; Alchemy only gives a `sequenceNumber` hint | Webhook events are stored as **pending**; the **reconciler** confirms them after `CONFIRMATIONS` blocks via `eth_getLogs` and deletes events that are no longer on the canonical chain |
| Your server might be down when an event happens | The reconciler backfills every block since the last checkpoint on restart |

**Rule of thumb:** *webhooks are for speed, the reconciler is for truth.* Never rely on webhooks alone.

---

## 6. Monitoring your usage
Dashboard → your app → **Metrics / Request logs**: requests per method, errors, CU usage. Webhooks page → each webhook's delivery history
(status codes, retries). A stream of `401`s means your signing key is wrong; `5xx` means your backend failed.

## 7. Checklist
- [ ] Alchemy account + app on **Ethereum Sepolia**; API key stored only in keystore / `.env`
- [ ] `npx hardhat keystore set SEPOLIA_RPC_URL` and deployments work
- [ ] Backend `RPC_URL` set; `/ready` shows `rpc: true`
- [ ] `npm run webhook:query` → Custom Webhook created → signing key in `.env` → `webhook processed` in logs
- [ ] `.env` files are git-ignored (check `git status` before every commit!)

## 8. Sources (official)
- Create an API key — https://www.alchemy.com/docs/create-an-api-key
- Pricing plans & limits — https://www.alchemy.com/docs/reference/pricing-plans · Throughput — https://www.alchemy.com/docs/reference/throughput
- `eth_getLogs` limits — https://www.alchemy.com/docs/reference/eth-getlogs
- Webhooks overview — https://www.alchemy.com/docs/reference/webhooks-overview · Custom webhooks — https://www.alchemy.com/docs/reference/custom-webhook
- Custom webhook filters — https://www.alchemy.com/docs/reference/custom-webhook-filters
- Notify quickstart (signatures, delivery, ngrok) — https://www.alchemy.com/docs/reference/notify-api-quickstart
- Create webhook API — https://www.alchemy.com/docs/data/webhooks/webhooks-api-endpoints/create-webhook
