// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ClassRoom - a small class-poll contract used in Lab 3 (testing).
/// @notice Students register (name + roll no), post to an on-chain wall, and cast ONE vote. The tests in
///         test/ClassRoom.t.sol show how to test access control, custom errors and fuzzing.
contract ClassRoom {
    struct Student {
        string name;
        string rollNo;
        uint64 joinedAt;   // block timestamp
        bool registered;
    }

    address public immutable teacher;
    string public question;
    string[] public options;
    bool public pollOpen = true;

    mapping(address => Student) public students;
    address[] public studentList;
    mapping(uint256 => uint256) public votes;      // option index => vote count
    mapping(address => bool) public hasVoted;
    uint256 public messageCount;

    event Registered(address indexed student, string name, string rollNo);
    event Posted(address indexed from, string name, string text);
    event Voted(address indexed voter, string name, uint256 indexed option);
    event PollClosed(uint256 winningOption, uint256 winningVotes);

    error NotTeacher();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyVoted();
    error PollIsClosed();
    error InvalidOption();
    error InvalidInput();

    modifier onlyTeacher() {
        if (msg.sender != teacher) revert NotTeacher();
        _;
    }

    modifier onlyRegistered() {
        if (!students[msg.sender].registered) revert NotRegistered();
        _;
    }

    /// @param _question e.g. "Best blockchain use-case for Pakistan?"
    /// @param _options  e.g. ["Remittances","Land records","Supply chain","Digital ID"]
    constructor(string memory _question, string[] memory _options) {
        if (_options.length < 2) revert InvalidInput();
        teacher = msg.sender;
        question = _question;
        for (uint256 i = 0; i < _options.length; i++) {
            options.push(_options[i]);
        }
    }

    function register(string calldata _name, string calldata _rollNo) external {
        if (students[msg.sender].registered) revert AlreadyRegistered();
        if (bytes(_name).length == 0 || bytes(_name).length > 40) revert InvalidInput();
        if (bytes(_rollNo).length > 20) revert InvalidInput();
        students[msg.sender] = Student(_name, _rollNo, uint64(block.timestamp), true);
        studentList.push(msg.sender);
        emit Registered(msg.sender, _name, _rollNo);
    }

    function post(string calldata _text) external onlyRegistered {
        if (bytes(_text).length == 0 || bytes(_text).length > 140) revert InvalidInput();
        messageCount++;
        emit Posted(msg.sender, students[msg.sender].name, _text);
    }

    function vote(uint256 _option) external onlyRegistered {
        if (!pollOpen) revert PollIsClosed();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (_option >= options.length) revert InvalidOption();
        hasVoted[msg.sender] = true;
        votes[_option]++;
        emit Voted(msg.sender, students[msg.sender].name, _option);
    }

    function closePoll() external onlyTeacher {
        if (!pollOpen) revert PollIsClosed();
        pollOpen = false;
        (uint256 w, uint256 wv) = winner();
        emit PollClosed(w, wv);
    }

    // ---------- read helpers (free) ----------
    function winner() public view returns (uint256 index, uint256 count) {
        for (uint256 i = 0; i < options.length; i++) {
            if (votes[i] > count) {
                count = votes[i];
                index = i;
            }
        }
    }

    function optionsCount() external view returns (uint256) {
        return options.length;
    }

    function studentCount() external view returns (uint256) {
        return studentList.length;
    }

    function results() external view returns (string[] memory names, uint256[] memory counts) {
        names = options;
        counts = new uint256[](options.length);
        for (uint256 i = 0; i < options.length; i++) {
            counts[i] = votes[i];
        }
    }
}
