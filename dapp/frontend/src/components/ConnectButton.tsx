import { useWallet } from "../wallet/WalletProvider";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function ConnectButton() {
  const { hasWallet, account, chainOk, connecting, connect, switchChain } = useWallet();
  if (!hasWallet)
    return (
      <a className="button" href="https://metamask.io" target="_blank" rel="noreferrer">
        Install MetaMask
      </a>
    );
  if (!account)
    return (
      <button onClick={() => void connect()} disabled={connecting}>
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  if (!chainOk)
    return (
      <button className="warn" onClick={() => void switchChain()}>
        Switch to Sepolia
      </button>
    );
  return <span className="badge badge-active">● {short(account)}</span>;
}
