// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Comes from npm: node_modules/@openzeppelin/contracts (audited, industry-standard library).
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title FastToken - Lab 4: launch your own cryptocurrency in ~10 lines
/// @notice A standard ERC-20 token. Wallets & exchanges understand it automatically
///         because it follows the ERC-20 interface (balanceOf, transfer, approve...).
contract FastToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10 ** 18;

    /// @param name_   e.g. "Ali Coin"
    /// @param symbol_ e.g. "ALI"  (3-5 capital letters)
    constructor(string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {
        // 1,000 tokens to the deployer. 18 decimals => 1 token = 10^18 smallest units
        _mint(msg.sender, 1_000 * 10 ** decimals());
    }

    /// @notice Only the owner can create new tokens, and never beyond MAX_SUPPLY.
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
}
