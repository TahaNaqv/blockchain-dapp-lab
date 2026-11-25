// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VulnerableBank - DO NOT USE. Demonstrates the re-entrancy bug
///        (the same class of bug behind the 2016 DAO hack, ~3.6M ETH).
contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        // BUG: we send ETH *before* updating the balance.
        // If msg.sender is a contract, its receive() runs HERE and can call withdraw() again.
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");

        balances[msg.sender] = 0; // too late!
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
