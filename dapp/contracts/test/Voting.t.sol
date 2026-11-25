// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Voting} from "../contracts/Voting.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract VotingTest is Test {
    Voting voting;
    address admin = makeAddr("admin");
    address ali = makeAddr("ali");
    address sara = makeAddr("sara");
    address mallory = makeAddr("mallory");

    function setUp() public {
        vm.warp(1_000_000);
        voting = new Voting(admin);
    }

    function _options() internal pure returns (string[] memory o) {
        o = new string[](3);
        o[0] = "Remittances";
        o[1] = "Land records";
        o[2] = "Digital ID";
    }

    function _open() internal returns (uint256 id) {
        vm.prank(admin);
        id = voting.createElection("Best use-case?", _options(), uint64(block.timestamp), uint64(block.timestamp + 1 days), false);
    }

    function _allowlist() internal returns (uint256 id) {
        vm.prank(admin);
        id = voting.createElection("Society president", _options(), uint64(block.timestamp), uint64(block.timestamp + 1 days), true);
    }

    // ---------------------------------------------------------------- create
    function test_CreateElectionStoresEverything() public {
        uint256 id = _open();
        assertEq(id, 1);
        Voting.Election memory e = voting.getElection(id);
        assertEq(e.title, "Best use-case?");
        assertEq(e.optionCount, 3);
        assertEq(e.creator, admin);
        assertEq(voting.getOptions(id)[2], "Digital ID");
    }

    function test_OnlyAdminCreates() public {
        bytes32 role = voting.ELECTION_ADMIN_ROLE(); // read BEFORE vm.prank - prank applies to the next call only
        vm.prank(mallory);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, mallory, role));
        voting.createElection("x", _options(), uint64(block.timestamp), uint64(block.timestamp + 1), false);
    }

    function test_RejectsBadInput() public {
        string[] memory one = new string[](1);
        one[0] = "only";
        vm.startPrank(admin);
        vm.expectRevert(Voting.InvalidTitle.selector);
        voting.createElection("", _options(), 0, uint64(block.timestamp + 1), false);
        vm.expectRevert(Voting.InvalidOptions.selector);
        voting.createElection("t", one, 0, uint64(block.timestamp + 1), false);
        vm.expectRevert(Voting.InvalidTimes.selector);
        voting.createElection("t", _options(), uint64(block.timestamp + 10), uint64(block.timestamp + 5), false);
        vm.expectRevert(Voting.InvalidTimes.selector);
        voting.createElection("t", _options(), 0, uint64(block.timestamp - 1), false);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- vote
    function test_VoteCountsOnce() public {
        uint256 id = _open();
        vm.prank(ali);
        voting.vote(id, 1);
        vm.prank(sara);
        voting.vote(id, 1);
        assertEq(voting.getResults(id)[1], 2);
        assertEq(voting.getElection(id).totalVotes, 2);

        vm.prank(ali);
        vm.expectRevert(abi.encodeWithSelector(Voting.AlreadyVoted.selector, ali));
        voting.vote(id, 0);
    }

    function test_VoteEmitsEvent() public {
        uint256 id = _open();
        vm.expectEmit(true, true, true, true);
        emit Voting.VoteCast(id, ali, 2);
        vm.prank(ali);
        voting.vote(id, 2);
    }

    function test_CannotVoteOutsideWindow() public {
        vm.prank(admin);
        uint256 id = voting.createElection("Later", _options(), uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours), false);
        vm.prank(ali);
        vm.expectRevert(abi.encodeWithSelector(Voting.ElectionNotActive.selector, id));
        voting.vote(id, 0);

        vm.warp(block.timestamp + 2 hours); // ended
        vm.prank(ali);
        vm.expectRevert(abi.encodeWithSelector(Voting.ElectionNotActive.selector, id));
        voting.vote(id, 0);
    }

    function test_UnknownElectionReverts() public {
        vm.expectRevert(abi.encodeWithSelector(Voting.ElectionNotFound.selector, 42));
        voting.vote(42, 0);
    }

    // ---------------------------------------------------------------- allowlist
    function test_AllowlistOnlyRegisteredVote() public {
        uint256 id = _allowlist();
        vm.prank(ali);
        vm.expectRevert(abi.encodeWithSelector(Voting.NotEligible.selector, ali));
        voting.vote(id, 0);

        address[] memory voters = new address[](1);
        voters[0] = ali;
        vm.prank(admin);
        voting.registerVoters(id, voters);
        assertTrue(voting.canVote(id, ali));
        vm.prank(ali);
        voting.vote(id, 0);
        assertFalse(voting.canVote(id, ali));
    }

    function test_RegisterOnOpenElectionReverts() public {
        uint256 id = _open();
        address[] memory voters = new address[](1);
        voters[0] = ali;
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Voting.NotAllowlistElection.selector, id));
        voting.registerVoters(id, voters);
    }

    // ---------------------------------------------------------------- cancel / pause
    function test_CancelledElectionRejectsVotes() public {
        uint256 id = _open();
        vm.prank(admin);
        voting.cancelElection(id);
        vm.prank(ali);
        vm.expectRevert(abi.encodeWithSelector(Voting.ElectionIsCancelled.selector, id));
        voting.vote(id, 0);
    }

    function test_PauseStopsVoting() public {
        uint256 id = _open();
        vm.prank(admin);
        voting.pause();
        vm.prank(ali);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        voting.vote(id, 0);
        vm.prank(admin);
        voting.unpause();
        vm.prank(ali);
        voting.vote(id, 0);
    }

    // ---------------------------------------------------------------- fuzz
    function testFuzz_InvalidOptionAlwaysReverts(uint8 option) public {
        uint256 id = _open();
        vm.assume(option >= 3);
        vm.prank(ali);
        vm.expectRevert(abi.encodeWithSelector(Voting.InvalidOption.selector, option));
        voting.vote(id, option);
    }

    function testFuzz_TotalVotesEqualsSumOfResults(uint8 voters) public {
        uint256 id = _open();
        uint256 n = bound(voters, 1, 50);
        for (uint256 i = 0; i < n; i++) {
            vm.prank(address(uint160(0x1000 + i)));
            voting.vote(id, uint8(i % 3));
        }
        uint256[] memory r = voting.getResults(id);
        assertEq(r[0] + r[1] + r[2], voting.getElection(id).totalVotes);
        assertEq(voting.getElection(id).totalVotes, n);
    }
}
