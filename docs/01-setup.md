# 🛠️ Blockchain Developer Setup Guide — Hardhat 3 on Windows, macOS & Linux

**For:** BS students, FAST-NUCES Islamabad — Hands-on Blockchain Session (Dr. Noshina Tariq's course)
**Time needed:** 30–45 minutes · **Disk space:** ~1.5 GB · **Internet:** good connection (~400 MB of downloads) — **do this at home, not on campus Wi-Fi**

> This is the same toolchain blockchain engineers use in industry. Once it works, you can build, test and deploy real smart
> contracts. Follow the section for **your** operating system, then continue with the common sections.
>
> **Verified on 25 Nov 2026** with Node.js 26.13.1 (current LTS) and Node.js 22.23, npm 10/11, Hardhat 3.22.

---

## 0. What you will install, and why

| Tool | What it is | Why you need it |
|---|---|---|
| **Node.js (LTS)** + **npm** | JavaScript runtime + package manager | Hardhat is a Node.js program; npm downloads Hardhat, OpenZeppelin, ethers.js |
| **VS Code** | Code editor | Write Solidity & TypeScript; built-in terminal |
| **Hardhat for VS Code** extension (Nomic Foundation) | Solidity language support | Syntax highlighting, errors as you type, go-to-definition, formatting |
| **Git** *(required)* | Version control | Every real project lives in Git; `npm install` also needs it for one package (`forge-std`) |
| **MetaMask** | Browser wallet | Holds your (practice) keys; shows your test ETH & tokens |
| **Hardhat 3** | Ethereum development framework | Compile, test, deploy, script — installed per project by npm (not globally) |
| *Windows only:* **Microsoft Visual C++ Redistributable** | Runtime libraries | Hardhat's fast Rust engine needs them on Windows (official Hardhat requirement) |

**Which Node.js version?** Hardhat 3 needs **Node.js 22.13 or newer**, and supports every *even*-numbered version that Node.js still maintains.
Just install the **LTS** ("Long-Term Support") version offered on nodejs.org — today that is **Node.js 26**. Node 22 or 24 also work.
❌ Don't use odd versions (23, 25, 27…) or anything older than 22.13.

---

## 1A. Windows 10 / 11

### Step 1 — Microsoft Visual C++ Redistributable
Download and run: **https://aka.ms/vs/17/release/vc_redist.x64.exe** (official Microsoft link) → *Install* (or *Repair* if already installed) → Close.
*(Most PCs already have it — installing again is harmless.)*

### Step 2 — Node.js LTS
1. Go to **https://nodejs.org** → click the big **LTS** download button (Windows Installer `.msi`, 64-bit).
2. Run the installer → *Next* through the screens, keep defaults (make sure **"Add to PATH"** is selected — it is by default).
3. On the screen **"Tools for Native Modules"** → **leave the checkbox UNCHECKED** ("Automatically install the necessary tools…").
   We don't need it, and it downloads gigabytes of extra tools.
4. Finish.

### Step 3 — VS Code
1. **https://code.visualstudio.com** → *Download for Windows* → run the installer.
2. On "Select Additional Tasks", tick **"Add to PATH"** and **"Add 'Open with Code' action to … context menu"** (both very handy).

### Step 4 — Git (required)
**https://git-scm.com/download/win** → run the installer → defaults are fine (this also gives you **Git Bash**, a Linux-style terminal).

> ⚡ **Shortcut for power users:** open **PowerShell** and run (Windows Package Manager, built into Windows 10/11):
> ```powershell
> winget install -e --id OpenJS.NodeJS.LTS
> winget install -e --id Microsoft.VisualStudioCode
> winget install -e --id Git.Git
> ```
> Still install the C++ Redistributable from Step 1.

### Step 5 — Allow npm scripts in PowerShell (one-time)
**Close and reopen** PowerShell (new installs are only visible in *new* terminals), then:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Answer **Y**. Without this, PowerShell shows *"npx.ps1 cannot be loaded because running scripts is disabled on this system"*.
(Alternative: use **Command Prompt** or **Git Bash** instead of PowerShell.)

### Step 6 — Verify (new terminal)
```powershell
node -v      # v26.x.x  (or v22.13+ / v24.x)
npm -v       # 10.x or 11.x
git --version
code --version
```
`'node' is not recognized…`? → close **all** terminals (and VS Code), open a new one. Still failing → restart Windows.

### 💡 Windows tips that save hours
- Put projects in a simple folder like **`C:\dev`** — **not** inside OneDrive, Desktop (if synced), or a path with spaces/Urdu characters.
  OneDrive syncing locks files during `npm install` and causes random `EPERM` errors.
- If antivirus is very slow during `npm install`, wait — or add `C:\dev` as an exclusion.

---

## 1B. macOS

### Step 1 — Command Line Tools (gives you Git)
Open **Terminal** and run:
```bash
xcode-select --install
```
Click *Install* in the pop-up (if it says already installed — good).

### Step 2 — Node.js LTS (choose ONE)
- **Easiest:** **https://nodejs.org** → **LTS** → macOS Installer (`.pkg`) → run it.
- **Developer way (recommended, easy to switch versions):** nvm
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash
  # close & reopen Terminal, then:
  nvm install --lts
  nvm alias default 'lts/*'
  ```
- **Homebrew users:** `brew install node` installs the *newest* release — check `node -v` shows an **even** version ≥ 22.13 (today: 26). If it's odd, use `brew install node@24` instead.

### Step 3 — VS Code
**https://code.visualstudio.com** → Download for Mac → drag **Visual Studio Code** into **Applications**.
Then open VS Code → `Cmd+Shift+P` → type **"Shell Command: Install 'code' command in PATH"** → Enter.

### Step 4 — Verify (new Terminal window)
```bash
node -v && npm -v && git --version && code --version
```

---

## 1C. Linux (Ubuntu / Debian / Mint and others)

### Step 1 — Basics
```bash
sudo apt update && sudo apt install -y curl git build-essential
```

### Step 2 — Node.js LTS with nvm (recommended — no `sudo` needed for npm)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash
# close & reopen the terminal (or: source ~/.bashrc), then:
nvm install --lts
nvm alias default 'lts/*'
```
⚠️ Avoid `sudo apt install nodejs` — distribution versions are often too old for Hardhat 3. Never run `sudo npm …`.

### Step 3 — VS Code
- Ubuntu: `sudo snap install code --classic`
- or download the `.deb` from **https://code.visualstudio.com** → `sudo apt install ./code_*.deb`

### Step 4 — Verify
```bash
node -v && npm -v && git --version && code --version
```

---

## 2. VS Code setup (all operating systems)

1. Open VS Code → **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search **"Hardhat Solidity"** → install **"Solidity" by Nomic Foundation** (extension ID `NomicFoundation.hardhat-solidity`).
   ✅ Check the publisher is **Nomic Foundation** (the makers of Hardhat). Avoid installing several different Solidity extensions — they conflict.
3. Useful extras (optional): **ESLint**, **Prettier**, **GitLens**.
4. Learn the **integrated terminal**: `` Ctrl+` `` (backtick) opens a terminal *inside* VS Code, already in your project folder.
   - Windows: click the **˅** next to **+** in the terminal panel → *Select Default Profile* → **Command Prompt** or **Git Bash** if PowerShell gives you trouble.

---

## 3. MetaMask (practice wallet) + free test ETH

1. Install **only** from **https://metamask.io** → *Download* → it opens your browser's store (Chrome, Brave, Edge or Firefox) → *Add extension*.
   📌 Pin it: click the puzzle-piece icon in the toolbar → pin MetaMask.
2. **Create a new wallet** → set a password → MetaMask shows a **Secret Recovery Phrase** (12 words). Write it on paper.
   ⚠️ This is a **practice wallet**. Never put real money in it. Never share the phrase or private key with anyone — MetaMask staff will never ask for it.
3. **Show test networks:** click the **network menu** (top left / top right depending on version) → **Networks** →
   scroll down → toggle **"Show test networks"** → select **Sepolia**.
4. **Copy your address:** click your account name at the top → copy (starts with `0x…`, 42 characters).
5. **Free test ETH:** **https://cloud.google.com/application/web3/faucet/ethereum/sepolia** → sign in with your Google account →
   network **Ethereum Sepolia** → paste your address → **Get 0.05 Sepolia ETH**.
   After ~15 seconds MetaMask (on Sepolia) shows **0.05 SepoliaETH**. You can also paste your address on **https://sepolia.etherscan.io**.
   Faucet refused? Use the backup form shared in the class group.

---

## 4. The class starter project

1. Get the course repository into `C:\dev` (Windows) or `~/dev` (macOS/Linux):
   ```powershell
   # Windows (PowerShell or Command Prompt)
   mkdir C:\dev
   cd C:\dev
   git clone https://github.com/TahaNaqv/blockchain-dapp-lab.git
   ```
   ```bash
   # macOS / Linux / Git Bash
   mkdir -p ~/dev && cd ~/dev
   git clone https://github.com/TahaNaqv/blockchain-dapp-lab.git
   ```
   Later, to get updates: `cd blockchain-dapp-lab` → `git pull`.
2. VS Code → **File → Open Folder…** → select **`blockchain-dapp-lab/session/hardhat-lab`** → *Yes, I trust the authors*.
3. Open the terminal (`` Ctrl+` ``) and run:
   ```bash
   npm install
   npx hardhat test
   ```
4. ✅ Success looks like:
   ```
   Running Solidity tests
     test/Reentrancy.t.sol:ReentrancyTest
       ✔ test_SafeBankBlocksTheAttack()
       ...
   14 passing (7 solidity, 7 mocha)
   ```
   The first `npx hardhat test` also downloads the Solidity compiler (one time).

### Messages you can safely ignore
| You see | Meaning |
|---|---|
| `npm warn install-scripts … esbuild … not yet covered by allowScripts` | Newer npm versions ask before running install scripts. Not needed for our project — ignore. |
| `N high severity vulnerabilities … run npm audit fix --force` | Reports about development-only packages. **Do NOT run `npm audit fix --force`** — it can install incompatible versions and break the project. |
| `npm warn deprecated …` | An indirect dependency is old. Harmless. |
| `Downloading solc 0.8.28` | Hardhat fetching the compiler the first time. |

---

## 5. Create your OWN Hardhat project from scratch (how every real project starts)

```bash
mkdir my-first-dapp
cd my-first-dapp
npx hardhat --init
```
- npx may ask **"Need to install the following packages: hardhat@3.x.x — Ok to proceed? (y)"** → press **y**.
- Hardhat's prompts (verified):
  1. **"Where would you like to initialize the project?"** → press **Enter** (`.` = this folder)
  2. **"What type of project would you like to initialize?"** → choose with the arrow keys:
     - `node-test-runner-viem` — the default (viem library + Node's test runner)
     - **`mocha-ethers`** — ethers.js + Mocha/Chai — **the same stack we use in class** ✅
     - `minimal` — empty project
  3. **"You need to install the necessary dependencies… Do you want to run it now? (Y/n)"** → **Enter** (yes)
- One-line, no-prompt version: `npx hardhat --init --template mocha-ethers`

Then:
```bash
npx hardhat test                               # template's sample tests -> "5 passing (3 solidity, 2 mocha)"
npm install --save-dev @openzeppelin/contracts # the audited contract library (ERC-20, Ownable, ...)
npx hardhat build
```
What you got: `contracts/` (Solidity + `.t.sol` tests), `test/` (TypeScript tests), `ignition/modules/` (deployments),
`scripts/`, `hardhat.config.ts`, `package.json`.

---

## 6. Connect Hardhat to Sepolia (your key, stored safely)

Our project's `hardhat.config.ts` already defines a `sepolia` network. It needs your practice wallet's private key:

1. **Export the key from MetaMask** (official steps): account selector at the top → **⋮** next to your account → **Account details** →
   **Private key** → enter your MetaMask password → **press and hold "Hold to reveal Private Key"** → copy → **Done**.
2. Store it **encrypted** in Hardhat's keystore:
   ```bash
   npx hardhat keystore set SEPOLIA_PRIVATE_KEY
   ```
   First time: create a **keystore password** (remember it!) → then paste the key (with or without `0x`).
   Check: `npx hardhat keystore list` → shows `SEPOLIA_PRIVATE_KEY`.
   The keystore is **shared by all your Hardhat projects** (session labs and `dapp/`), so you set each key once. `--force` replaces it.
3. From now on, Sepolia commands ask for your keystore password. Example (Lab 2 of the session):
   ```bash
   npx hardhat ignition deploy ignition/modules/HelloBlockchain.ts --network sepolia --parameters ignition/parameters.json
   ```
   → keystore password → **"Confirm deploy to network sepolia (11155111)? y"**.

🔐 **Rules professionals follow:** never paste a key into code, `hardhat.config.ts`, GitHub or chat. Bots scan GitHub for leaked keys
within seconds. Use a separate wallet for development that never holds real money.

---

## 6b. Extra tools for the take-home assignment (full-stack DApp)

| Tool | Why | Get it |
|---|---|---|
| **PostgreSQL** (choose one) | The backend's database | **Docker Desktop** (docker.com → then `npm run db:up` in `dapp/`) **or** a free cloud database at **neon.tech** (no install — copy the connection string) |
| **Alchemy** account | RPC URL + webhooks | Follow **[03-alchemy.md](03-alchemy.md)** |
| **ngrok** | Lets Alchemy reach your laptop's backend | ngrok.com → sign up → install → `ngrok config add-authtoken <token>` |
| **Git + GitHub** account | Submit your repo; CI runs there | git-scm.com · github.com |

Windows + Docker Desktop needs **WSL 2** (Docker's installer offers to enable it; a restart may be required). If Docker is painful on your laptop,
use Neon — the code is identical, only `DATABASE_URL` changes.

## 7. ✅ Final checklist — bring this to class

| Check | Command / place | Expected |
|---|---|---|
| Node | `node -v` | v22.13+ (even: 22, 24, 26) |
| npm | `npm -v` | any recent (10+) |
| VS Code + Solidity extension | Extensions panel | "Solidity" by Nomic Foundation installed |
| Session project | `npx hardhat test` in `session/hardhat-lab` | **14 passing** |
| MetaMask | network menu | **Sepolia** selected |
| Test ETH | MetaMask on Sepolia | **~0.05 SepoliaETH** |
| *(optional)* own project | `npx hardhat --init --template mocha-ethers` | 5 passing |
| Keystore (recommended before class) | `npx hardhat keystore list` | `SEPOLIA_PRIVATE_KEY` |

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `'node' / 'npm' / 'npx' is not recognized` (Windows) | Close **all** terminals and VS Code, reopen. Still failing → restart PC → reinstall Node with "Add to PATH". |
| `command not found: node` (macOS/Linux with nvm) | Reopen the terminal, or run `source ~/.bashrc` / `source ~/.zshrc`, then `nvm use --lts`. |
| `running scripts is disabled on this system` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` → Y (or use Command Prompt / Git Bash). |
| `Please upgrade to Node.js 22.13.0 or later` | Old Node. Install the LTS from nodejs.org (or `nvm install --lts`). Check `node -v` again in a new terminal. |
| `npm warn EBADENGINE` | Same cause — Node too old. |
| `EACCES: permission denied` (macOS/Linux) | You used `sudo` or a system Node. Install Node with nvm; never `sudo npm`. Fix a broken folder: `sudo chown -R $(whoami) ~/.npm`. |
| `EPERM: operation not permitted` / random file-lock errors (Windows) | Project is inside OneDrive or antivirus is scanning → move it to `C:\dev`, close other editors, retry. |
| Errors mentioning `VCRUNTIME140.dll` / `edr` / "native module" (Windows) | Install/repair the **Visual C++ Redistributable**: https://aka.ms/vs/17/release/vc_redist.x64.exe |
| `npm install` hangs or `ETIMEDOUT` / `ECONNRESET` | Bad network → switch to mobile hotspot / home Wi-Fi; retry `npm install`. Behind a proxy: `npm config set proxy http://host:port`. |
| `HHE11: …not in an interactive shell` on `--init` | Run it in a normal terminal, or use `npx hardhat --init --template mocha-ethers`. |
| `HHE7: Configuration Variable "SEPOLIA_PRIVATE_KEY" not found` | Do section 6 (keystore). |
| `HHE33: Invalid private key value` | Pasted wrong/partial key → `npx hardhat keystore set SEPOLIA_PRIVATE_KEY --force`. |
| Forgot keystore password | `npx hardhat keystore path` shows the file → delete it → set the key again. |
| `npm install` fails with `spawn git ENOENT` / git errors | Git isn't installed (or the terminal was opened before installing it). Install Git, reopen the terminal. |
| `ENOSPC: System limit for number of file watchers reached` (Linux) | `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf && sudo sysctl -p` |
| VS Code shows red squiggles on `import "@openzeppelin/..."` | Run `npm install` first; open the **project folder** (not a parent folder) in VS Code; reload window (`Ctrl+Shift+P` → *Reload Window*). |
| Faucet says limit reached / captcha loop | One claim per account per day; try later from home Wi-Fi, or use the class backup form. |
| Apple Silicon (M1/M2/M3) issues | Use the native Node installer/nvm (not Rosetta). `node -p process.arch` should print `arm64`. |

---

## 9. Command cheat-sheet

```bash
npx hardhat --help                    # all tasks
npx hardhat build                     # compile contracts
npx hardhat test                      # all tests  (test solidity | test mocha)
npx hardhat test --coverage           # test coverage report
npx hardhat keystore set NAME         # store a secret (encrypted)
npx hardhat ignition deploy ignition/modules/X.ts --network sepolia [--parameters ignition/parameters.json]
npx hardhat run scripts/x.ts --network sepolia
npx hardhat clean                     # delete build artifacts/cache
```

## 10. Official sources
- Hardhat 3 getting started — https://hardhat.org/docs/getting-started · Node.js support policy — https://hardhat.org/docs/reference/nodejs-support
- Hardhat tutorial setup (Windows C++ note) — https://hardhat.org/docs/tutorial/setup
- Hardhat VS Code extension — https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity
- Node.js downloads & release schedule — https://nodejs.org · https://nodejs.org/about/releases/
- nvm — https://github.com/nvm-sh/nvm · Windows Node setup (Microsoft) — https://learn.microsoft.com/windows/dev-environment/javascript/nodejs-on-windows
- MetaMask: show test networks — https://support.metamask.io/configure/networks/how-to-view-testnets-in-metamask/ ·
  export private key — https://support.metamask.io/configure/accounts/how-to-export-an-accounts-private-key/
- Google Cloud Web3 Sepolia faucet — https://cloud.google.com/application/web3/faucet/ethereum/sepolia
