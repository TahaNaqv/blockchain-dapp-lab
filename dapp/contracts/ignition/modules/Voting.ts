import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploys Voting with the deployer as admin (DEFAULT_ADMIN, ELECTION_ADMIN and PAUSER roles).
export default buildModule("VotingModule", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));
  const voting = m.contract("Voting", [admin]);
  return { voting };
});
