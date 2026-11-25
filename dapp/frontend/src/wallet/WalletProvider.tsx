// Wallet state for the whole app: account, network, signer. MetaMask (EIP-1193) only - no private keys in the frontend.
import { BrowserProvider, type Eip1193Provider, type JsonRpcSigner } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CHAIN_ID } from "../generated/contract";

type EthereumProvider = Eip1193Provider & {
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const CHAIN_HEX = "0x" + CHAIN_ID.toString(16);

interface WalletState {
  hasWallet: boolean;
  account?: string;
  chainOk: boolean;
  connecting: boolean;
  error?: string;
  connect: () => Promise<void>;
  switchChain: () => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const eth = typeof window !== "undefined" ? window.ethereum : undefined;
  const [account, setAccount] = useState<string>();
  const [chainId, setChainId] = useState<string>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();

  // Restore an already-authorized session silently (no popup) and follow account/network changes.
  useEffect(() => {
    if (!eth) return;
    void eth.request({ method: "eth_accounts" }).then((a) => setAccount((a as string[])[0]?.toLowerCase()));
    void eth.request({ method: "eth_chainId" }).then((c) => setChainId(String(c).toLowerCase()));
    const onAccounts = (a: string[]) => setAccount(a[0]?.toLowerCase());
    const onChain = (c: string) => setChainId(c.toLowerCase());
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [eth]);

  const switchChain = useCallback(async () => {
    if (!eth) return;
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  }, [eth]);

  const connect = useCallback(async () => {
    if (!eth) {
      setError("MetaMask not found. Install it from metamask.io.");
      return;
    }
    setConnecting(true);
    setError(undefined);
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accounts[0]?.toLowerCase());
      if ((await eth.request({ method: "eth_chainId" })) !== CHAIN_HEX) await switchChain();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Could not connect");
    } finally {
      setConnecting(false);
    }
  }, [eth, switchChain]);

  const getSigner = useCallback(async () => {
    if (!eth) throw new Error("MetaMask not found");
    return new BrowserProvider(eth).getSigner();
  }, [eth]);

  const value = useMemo<WalletState>(
    () => ({ hasWallet: !!eth, account, chainOk: chainId === CHAIN_HEX, connecting, error, connect, switchChain, getSigner }),
    [eth, account, chainId, connecting, error, connect, switchChain, getSigner],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
