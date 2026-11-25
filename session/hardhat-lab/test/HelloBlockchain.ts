// TypeScript test (Mocha + ethers + chai) - tests the contract "from the outside", like a DApp would.
// Run:  npx hardhat test mocha
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("HelloBlockchain", function () {
  // Fixture: deploy once, snapshot, and restore before each test (fast & isolated)
  async function deployHelloFixture() {
    const [owner, ali, sara] = await ethers.getSigners();
    const hello = await ethers.deployContract("HelloBlockchain", ["Hello FAST"]);
    return { hello, owner, ali, sara };
  }

  it("stores the initial message and deployer", async function () {
    const { hello, owner } = await networkHelpers.loadFixture(deployHelloFixture);
    expect(await hello.message()).to.equal("Hello FAST");
    expect(await hello.lastUpdatedBy()).to.equal(owner.address);
  });

  it("lets anyone update the message and emits an event", async function () {
    const { hello, ali } = await networkHelpers.loadFixture(deployHelloFixture);
    await expect(hello.connect(ali).setMessage("Hi from Ali"))
      .to.emit(hello, "MessageChanged")
      .withArgs(ali.address, "Hello FAST", "Hi from Ali");
    expect(await hello.message()).to.equal("Hi from Ali");
    expect(await hello.updateCount()).to.equal(1n);
  });

  it("reverts on an empty message", async function () {
    const { hello } = await networkHelpers.loadFixture(deployHelloFixture);
    await expect(hello.setMessage("")).to.be.revertedWith("Message cannot be empty");
  });

  // 🧪 YOUR TURN: write a test that checks whoAmI() returns the caller's address
  //    when called by `sara`.  Hint: hello.connect(sara).whoAmI()
});
