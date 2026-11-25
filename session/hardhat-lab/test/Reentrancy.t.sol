// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// The DAO-hack bug, proven with tests.   Run:  npx hardhat test solidity
import {Test, console} from "forge-std/Test.sol";
import {VulnerableBank} from "../contracts/security/VulnerableBank.sol";
import {SafeBank} from "../contracts/security/SafeBank.sol";
import {Attacker} from "../contracts/security/Attacker.sol";

contract ReentrancyTest is Test {
    address ali = makeAddr("ali");
    address sara = makeAddr("sara");
    address hacker = makeAddr("hacker");

    function test_AttackerDrainsVulnerableBank() public {
        VulnerableBank bank = new VulnerableBank();
        vm.deal(ali, 5 ether);
        vm.deal(sara, 5 ether);
        vm.prank(ali);
        bank.deposit{value: 5 ether}();
        vm.prank(sara);
        bank.deposit{value: 5 ether}();

        vm.deal(hacker, 1 ether);
        vm.startPrank(hacker);
        Attacker attacker = new Attacker(address(bank));
        attacker.attack{value: 1 ether}();
        vm.stopPrank();

        console.log("re-entries:", attacker.reentries());
        console.log("loot (wei):", attacker.loot());
        assertEq(bank.bankBalance(), 0, "bank should be empty");
        assertEq(attacker.loot(), 11 ether, "attacker took everyone's money");
    }

    function test_SafeBankBlocksTheAttack() public {
        SafeBank bank = new SafeBank();
        vm.deal(ali, 10 ether);
        vm.prank(ali);
        bank.deposit{value: 10 ether}();

        vm.deal(hacker, 1 ether);
        vm.startPrank(hacker);
        Attacker attacker = new Attacker(address(bank));
        vm.expectRevert(bytes("Transfer failed")); // the re-entrant call hits the lock -> whole tx reverts
        attacker.attack{value: 1 ether}();
        vm.stopPrank();

        assertEq(bank.bankBalance(), 10 ether, "funds are safe");
    }
}
