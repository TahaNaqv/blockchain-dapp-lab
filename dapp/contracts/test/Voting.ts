// TypeScript tests: how the backend/frontend experience the contract (events, custom errors, roles).
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("Voting", function () {
  async function deployFixture() {
    const [admin, ali, sara] = await ethers.getSigners();
    const voting = await ethers.deployContract("Voting", [admin.address]);
    const now = await networkHelpers.time.latest();
    await voting.createElection("Best use-case?", ["Remittances", "Land records", "Digital ID"], now, now + 3600, false);
    return { voting, admin, ali, sara, now };
  }

  it("emits ElectionCreated with all the data the indexer needs", async function () {
    const { voting } = await networkHelpers.loadFixture(deployFixture);
    const now = await networkHelpers.time.latest();
    await expect(voting.createElection("Second", ["A", "B"], now, now + 100, true))
      .to.emit(voting, "ElectionCreated")
      .withArgs(2n, (await ethers.getSigners())[0].address, "Second", ["A", "B"], BigInt(now), BigInt(now + 100), true);
  });

  it("records votes and exposes results", async function () {
    const { voting, ali, sara } = await networkHelpers.loadFixture(deployFixture);
    await expect(voting.connect(ali).vote(1, 2)).to.emit(voting, "VoteCast").withArgs(1n, ali.address, 2n);
    await voting.connect(sara).vote(1, 2);
    expect(await voting.getResults(1)).to.deep.equal([0n, 0n, 2n]);
  });

  it("rejects double votes with a decodable custom error", async function () {
    const { voting, ali } = await networkHelpers.loadFixture(deployFixture);
    await voting.connect(ali).vote(1, 0);
    await expect(voting.connect(ali).vote(1, 1)).to.be.revertedWithCustomError(voting, "AlreadyVoted").withArgs(ali.address);
  });

  it("closes voting after the end time", async function () {
    const { voting, ali } = await networkHelpers.loadFixture(deployFixture);
    await networkHelpers.time.increase(3601);
    await expect(voting.connect(ali).vote(1, 0)).to.be.revertedWithCustomError(voting, "ElectionNotActive").withArgs(1n);
  });

  it("only admins can create elections", async function () {
    const { voting, ali } = await networkHelpers.loadFixture(deployFixture);
    const now = await networkHelpers.time.latest();
    await expect(voting.connect(ali).createElection("x", ["A", "B"], now, now + 10, false)).to.be.revertedWithCustomError(
      voting,
      "AccessControlUnauthorizedAccount",
    );
  });
});
