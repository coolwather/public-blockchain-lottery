// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Lottery {
    address private manager;

    constructor() {
        manager = msg.sender;
    }

    function getManager() public view returns(address) {
        return manager;
    }
}
