// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title Voting - on-chain elections with optional voter allowlists.
/// @notice Election admins create elections with a fixed set of options and a voting window.
///         Open elections: any address may vote once. Allowlist elections: only registered voters.
///         Every state change emits an event so off-chain indexers (our backend) can rebuild the full state.
contract Voting is AccessControl, Pausable {
    bytes32 public constant ELECTION_ADMIN_ROLE = keccak256("ELECTION_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant MAX_OPTIONS = 10;
    uint256 public constant MAX_BATCH = 200;

    struct Election {
        string title;
        uint64 startTime;
        uint64 endTime;
        bool allowlistOnly;
        bool cancelled;
        uint8 optionCount;
        uint32 totalVotes;
        address creator;
    }

    uint256 public electionCount;
    mapping(uint256 => Election) private _elections;
    mapping(uint256 => string[]) private _options;
    mapping(uint256 => mapping(uint256 => uint256)) private _votes; // electionId => option => count
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public isRegisteredVoter;

    event ElectionCreated(
        uint256 indexed electionId,
        address indexed creator,
        string title,
        string[] options,
        uint64 startTime,
        uint64 endTime,
        bool allowlistOnly
    );
    event VotersRegistered(uint256 indexed electionId, address[] voters);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint8 indexed option);
    event ElectionCancelled(uint256 indexed electionId);

    error InvalidTitle();
    error InvalidOptions();
    error InvalidTimes();
    error ElectionNotFound(uint256 electionId);
    error ElectionNotActive(uint256 electionId);
    error ElectionAlreadyEnded(uint256 electionId);
    error ElectionIsCancelled(uint256 electionId);
    error NotAllowlistElection(uint256 electionId);
    error NotEligible(address voter);
    error AlreadyVoted(address voter);
    error InvalidOption(uint8 option);
    error BatchTooLarge();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ELECTION_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ------------------------------------------------------------------ admin

    function createElection(
        string calldata title,
        string[] calldata options,
        uint64 startTime,
        uint64 endTime,
        bool allowlistOnly
    ) external onlyRole(ELECTION_ADMIN_ROLE) whenNotPaused returns (uint256 electionId) {
        uint256 titleLen = bytes(title).length;
        if (titleLen == 0 || titleLen > 120) revert InvalidTitle();
        if (options.length < 2 || options.length > MAX_OPTIONS) revert InvalidOptions();
        for (uint256 i = 0; i < options.length; i++) {
            uint256 len = bytes(options[i]).length;
            if (len == 0 || len > 60) revert InvalidOptions();
        }
        if (endTime <= startTime || endTime <= block.timestamp) revert InvalidTimes();

        electionId = ++electionCount; // ids start at 1
        _elections[electionId] = Election({
            title: title,
            startTime: startTime,
            endTime: endTime,
            allowlistOnly: allowlistOnly,
            cancelled: false,
            optionCount: uint8(options.length),
            totalVotes: 0,
            creator: msg.sender
        });
        for (uint256 i = 0; i < options.length; i++) _options[electionId].push(options[i]);

        emit ElectionCreated(electionId, msg.sender, title, options, startTime, endTime, allowlistOnly);
    }

    function registerVoters(uint256 electionId, address[] calldata voters) external onlyRole(ELECTION_ADMIN_ROLE) {
        Election storage e = _get(electionId);
        if (!e.allowlistOnly) revert NotAllowlistElection(electionId);
        if (e.cancelled) revert ElectionIsCancelled(electionId);
        if (block.timestamp >= e.endTime) revert ElectionAlreadyEnded(electionId);
        if (voters.length == 0 || voters.length > MAX_BATCH) revert BatchTooLarge();
        for (uint256 i = 0; i < voters.length; i++) isRegisteredVoter[electionId][voters[i]] = true;
        emit VotersRegistered(electionId, voters);
    }

    function cancelElection(uint256 electionId) external onlyRole(ELECTION_ADMIN_ROLE) {
        Election storage e = _get(electionId);
        if (e.cancelled) revert ElectionIsCancelled(electionId);
        if (block.timestamp >= e.endTime) revert ElectionAlreadyEnded(electionId);
        e.cancelled = true;
        emit ElectionCancelled(electionId);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ------------------------------------------------------------------ voting

    function vote(uint256 electionId, uint8 option) external whenNotPaused {
        Election storage e = _get(electionId);
        if (e.cancelled) revert ElectionIsCancelled(electionId);
        if (block.timestamp < e.startTime || block.timestamp >= e.endTime) revert ElectionNotActive(electionId);
        if (option >= e.optionCount) revert InvalidOption(option);
        if (e.allowlistOnly && !isRegisteredVoter[electionId][msg.sender]) revert NotEligible(msg.sender);
        if (hasVoted[electionId][msg.sender]) revert AlreadyVoted(msg.sender);

        hasVoted[electionId][msg.sender] = true;
        _votes[electionId][option] += 1;
        e.totalVotes += 1;
        emit VoteCast(electionId, msg.sender, option);
    }

    // ------------------------------------------------------------------ views

    function getElection(uint256 electionId) external view returns (Election memory) {
        return _get(electionId);
    }

    function getOptions(uint256 electionId) external view returns (string[] memory) {
        _get(electionId);
        return _options[electionId];
    }

    function getResults(uint256 electionId) external view returns (uint256[] memory counts) {
        Election storage e = _get(electionId);
        counts = new uint256[](e.optionCount);
        for (uint256 i = 0; i < e.optionCount; i++) counts[i] = _votes[electionId][i];
    }

    function canVote(uint256 electionId, address voter) external view returns (bool) {
        Election storage e = _get(electionId);
        return !paused() && !e.cancelled && block.timestamp >= e.startTime && block.timestamp < e.endTime
            && !hasVoted[electionId][voter] && (!e.allowlistOnly || isRegisteredVoter[electionId][voter]);
    }

    function _get(uint256 electionId) private view returns (Election storage e) {
        e = _elections[electionId];
        if (e.optionCount == 0) revert ElectionNotFound(electionId);
    }
}
