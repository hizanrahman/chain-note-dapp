// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title ChainNote — a public, shared message on Ethereum
/// @notice Anyone may replace the message. Never publish secrets here.
contract ChainNote {
    string public message;
    address public lastWriter;
    uint256 public updatedAt;
    uint256 public revision;
    event MessageUpdated(address indexed writer, string message, uint256 revision);
    error InvalidMessageLength();

    constructor() {
        message = "Hello, decentralized world!";
        lastWriter = msg.sender;
        updatedAt = block.timestamp;
    }

    /// @notice Publish a nonempty message of at most 280 UTF-8 bytes.
    function setMessage(string calldata nextMessage) external {
        uint256 length = bytes(nextMessage).length;
        if (length == 0 || length > 280) revert InvalidMessageLength();
        message = nextMessage;
        lastWriter = msg.sender;
        updatedAt = block.timestamp;
        revision++;
        emit MessageUpdated(msg.sender, nextMessage, revision);
    }

    function getNote() external view returns (string memory, address, uint256, uint256) {
        return (message, lastWriter, updatedAt, revision);
    }
}
