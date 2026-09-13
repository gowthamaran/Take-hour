// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HourlyCrown} from "../src/HourlyCrown.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract HourlyCrownTest is Test {
    HourlyCrown internal crown;
    MockUSDC internal usdc;
    address internal treasury = makeAddr("treasury");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint64 internal constant DOLLAR = 1_000_000;

    function setUp() public {
        usdc = new MockUSDC();
        crown = new HourlyCrown(address(usdc), treasury);
        usdc.mint(alice, 1_000_000 * DOLLAR);
        usdc.mint(bob, 1_000_000 * DOLLAR);
        vm.prank(alice);
        usdc.approve(address(crown), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(crown), type(uint256).max);
    }

    function _hour() internal view returns (uint64) {
        return uint64(block.timestamp / 3600);
    }

    function _take(
        address who,
        uint64 amount,
        uint8 kind,
        address token,
        string memory name,
        string memory ticker,
        string memory link
    ) internal {
        vm.prank(who);
        crown.take(_hour(), amount, kind, token, name, ticker, link);
    }

    function _urlTake(address who, uint64 amount, string memory name) internal {
        _take(who, amount, 3, address(0), name, "", "https://example.com");
    }

    function test_firstDollarBidSucceeds() public {
        _urlTake(alice, DOLLAR, "ACME");
        (address bidder, uint64 amount,,,,,,,) = crown.live();
        assertEq(bidder, alice);
        assertEq(amount, DOLLAR);
        assertEq(usdc.balanceOf(treasury), DOLLAR);
        assertEq(crown.totalRaised(), DOLLAR);
    }

    function test_oneDollarCannotReplaceExistingOneDollarCrown() public {
        _urlTake(alice, DOLLAR, "ACME");
        vm.prank(bob);
        vm.expectRevert(HourlyCrown.BidTooLow.selector);
        crown.take(_hour(), DOLLAR, 3, address(0), "BETA", "", "https://beta.com");
    }

    function test_twoDollarsReplacesOneDollar() public {
        _urlTake(alice, DOLLAR, "ACME");
        _take(bob, 2 * DOLLAR, 3, address(0), "BETA", "", "https://beta.com");
        (address bidder, uint64 amount,,,,,,,) = crown.live();
        assertEq(bidder, bob);
        assertEq(amount, 2 * DOLLAR);
        assertEq(usdc.balanceOf(treasury), 3 * DOLLAR);
    }

    function test_equalAmountCannotReplaceCrown() public {
        _urlTake(alice, 5 * DOLLAR, "ACME");
        vm.prank(bob);
        vm.expectRevert(HourlyCrown.BidTooLow.selector);
        crown.take(_hour(), 5 * DOLLAR, 3, address(0), "BETA", "", "https://beta.com");
    }

    function test_currentOwnerRaisePaysOnlyDelta() public {
        _urlTake(alice, 10 * DOLLAR, "ACME");
        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(alice);
        crown.raise(_hour(), 25 * DOLLAR);
        assertEq(usdc.balanceOf(alice), aliceBefore - 15 * DOLLAR);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + 15 * DOLLAR);
        (, uint64 amount,,,,,,,) = crown.live();
        assertEq(amount, 25 * DOLLAR);
    }

    function test_formerOwnerAfterOutbidPaysFullNewAmount() public {
        _urlTake(alice, DOLLAR, "ACME");
        _take(bob, 2 * DOLLAR, 3, address(0), "BETA", "", "https://beta.com");
        uint256 aliceBefore = usdc.balanceOf(alice);
        _take(alice, 3 * DOLLAR, 3, address(0), "ACME", "", "https://example.com");
        assertEq(usdc.balanceOf(alice), aliceBefore - 3 * DOLLAR);
        (address bidder, uint64 amount,,,,,,,) = crown.live();
        assertEq(bidder, alice);
        assertEq(amount, 3 * DOLLAR);
    }

    function test_sameBidderDifferentListingPaysFullAmount() public {
        address tokenA = makeAddr("tokenA");
        address tokenB = makeAddr("tokenB");
        _take(alice, DOLLAR, 1, tokenA, "ACME", "ACME", "https://acme.xyz");
        uint256 aliceBefore = usdc.balanceOf(alice);
        _take(alice, 2 * DOLLAR, 1, tokenB, "BETA", "BETA", "https://beta.xyz");
        assertEq(usdc.balanceOf(alice), aliceBefore - 2 * DOLLAR);
        assertEq(usdc.balanceOf(treasury), 3 * DOLLAR);
    }

    function test_selfTakeSameListingPaysDelta() public {
        _urlTake(alice, 10 * DOLLAR, "ACME");
        uint256 aliceBefore = usdc.balanceOf(alice);
        _urlTake(alice, 25 * DOLLAR, "ACME");
        assertEq(usdc.balanceOf(alice), aliceBefore - 15 * DOLLAR);
    }

    function test_nonWholeDollarBidReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.NotWholeDollar.selector);
        crown.take(_hour(), DOLLAR + 1, 3, address(0), "ACME", "", "https://example.com");
    }

    function test_amountAboveMaxBidReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.BidTooHigh.selector);
        crown.take(
            _hour(), 1_000_000_000_000 + DOLLAR, 3, address(0), "ACME", "", "https://example.com"
        );
    }

    function test_emptyNameReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidName.selector);
        crown.take(_hour(), DOLLAR, 3, address(0), "", "", "https://example.com");
    }

    function test_blankNameReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidName.selector);
        crown.take(_hour(), DOLLAR, 3, address(0), "   ", "", "https://example.com");
    }

    function test_unsafeUrlReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidLink.selector);
        crown.take(_hour(), DOLLAR, 3, address(0), "ACME", "", "javascript:alert(1)");
    }

    function test_dataUrlReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidLink.selector);
        crown.take(_hour(), DOLLAR, 3, address(0), "ACME", "", "data:text/html,hi");
    }

    function test_httpUrlReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidLink.selector);
        crown.take(_hour(), DOLLAR, 3, address(0), "ACME", "", "http://example.com");
    }

    function test_invalidListingKindReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidKind.selector);
        crown.take(_hour(), DOLLAR, 9, address(0), "ACME", "", "https://example.com");
    }

    function test_wrongApprovalReverts() public {
        address carol = makeAddr("carol");
        usdc.mint(carol, 100 * DOLLAR);
        vm.prank(carol);
        vm.expectRevert();
        crown.take(_hour(), DOLLAR, 3, address(0), "ACME", "", "https://example.com");
    }

    function test_insufficientBalanceReverts() public {
        address broke = makeAddr("broke");
        vm.prank(broke);
        usdc.approve(address(crown), type(uint256).max);
        vm.prank(broke);
        vm.expectRevert();
        crown.take(_hour(), DOLLAR, 3, address(0), "ACME", "", "https://example.com");
    }

    function test_hourRolloverArchivesWinner() public {
        _urlTake(alice, 12 * DOLLAR, "ACME");
        uint64 sealedHour = crown.currentHour();
        vm.warp(block.timestamp + 3600);
        crown.sync();
        (address winner, uint64 amount,,,,,,,) = crown.archive(sealedHour);
        assertEq(winner, alice);
        assertEq(amount, 12 * DOLLAR);
        (address liveBidder, uint64 liveAmount,,,,,,,) = crown.live();
        assertEq(liveBidder, address(0));
        assertEq(liveAmount, 0);
        assertEq(crown.currentHour(), sealedHour + 1);
    }

    function test_newHourQuoteIsOneDollarBeforeSync() public {
        _urlTake(alice, 50 * DOLLAR, "ACME");
        vm.warp(block.timestamp + 3600);
        assertEq(crown.quoteTake(), DOLLAR);
        (, uint64 staleAmount,,,,,,,) = crown.live();
        assertEq(staleAmount, 50 * DOLLAR);
        assertTrue(crown.currentHourId() > crown.currentHour());
    }

    function test_syncSealsCompletedHour() public {
        _urlTake(alice, 8 * DOLLAR, "ACME");
        uint64 hour = crown.currentHour();
        vm.warp(block.timestamp + 3600);
        vm.expectEmit(true, true, false, true);
        emit HourlyCrown.HourSealed(hour, alice, 8 * DOLLAR);
        crown.sync();
    }

    function test_archivePreservesPreviousWinner() public {
        _urlTake(alice, 4 * DOLLAR, "ACME");
        uint64 first = crown.currentHour();
        vm.warp(block.timestamp + 3600);
        _urlTake(bob, DOLLAR, "BETA");
        (address winner, uint64 amount,,,, string memory name,,,) = crown.archive(first);
        assertEq(winner, alice);
        assertEq(amount, 4 * DOLLAR);
        assertEq(name, "ACME");
    }

    function test_expectedHourMismatchReverts() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.HourExpired.selector);
        crown.take(_hour() + 1, DOLLAR, 3, address(0), "ACME", "", "https://example.com");
    }

    function test_bidPreparedForPreviousHourCannotLandInNewHour() public {
        _urlTake(alice, DOLLAR, "ACME");
        uint64 oldHour = _hour();
        vm.warp(block.timestamp + 3600);
        vm.prank(bob);
        vm.expectRevert(HourlyCrown.HourExpired.selector);
        crown.take(oldHour, 200 * DOLLAR, 3, address(0), "SNIPE", "", "https://snipe.com");
        assertEq(crown.quoteTake(), DOLLAR);
    }

    function test_skippedEmptyHoursDoNotFabricateWinners() public {
        _urlTake(alice, 3 * DOLLAR, "ACME");
        uint64 first = crown.currentHour();
        vm.warp(block.timestamp + 3600 * 5);
        crown.sync();
        (address w1,,,,,,,,) = crown.archive(first);
        assertEq(w1, alice);
        (address w2,,,,,,,,) = crown.archive(first + 1);
        assertEq(w2, address(0));
        (address w3,,,,,,,,) = crown.archive(first + 2);
        assertEq(w3, address(0));
        assertEq(crown.currentHour(), first + 5);
    }

    function test_tokenListingRequiresToken() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidToken.selector);
        crown.take(_hour(), DOLLAR, 1, address(0), "ACME", "ACME", "https://acme.xyz");
    }

    function test_xListingRequiresXLink() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidLink.selector);
        crown.take(_hour(), DOLLAR, 2, address(0), "maran", "", "https://example.com");
    }

    function test_xListingSucceeds() public {
        _take(alice, DOLLAR, 2, address(0), "maran", "", "https://x.com/themaran");
        (address bidder,,,,,,,,) = crown.live();
        assertEq(bidder, alice);
    }

    function test_raiseByNonHolderReverts() public {
        _urlTake(alice, DOLLAR, "ACME");
        vm.prank(bob);
        vm.expectRevert(HourlyCrown.NotHolder.selector);
        crown.raise(_hour(), 2 * DOLLAR);
    }

    function test_controlCharactersInNameRevert() public {
        vm.prank(alice);
        vm.expectRevert(HourlyCrown.InvalidName.selector);
        crown.take(_hour(), DOLLAR, 3, address(0), "ACME\n", "", "https://example.com");
    }

    function test_constructorRejectsZero() public {
        vm.expectRevert(HourlyCrown.ZeroAddress.selector);
        new HourlyCrown(address(0), treasury);
        vm.expectRevert(HourlyCrown.ZeroAddress.selector);
        new HourlyCrown(address(usdc), address(0));
    }
}
