import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// npx hardhat ignition deploy ignition/modules/HelloBlockchain.ts --network localhost
export default buildModule("HelloBlockchainModule", (m) => {
  const initialMessage = m.getParameter("initialMessage", "Hello FAST");
  const hello = m.contract("HelloBlockchain", [initialMessage]);
  return { hello };
});
