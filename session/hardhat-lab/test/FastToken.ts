// TypeScript test for our ERC-20 token.   Run:  npx hardhat test mocha
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("FastToken (ERC-20)", function () {
  async function deployTokenFixture() {
    const [owner, ali, sara] = await ethers.getSigners();
    const token = await ethers.deployContract("FastToken", ["Fast Coin", "FAST"]);
    return { token, owner, ali, sara };
  }

  it("mints 1,000 tokens (18 decimals) to the deployer", async function () {
    const { token, owner } = await networkHelpers.loadFixture(deployTokenFixture);
    expect(await token.decimals()).to.equal(18n);
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000", 18));
  });

  it("transfers tokens and emits Transfer", async function () {
    const { token, owner, ali } = await networkHelpers.loadFixture(deployTokenFixture);
    const fifty = ethers.parseUnits("50", 18);
    await expect(token.transfer(ali.address, fifty))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, ali.address, fifty);
    expect(await token.balanceOf(ali.address)).to.equal(fifty);
  });

  it("only the owner can mint", async function () {
    const { token, ali } = await networkHelpers.loadFixture(deployTokenFixture);
    await expect(token.connect(ali).mint(ali.address, 1n))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
      .withArgs(ali.address);
  });

  it("cannot mint beyond MAX_SUPPLY", async function () {
    const { token, owner } = await networkHelpers.loadFixture(deployTokenFixture);
    const tooMuch = ethers.parseUnits("1000000", 18); // 1,000 already exist
    await expect(token.mint(owner.address, tooMuch)).to.be.revertedWith("Exceeds max supply");
  });
});
