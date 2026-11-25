import { NavLink, Outlet } from "react-router";
import { useAccount, useStats } from "../hooks/queries";
import { useWallet } from "../wallet/WalletProvider";
import { ConnectButton } from "./ConnectButton";

export function Layout() {
  const { account, error } = useWallet();
  const { data: me } = useAccount(account);
  const { data: stats } = useStats();
  return (
    <div className="app">
      <header>
        <NavLink to="/" className="brand">
          🗳️ Voting DApp
        </NavLink>
        <nav>
          <NavLink to="/">Elections</NavLink>
          {account && <NavLink to="/me">My votes</NavLink>}
          {me?.isElectionAdmin && <NavLink to="/admin/new">New election</NavLink>}
        </nav>
        <ConnectButton />
      </header>
      {error && <p className="error banner">{error}</p>}
      <main>
        <Outlet />
      </main>
      <footer className="muted">
        {stats
          ? `${stats.elections} elections · ${stats.votes} votes · ${stats.uniqueVoters} voters · indexed to block ${stats.sync.lastConfirmedBlock}${stats.sync.lagBlocks !== null ? ` (${stats.sync.lagBlocks} behind head)` : ""}`
          : "connecting to backend…"}
      </footer>
    </div>
  );
}
