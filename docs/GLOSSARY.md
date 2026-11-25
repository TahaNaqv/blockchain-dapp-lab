# 📖 Glossary — Plain-English Meanings

Terms used in this repository, roughly in the order you'll meet them.

## Blockchain basics
| Term | Meaning |
|---|---|
| **Hash** | A fixed-length "fingerprint" of any data (e.g. SHA-256, keccak256). Change one letter → completely different hash. |
| **Block** | A batch of transactions plus the hash of the previous block, which is what makes the chain. |
| **Nonce (mining)** | The number miners change until a block's hash meets the difficulty target (Proof of Work). |
| **Nonce (account)** | Your transaction counter. It stops anyone replaying your transaction and keeps your transactions in order. |
| **Proof of Work / Proof of Stake** | Ways the network agrees on the next block: by burning computation (Bitcoin) or by locking up ETH as collateral (Ethereum). |
| **Testnet / Sepolia** | A public Ethereum network with **free** ETH for testing. Same software as mainnet, but no real money. |
| **Mainnet** | The real Ethereum network, where ETH has real value. |
| **Layer 2 (L2)** | Cheaper networks that settle on Ethereum (Base, Arbitrum, Optimism). Same tools: just another `--network`. |
| **Wallet / MetaMask** | Software that holds your **private key** and signs transactions. Your coins live on the chain, not in the wallet. |
| **Private key / address** | The key proves ownership (never share it). The address is derived from it (share it freely). |
| **Seed / secret recovery phrase** | 12 words that regenerate all your wallet's keys. Treat it like the keys themselves. |
| **Faucet** | A website that gives free testnet ETH. |
| **Gas / gas fee** | What you pay validators to execute your transaction. Reading data is free; writing costs gas. |
| **Wei** | The smallest unit of ETH: 1 ETH = 10¹⁸ wei. Contracts only use whole numbers, so amounts are stored in wei. |
| **Block explorer / Etherscan** | A website that shows every block, transaction, contract and event. Sepolia's is sepolia.etherscan.io. |

## Smart contracts
| Term | Meaning |
|---|---|
| **Smart contract** | A program stored at an address on the blockchain. Everyone can call it, nobody can change its code. |
| **Solidity** | The language Ethereum contracts are written in. |
| **ABI** | "Application Binary Interface": the list of a contract's functions, events and errors in JSON. Frontends and backends need it to talk to the contract. |
| **Transaction** | A signed request that changes state (costs gas, waits for a block). |
| **Call / view function** | A read-only request answered by one node, instantly and for free. |
| **Event / log** | A message a contract writes into the block (e.g. `VoteCast`). Off-chain apps listen to events to learn what happened. |
| **topic0** | The first entry of an event log: the hash of the event's signature, e.g. `keccak256("VoteCast(uint256,address,uint8)")`. Used to filter for one event type. |
| **Revert / custom error** | The contract refuses (e.g. `AlreadyVoted`). The whole transaction is undone, as if it never happened. |
| **Access control / roles** | Rules about who may call what (`onlyOwner`, `ELECTION_ADMIN_ROLE`). |
| **Re-entrancy** | An attack where a contract is called again *before* it finished updating its state (the 2016 DAO hack). Fix: Checks → Effects → Interactions. |
| **OpenZeppelin** | A library of audited, standard contract code (ERC-20, ERC-721, AccessControl, Pausable…). |
| **ERC-20 / ERC-721** | Standard interfaces for fungible tokens (coins) and NFTs. |

## Hardhat
| Term | Meaning |
|---|---|
| **Hardhat** | The development framework: compile, test, deploy, run scripts. |
| **Ignition** | Hardhat's deployment system. It remembers what it deployed in `ignition/deployments/`. |
| **Keystore** | Hardhat's encrypted storage for secrets (private key, RPC URL). It's shared by all your Hardhat projects. |
| **Local chain (`npm run chain`)** | A private blockchain on your laptop (chain id 31337) for fast, free development. It resets when stopped. |
| **Fuzz test** | A test the framework runs with hundreds of random inputs to find edge cases. |

## Backend & data
| Term | Meaning |
|---|---|
| **RPC / RPC URL** | The address of an Ethereum node your code talks to (e.g. your Alchemy URL). |
| **Alchemy** | A company that runs Ethereum nodes for you (RPC) and can call your server when events happen (webhooks). |
| **Webhook** | An HTTP request *another service* sends to *your* server when something happens. Alchemy → `POST /webhooks/alchemy`. |
| **ngrok** | A tool that gives your laptop's local server a temporary public URL, so Alchemy can reach it. |
| **HMAC signature** | A code computed from the message and a shared secret. If it matches, the message really came from Alchemy and wasn't changed. |
| **Indexer** | A program that reads contract events and stores them in a database in a query-friendly shape. Our backend is a small indexer. |
| **Reconciler** | The part of our indexer that regularly re-reads confirmed blocks directly from the chain, to fill gaps and fix mistakes. |
| **Confirmations / finality** | How many blocks have been built on top of a block. After a few, it's practically never going to change. |
| <a id="reorg"></a>**Reorg** | When the network replaces one or more recent blocks with different ones. Transactions in the dropped blocks may disappear or move. Picture: block 105a and 105b compete; everyone ends up building on 105b, so 105a's contents are discarded. |
| **Idempotent** | Safe to do twice: processing the same event again changes nothing. Important because webhooks can be delivered more than once. |
| **Event sourcing / projection** | We store every raw event (`ChainEvent`), then *derive* the app tables (`Vote`, `Election`) from them. Those derived tables are "projections" or "read-models". |
| **PostgreSQL** | A relational database (tables, rows, SQL). |
| **Prisma / schema / migration** | Prisma is the TypeScript database toolkit. `schema.prisma` describes your tables. A migration is the SQL that changes the database to match the schema. |
| **Express / route / endpoint** | Express is the Node.js web framework. A route/endpoint is one URL your API answers, e.g. `GET /api/elections`. |
| **REST API / JSON** | The style of API we build (URLs + HTTP methods) and the data format it returns. |
| **zod** | A library that validates input (e.g. "this must be a valid address"); bad input → `400`. |
| **CORS** | Browser rule: a website may only call your API if the API allows that website's origin. |
| **helmet / rate limiting / pino** | Security headers / limiting requests per IP / structured logging: standard production hygiene. |
| **`.env` / environment variables** | Configuration and secrets kept outside the code (never committed to Git). |
| **Docker / Docker Compose** | Runs software (like PostgreSQL) in containers with one command. `npm run db:up` uses it. |
| **Neon** | A free cloud PostgreSQL service, an alternative to Docker. |

## Frontend & tooling
| Term | Meaning |
|---|---|
| **React / component / hook** | UI library / a reusable piece of UI / a function that adds behaviour to components (`useState`, `useQuery`, `useTransaction`). |
| **Vite** | The tool that runs the React app in development (`npm run frontend`) and builds it for production. |
| **TanStack Query** | Fetches API data, caches it and refreshes it automatically (`useElection`, `useElections`). |
| **ethers.js** | The library that talks to Ethereum (contracts, wallets, units) from TypeScript. |
| **npm workspaces / `-w`** | One repository with several packages (`contracts`, `backend`, `frontend`). `npm run test -w backend` runs the backend's `test` script. |
| **TypeScript / typecheck** | JavaScript with types. `npm run typecheck` finds mistakes before you run anything. |
| **CI (GitHub Actions)** | GitHub runs your tests automatically on every push (`.github/workflows/ci.yml`). |
