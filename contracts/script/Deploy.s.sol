// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HourlyCrown} from "../src/HourlyCrown.sol";

/// @notice Deploy HourlyCrown. Reads USDC and TREASURY from the environment.
/// @dev Never blindly overwrite production env files from this script.
contract Deploy is Script {
    function run() external {
        address usdc = vm.envAddress("USDC");
        address treasury = vm.envAddress("TREASURY");
        require(usdc != address(0), "USDC required");
        require(treasury != address(0), "TREASURY required");

        vm.startBroadcast();
        HourlyCrown crown = new HourlyCrown(usdc, treasury);
        vm.stopBroadcast();

        console.log("HourlyCrown", address(crown));
        console.log("usdc", address(crown.usdc()));
        console.log("treasury", crown.treasury());
        console.log("currentHour", crown.currentHour());

        require(address(crown.usdc()) == usdc, "usdc mismatch");
        require(crown.treasury() == treasury, "treasury mismatch");
        require(crown.minBid() == 1_000_000, "minBid mismatch");
        require(crown.increment() == 1_000_000, "increment mismatch");
    }
}
