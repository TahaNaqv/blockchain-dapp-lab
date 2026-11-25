import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    sepolia: {
      type: "http",
      chainType: "l1",
      // Your Alchemy URL: npx hardhat keystore set SEPOLIA_RPC_URL  (https://eth-sepolia.g.alchemy.com/v2/<KEY>)
      url: configVariable("SEPOLIA_RPC_URL"),
      // Your PRACTICE wallet key: npx hardhat keystore set SEPOLIA_PRIVATE_KEY
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
