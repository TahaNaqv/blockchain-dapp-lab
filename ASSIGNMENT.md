# 🏗️ Assignment — Build Your Own Small DApp

**Course:** Blockchain — Dr. Noshina Tariq · FAST-NUCES Islamabad
**Set by:** Taha Naqvi (guest session) · **Team:** individual or pairs *(as your instructor decides)* · **Time:** ~2 weeks · **Deadline:** `__________`

> Build a **small but complete** decentralized app, end to end, **100 % TypeScript**:
>
> | Layer | Use |
> |---|---|
> | Smart contract | **Hardhat** → deployed on **Ethereum Sepolia** |
> | Backend | **Express** + **PostgreSQL** — listens to your contract's events (Alchemy webhook) and serves an API |
> | Frontend | **React** (Vite) — reads from your backend, users sign transactions with **MetaMask** |
>
> The goal is **not** a big project. The goal is to understand how the three layers of a real DApp fit together.

---

## 1. Start from the starter (`dapp/`)

The [`dapp/`](dapp) folder is a **complete, working Voting DApp** with exactly this architecture. **Don't start from zero:**

1. Run the Voting DApp end-to-end first ([dapp/README.md](dapp/README.md) + [docs/03-alchemy.md](docs/03-alchemy.md)). *This alone teaches you most of the assignment.*
2. Copy `dapp/` into your own repository.
3. Replace the voting logic with your idea, step by step, following **[docs/04-build-your-dapp.md](docs/04-build-your-dapp.md)**.

The infrastructure is already done for you — env validation, webhook signature checks, the reconciler, security middleware, the wallet code.
Your job is the **contract, the data model, the API routes and the pages** for *your* idea.

```
React ──HTTP──▶ Express API ──▶ PostgreSQL
  │ MetaMask signs   ▲ Alchemy webhook (+ reconciler)
  ▼                  │
      YOUR contract on Sepolia
```

---

## 2. Pick ONE idea (or propose your own)

Each idea is deliberately small. Do the **core**; **stretch** is optional extra credit.
*Voting is not allowed — it's the example.* Your own idea is welcome: send your instructor a 3-line description first.

| # | Idea | Core (required) | Stretch (optional) |
|---|---|---|---|
| 1 | 📝 **Message Wall** | Post a short message (optionally with an ETH tip to the owner); owner withdraws tips | Likes; per-user profile page |
| 2 | 💸 **Tip Jar for Creators** | Creators register a name; fans tip them in ETH; creators withdraw | Leaderboard of top creators/fans |
| 3 | 🔎 **Campus Lost & Found** | Post a lost item with an ETH bounty; finder claims; owner approves → bounty paid | Cancel & refund after a deadline |
| 4 | 🎓 **Certificate Verifier** | Issuer stores a certificate's hash; anyone verifies a file; issuer can revoke | Upload a PDF in the UI → backend hashes it |
| 5 | 🎉 **Event RSVP & Check-in** | Organizer creates an event with capacity; students RSVP; organizer checks them in | Attendance stats per event |
| 6 | 🤝 **Mini Crowdfunding** | Campaign with goal & deadline; donate; creator claims if goal met, else donors refund | Progress bar + top donors |
| 7 | 📚 **Item Lending** | List an item; borrow by paying a deposit; owner confirms return → deposit refunded | Late-return penalty |
| 8 | ✅ **Task Bounties** | Post a task with an ETH reward; someone submits; poster approves → reward paid | Deadlines and refunds |

---

## 3. Requirements (keep it small, make it work)

### Contract (`contracts/`)
- [ ] **One contract** with **at least 3 state-changing functions**.
- [ ] An **event** for every state change (your backend learns everything from events!) and **custom errors** for failures.
- [ ] Access control where it matters (e.g. only the owner/organizer/issuer can do X).
- [ ] If it handles ETH: update state **before** sending ETH (Checks → Effects → Interactions).
- [ ] **≥ 8 tests**, including **≥ 3 revert cases** (`npx hardhat test`).
- [ ] Deployed to **Sepolia** with Ignition.

### Backend (`backend/`)
- [ ] Express + TypeScript + PostgreSQL (Prisma), adapted from the starter.
- [ ] Your **events are indexed** into your own tables (Alchemy webhook + the starter's reconciler).
- [ ] **≥ 3 API endpoints**, e.g. *list*, *detail*, and one *filter or stats* endpoint.

### Frontend (`frontend/`)
- [ ] React + TypeScript, adapted from the starter.
- [ ] Connect MetaMask (Sepolia); show data **from your backend**.
- [ ] **≥ 2 write actions** (transactions) with a status message (*confirm in wallet → pending → confirmed / failed*) and a readable error.

### Submit
- [ ] A **GitHub repo** with a `README.md`: what your app does, how to run it, your **Sepolia contract address**, 2–3 screenshots.
- [ ] A **3–5 minute demo video**: tests passing → contract on Etherscan → using the app (a transaction appearing in the UI).
- [ ] **No secrets in Git** — `.env` files and keys must never be committed (`git status` before every commit!).
- [ ] Be ready to **explain your code** in a short viva. (AI tools are fine — not understanding your own code is not.)

---

## 4. Grading (100 + bonus)

| Part | Points |
|---|---|
| Contract: correct logic, events, errors, access control | 15 |
| Contract tests (≥ 8, revert cases) | 10 |
| Backend: events indexed into the database, working API | 25 |
| Frontend: wallet, data from API, ≥ 2 working transactions with status | 25 |
| README + demo video | 15 |
| Code quality & clean Git history (no secrets!) | 10 |
| **Bonus (up to +10)** | a stretch feature +4 · contract verified on Etherscan +2 · frontend/backend deployed online +2 · CI green on GitHub +2 |

---

## 5. Suggested plan

| Days | Do |
|---|---|
| 1–2 | Run the Voting DApp end-to-end (Sepolia, Alchemy, Postgres, webhook). Pick your idea. Write down functions + events on paper. |
| 3–5 | Contract + tests → deploy to Sepolia → `npm run export`. |
| 6–9 | Backend: Prisma models → decode & store your events → API endpoints. |
| 10–12 | Frontend: pages, data from the API, transactions. |
| 13–14 | README, screenshots, demo video. Ask a classmate to run your repo from the README. |

---

## 6. Getting help
1. Read [dapp/README.md](dapp/README.md) → *Troubleshooting*, and [docs/01-setup.md](docs/01-setup.md) → *Troubleshooting*.
2. Search the error message — most are common.
3. Still stuck? Open an issue on this repository (*Issues → New issue → Question*), or contact me:

| | |
|---|---|
| 👤 **Taha Naqvi** | Full-stack Blockchain Engineer |
| GitHub | https://github.com/TahaNaqv |
| LinkedIn | https://www.linkedin.com/in/taha-a-naqvi/ |
| Email | t.a.naqvi14@gmail.com |

When you ask, include: what you ran, the full error, and what you already tried. Good luck — and have fun building! 🚀
