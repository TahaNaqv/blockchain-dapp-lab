// ⚙️  The ONE place to rename things when you turn the starter into your own DApp.
export const CONTRACT_NAME = "Voting"; // name of your contract (file contracts/<Name>.sol, `contract <Name>`)
export const IGNITION_MODULE = "VotingModule"; // buildModule("<this>", ...) in ignition/modules/<Name>.ts

// Events from OpenZeppelin base contracts that the backend does NOT need to index.
export const IGNORED_EVENTS = ["RoleGranted", "RoleRevoked", "RoleAdminChanged", "Paused", "Unpaused", "OwnershipTransferred"];
