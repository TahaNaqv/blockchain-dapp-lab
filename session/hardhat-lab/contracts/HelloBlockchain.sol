// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HelloBlockchain - Lab 3 warm-up (your first smart contract)
/// @notice Shows: state variables, constructor, view vs. write functions,
///         msg.sender, events, and require().
contract HelloBlockchain {
    // ---- State: stored permanently on-chain (costs gas to change) ----
    string public message;          // `public` auto-creates a getter
    address public lastUpdatedBy;   // who changed it last
    uint256 public updateCount;     // how many times it changed

    // ---- Events: cheap logs that apps / explorers can listen to ----
    event MessageChanged(address indexed by, string oldMessage, string newMessage);

    // Runs ONCE, at deployment time
    constructor(string memory _initialMessage) {
        message = _initialMessage;
        lastUpdatedBy = msg.sender;
    }

    // WRITE function: changes state -> needs a transaction -> costs gas
    function setMessage(string calldata _newMessage) external {
        require(bytes(_newMessage).length > 0, "Message cannot be empty");
        emit MessageChanged(msg.sender, message, _newMessage);
        message = _newMessage;
        lastUpdatedBy = msg.sender;
        updateCount += 1;
    }

    // VIEW function: only reads -> free when called from outside (no tx)
    function whoAmI() external view returns (address) {
        return msg.sender;
    }
}
