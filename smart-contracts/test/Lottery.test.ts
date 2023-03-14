import { expect } from "chai";
import { ethers } from "hardhat";

const entranceValue = 1000000000000000;
const wrongEntranceValue = 1000000000000001;

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

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

  describe("Add game", () => {
    it("Should add a new game", async () => {
      const { lottery } = await deploy();

      await expect(lottery.addGame(entranceValue))
        .to.emit(lottery, "GameCreated")
        .withArgs(1);
    });

    it("Should validate that only admin can vcreate a new game", async () => {
      const { lottery, player1 } = await deploy();

      await expect(
        lottery.connect(player1).addGame(entranceValue)
      ).to.revertedWith("Lottery: Only admin");
    });

    it("Should validate the entrance value", async () => {
      const { lottery } = await deploy();

      await expect(lottery.addGame(0)).to.revertedWith(
        "Lottery: Invalid enter price value"
      );
    });
  });

  describe("Enter Game", () => {
    it("Should enter in a game", async () => {
      const { lottery, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);

      const prizePerPlayer = entranceValue - entranceValue / 10;

      await expect(
        lottery.connect(player1).enterGame(1, {
          value: entranceValue,
        })
      )
        .to.emit(lottery, "EnteredGame")
        .withArgs(1, prizePerPlayer, 1);

      await expect(
        lottery.connect(player2).enterGame(1, {
          value: entranceValue,
        })
      )
        .to.emit(lottery, "EnteredGame")
        .withArgs(1, prizePerPlayer * 2, 2);
    });
    it("Should validate the the game exists", async () => {
      const { lottery, player1 } = await deploy();

      await expect(lottery.connect(player1).enterGame(1)).to.revertedWith(
        "Lottery: Game don't exist"
      );
    });
    it("Should validate that the game wasn't raffled before", async () => {
      const { lottery, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);

      await lottery.connect(player1).enterGame(1, { value: entranceValue });

      await lottery.raffleGame(1);
      await expect(
        lottery.connect(player2).enterGame(1, { value: entranceValue })
      ).to.revertedWith("Lottery: Game already raffled");
    });
    it("Should validate the entrance value", async () => {
      const { lottery, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);

      await expect(
        lottery.connect(player1).enterGame(1, { value: entranceValue + 1 })
      ).to.revertedWith("Lottery: invalid value sent");
    });
  });
  describe("Get all games", () => {
    it("Should get all games", async () => {
      const { lottery } = await deploy();

      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);

      const games = await lottery.getAllGames();

      expect(games.length).to.equal(2);
      expect(games[0].id).to.equal(1);
      expect(games[1].id).to.equal(2);
    });
    it("Should get an empty array", async () => {
      const { lottery } = await deploy();

      const games = await lottery.getAllGames();

      expect(games).to.eql([]);
    });
  });
  describe("Get raffled games", () => {
    it("Should get all raffled games", async () => {
      const { lottery, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);

      await lottery.connect(player1).enterGame(1, { value: entranceValue });
      await lottery.connect(player2).enterGame(1, { value: entranceValue });
      await lottery.raffleGame(1);
      await lottery.connect(player1).enterGame(3, { value: entranceValue });
      await lottery.connect(player2).enterGame(3, { value: entranceValue });
      await lottery.raffleGame(3);

      const games = await lottery.getRaffledGames();

      expect(games.length).to.equal(2);
      expect(games[0].id).to.equal(1);
      expect(games[1].id).to.equal(3);
    });
    it("Should get an empty array", async () => {
      const { lottery } = await deploy();

      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);

      const games = await lottery.getRaffledGames();

      expect(games).to.eql([]);
    });
  });
  describe("Get not raffled games", () => {
    it("Should return the not raffled games", async () => {
      const { lottery, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);

      await lottery.connect(player1).enterGame(2, { value: entranceValue });
      await lottery.connect(player2).enterGame(2, { value: entranceValue });
      await lottery.raffleGame(2);

      const games = await lottery.getNotRaffledGames();

      expect(games.length).to.equal(2);
      expect(games[0].id).to.equal(1);
      expect(games[1].id).to.equal(3);
    });
    it("Should return an empty array", async () => {
      const { lottery, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);
      await lottery.addGame(entranceValue);

      await lottery.connect(player1).enterGame(1, { value: entranceValue });
      await lottery.connect(player2).enterGame(1, { value: entranceValue });
      await lottery.raffleGame(1);

      await lottery.connect(player1).enterGame(2, { value: entranceValue });
      await lottery.connect(player2).enterGame(2, { value: entranceValue });
      await lottery.raffleGame(2);

      await lottery.connect(player1).enterGame(3, { value: entranceValue });
      await lottery.connect(player2).enterGame(3, { value: entranceValue });
      await lottery.raffleGame(3);

      const games = await lottery.getNotRaffledGames();

      expect(games).to.eql([]);
    });
  });
  describe("Update Loterry fee percentage value", () => {
    it("Should update fee value", async () => {
      const { lottery, manager } = await deploy();

      await expect(lottery.updateLotteryFeeValue(15))
        .to.emit(lottery, "LotteryFeeUpdated")
        .withArgs(10, 15, manager.address);
    });
    it("Should validate that only manager can update fee value", async () => {
      const { lottery, player1 } = await deploy();

      await expect(
        lottery.connect(player1).updateLotteryFeeValue(15)
      ).to.revertedWith("Lottery: Only admin");
    });
    it("Should validate the new fee value", async () => {
      const { lottery } = await deploy();

      await expect(lottery.updateLotteryFeeValue(50)).to.revertedWith(
        "Lottery: Fee should be between 5 and 25 percent"
      );
    });
  });
  describe("Get lottery fees", () => {
    it("Should get the amount of collected fees", async () => {
      const { lottery, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);
      await lottery.connect(player1).enterGame(1, { value: entranceValue });
      await lottery.connect(player2).enterGame(1, { value: entranceValue });

      const fee = entranceValue - entranceValue * 0.9;

      expect(await lottery.getLotteryFees()).to.equal(fee * 2);
    });
    it("Should validate that on manager can get the amount of collected fees", async () => {
      const { lottery, player1 } = await deploy();

      await expect(lottery.connect(player1).getLotteryFees()).to.revertedWith(
        "Lottery: Only admin"
      );
    });
  });
  describe("Withdraw fees", () => {
    it("Should withdraw the collected feess", async () => {
      const { lottery, manager, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);
      await lottery.connect(player1).enterGame(1, { value: entranceValue });
      await lottery.connect(player2).enterGame(1, { value: entranceValue });

      const lotteryFees = await lottery.getLotteryFees();

      await expect(lottery.witdrawFees())
        .to.emit(lottery, "WithdrawFees")
        .withArgs(lotteryFees, manager.address);
    });
    it("Should validate that only manager can withdraw the collected feess", async () => {
      const { lottery, player1, player2 } = await deploy();

      await lottery.addGame(entranceValue);
      await lottery.connect(player1).enterGame(1, { value: entranceValue });
      await lottery.connect(player2).enterGame(1, { value: entranceValue });

      const lotteryFees = await lottery.getLotteryFees();

      await expect(lottery.connect(player1).witdrawFees()).to.revertedWith(
        "Lottery: Only admin"
      );
    });
  });
  describe("Get manager", () => {
    it("Should get the current manager", async () => {
      const { lottery, manager } = await deploy();

      expect(await lottery.getManager()).to.equal(manager.address);
    });
    it("Should validate that only manager can get the current manager", async () => {
      const { lottery, player1 } = await deploy();

      await expect(lottery.connect(player1).getManager()).to.revertedWith(
        "Lottery: Only admin"
      );
    });
  });
});
