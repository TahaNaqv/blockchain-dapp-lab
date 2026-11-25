import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.28",
  },
  networks: {
    // Ethereum's public test network. Every deploy/transaction is visible on https://sepolia.etherscan.io
    //   Private key of your PRACTICE MetaMask wallet (never a real one):
    //     npx hardhat keystore set SEPOLIA_PRIVATE_KEY     (recommended - stored encrypted)
    //   or as an environment variable SEPOLIA_PRIVATE_KEY.
    //   RPC: a free public endpoint by default; override with env var SEPOLIA_RPC_URL if it is slow.
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
  // Note: `npx hardhat test` runs on Hardhat's built-in in-memory simulator (no node, no network) -
  // tests should never spend testnet ETH or wait for real blocks.
});
