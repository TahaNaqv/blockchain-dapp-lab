// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SafeBank - the fix: Checks-Effects-Interactions + a re-entrancy guard
contract SafeBank {
    mapping(address => uint256) public balances;
    bool private locked;

    modifier nonReentrant() {
        require(!locked, "No re-entrancy");
        locked = true;
        _;
        locked = false;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];          // 1. CHECKS
        require(amount > 0, "Nothing to withdraw");

        balances[msg.sender] = 0;                       // 2. EFFECTS (update state first)

        (bool ok, ) = msg.sender.call{value: amount}(""); // 3. INTERACTIONS (external call last)
        require(ok, "Transfer failed");
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
