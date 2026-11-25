import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// npx hardhat ignition deploy ignition/modules/FastToken.ts --network localhost
// Custom name/symbol:  add  --parameters ignition/parameters.json
export default buildModule("FastTokenModule", (m) => {
  const name = m.getParameter("name", "Fast Coin");
  const symbol = m.getParameter("symbol", "FAST");
  const token = m.contract("FastToken", [name, symbol]);
  return { token };
});
