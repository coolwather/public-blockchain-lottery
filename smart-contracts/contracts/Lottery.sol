// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Lottery {
    address private manager;

    event GameCreated(uint gameId);
    event EnteredGame(uint gameId, uint gamePrize, uint qtdPlayers);
    event GamePlayed(uint gameId, address winner, uint prize);
    event LotteryFeeUpdated(uint oldValue, uint newValue, address manager);
    event WithdrawFees(uint value, address manager);

    uint private lotteryFeeValue = 10;
    uint private lotteryFees;
    uint private gameId;

    address NULL_ADDRESS = 0x0000000000000000000000000000000000000000;

    struct Game {
        uint id;
        uint enterPrice;
        uint prize;
        address winner;
        bool raffling;
        bool raffled;
        uint raffleDate;
        address[] players;
    }

    mapping(uint => Game) private Games;

    constructor() {
        manager = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == manager, "Lottery: Only admin");
        _;
    }

    modifier validateEntrance(uint _gameId) {
        require(Games[_gameId].enterPrice > 0, "Lottery: Game don't exist");
        require(!Games[_gameId].raffled, "Lottery: Game already raffled");
        require(!Games[_gameId].raffling, "Lottery: Game is being raffled");
        require(
            msg.value == Games[_gameId].enterPrice,
            "Lottery: invalid value sent"
        );
        _;
    }

    modifier validateRaflleGame(uint _gameId) {
        require(msg.sender == manager, "Lottery: Only admin");
        require(Games[_gameId].enterPrice > 0, "Lottery: Game don't exist");
        require(!Games[_gameId].raffled, "Lottery: Game already raffled");
        require(!Games[_gameId].raffling, "Lottery: Game is being raffled");
        require(
            Games[_gameId].players.length > 0,
            "Lottery: needs to have at least 1 player"
        );
        _;
    }

    function addGame(uint _enterPrice) public onlyAdmin {
        require(_enterPrice > 0, "Lottery: Invalid enter price value");

        gameId++;
        address[] memory players = new address[](0);
        Game memory game = Game(
            gameId,
            _enterPrice,
            0,
            NULL_ADDRESS,
            false,
            false,
            0,
            players
        );
        Games[gameId] = game;

        emit GameCreated(gameId);
    }

    function enterGame(uint _gameId) public payable validateEntrance(_gameId) {
        uint feeValue = increaseLotteryFees(msg.value);
        Games[_gameId].prize += msg.value - feeValue;
        Games[_gameId].players.push(msg.sender);

        emit EnteredGame(
            _gameId,
            Games[_gameId].prize,
            Games[_gameId].players.length
        );
    }

    function raffleGame(uint _gameId) public validateRaflleGame(_gameId) {
        Games[_gameId].raffling = true;

        address winner = generateWinner(_gameId);
        Games[_gameId].winner = winner;
        Games[_gameId].raffled = true;
        Games[_gameId].raffleDate = block.timestamp;

        (bool sent, ) = winner.call{value: Games[_gameId].prize}("");
        require(sent, "Lottery: Failed to pay winner");
        Games[_gameId].raffling = false;

        emit GamePlayed(_gameId, winner, Games[_gameId].prize);
    }

    function getAllGames() public view returns (Game[] memory) {
        Game[] memory games = new Game[](gameId);

        for (uint i = 1; i <= gameId; i++) {
            games[i - 1] = Games[i];
        }

        return games;
    }

    function getRaffledGames() public view returns (Game[] memory) {
        uint size;

        for (uint i = 1; i <= gameId; i++) {
            if (Games[i].raffled) {
                size++;
            }
        }

        Game[] memory raffledGames = new Game[](size);
        uint position = 0;
        for (uint i = 1; i <= gameId; i++) {
            if (Games[i].raffled) {
                raffledGames[position] = Games[i];
                position++;
            }
        }

        return raffledGames;
    }

    function getNotRaffledGames() public view returns (Game[] memory) {
        uint size;

        for (uint i = 1; i <= gameId; i++) {
            if (!Games[i].raffled) {
                size++;
            }
        }

        Game[] memory raffledGames = new Game[](size);
        uint position = 0;
        for (uint i = 1; i <= gameId; i++) {
            if (!Games[i].raffled) {
                raffledGames[position] = Games[i];
                position++;
            }
        }

        return raffledGames;
    }

    function updateLotteryFeeValue(uint _newValue) public onlyAdmin {
        require(
            _newValue >= 5 && _newValue <= 25,
            "Lottery: Fee should be between 5 and 25 percent"
        );

        uint oldValue = lotteryFeeValue;
        lotteryFeeValue = _newValue;

        emit LotteryFeeUpdated(oldValue, _newValue, msg.sender);
    }

    function getLotteryFeeValue() public view onlyAdmin returns (uint) {
        return lotteryFeeValue;
    }

    function getLotteryFees() public view onlyAdmin returns (uint) {
        return lotteryFees;
    }

    function witdrawFees() public onlyAdmin {
        uint value = lotteryFees;
        lotteryFees = 0;
        (bool sent, ) = payable(manager).call{value: value}("");

        if (sent) {
            emit WithdrawFees(value, manager);
        }
    }

    function getManager() public view onlyAdmin returns (address) {
        return manager;
    }

    function generateWinner(
        uint _gameId
    ) private view onlyAdmin returns (address) {
        uint winnerNumber = uint(
            keccak256(
                abi.encodePacked(
                    block.chainid,
                    msg.sender,
                    block.timestamp,
                    Games[_gameId].players,
                    Games[_gameId].prize,
                    Games[_gameId].enterPrice
                )
            )
        ) % Games[_gameId].players.length;

        return Games[_gameId].players[winnerNumber];
    }

    function increaseLotteryFees(uint _enterValue) private returns (uint) {
        uint feeValue = _enterValue -
            ((_enterValue * (100 - lotteryFeeValue)) / 100);
        lotteryFees += feeValue;
        return feeValue;
    }
}
