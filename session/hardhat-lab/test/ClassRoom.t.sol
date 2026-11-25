// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Solidity test (Foundry-compatible syntax) - runs inside the EVM, very fast.
// Run:  npx hardhat test solidity
import {Test} from "forge-std/Test.sol";
import {ClassRoom} from "../contracts/ClassRoom.sol";

contract ClassRoomTest is Test {
    ClassRoom room;
    address teacher = makeAddr("teacher");
    address ali = makeAddr("ali");
    address sara = makeAddr("sara");

    function setUp() public {
        string[] memory opts = new string[](3);
        opts[0] = "Remittances"; opts[1] = "Land records"; opts[2] = "Digital ID";
        vm.prank(teacher);                       // next call comes from `teacher`
        room = new ClassRoom("Best use-case?", opts);
    }

    function test_RegisterAndVote() public {
        vm.prank(ali);
        room.register("Ali", "22I-1234");
        vm.prank(ali);
        room.vote(0);
        assertEq(room.votes(0), 1);
        assertTrue(room.hasVoted(ali));
    }

    function test_CannotVoteTwice() public {
        vm.startPrank(ali);
        room.register("Ali", "22I-1234");
        room.vote(1);
        vm.expectRevert(ClassRoom.AlreadyVoted.selector);
        room.vote(2);
        vm.stopPrank();
    }

    function test_MustRegisterFirst() public {
        vm.prank(sara);
        vm.expectRevert(ClassRoom.NotRegistered.selector);
        room.vote(0);
    }

    function test_OnlyTeacherClosesPoll() public {
        vm.prank(ali);
        vm.expectRevert(ClassRoom.NotTeacher.selector);
        room.closePoll();

        vm.prank(teacher);
        room.closePoll();
        assertFalse(room.pollOpen());
    }

    /// Fuzz test: Hardhat runs this with hundreds of random `option` values
    function testFuzz_InvalidOptionReverts(uint256 option) public {
        vm.assume(option >= 3);
        vm.startPrank(ali);
        room.register("Ali", "22I-1234");
        vm.expectRevert(ClassRoom.InvalidOption.selector);
        room.vote(option);
        vm.stopPrank();
    }

    // 🧪 YOUR TURN: write test_PostRequiresRegistration()
}
