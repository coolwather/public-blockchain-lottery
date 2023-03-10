import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lottery", function () {
  async function deploy() {
    const [manager, player1, player2] = await ethers.getSigners();

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy();

    return { lottery, manager, player1, player2 };
  }

  describe("Deployment", function () {
    it("Should be deployed", async function () {
      const { lottery, manager } = await deploy();

      expect(await lottery.getManager()).to.equal(manager.address);
    });
  });
});
