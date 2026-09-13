// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title HourlyCrown
/// @notice Every UTC hour has one crown. Highest USDC bid owns it until the hour dies.
/// @dev Immutable economics. No owner, no proxy, no fee switch, no refunds.
contract HourlyCrown {
    using SafeERC20 for IERC20;

    uint8 public constant KIND_TOKEN = 1;
    uint8 public constant KIND_X = 2;
    uint8 public constant KIND_URL = 3;

    IERC20 public immutable usdc;
    address public immutable treasury;

    uint64 public constant minBid = 1_000_000;
    uint64 public constant increment = 1_000_000;
    uint64 public constant maxBid = 1_000_000_000_000;

    uint64 public currentHour;
    Bid public live;
    mapping(uint64 => Bid) public archive;
    uint256 public totalRaised;

    struct Bid {
        address bidder;
        uint64 amount;
        uint8 kind;
        address token;
        bytes32 refHash;
        string name;
        string ticker;
        string link;
        uint64 timestamp;
    }

    event CrownTaken(
        uint64 indexed hour,
        address indexed bidder,
        uint64 amount,
        uint8 kind,
        address token,
        string name,
        string ticker,
        string link
    );

    event HourSealed(uint64 indexed hour, address indexed winner, uint64 amount);

    error HourExpired();
    error BidTooLow();
    error BidTooHigh();
    error NotWholeDollar();
    error InvalidKind();
    error InvalidName();
    error InvalidTicker();
    error InvalidLink();
    error InvalidToken();
    error NotHolder();
    error ZeroAddress();

    constructor(address usdc_, address treasury_) {
        if (usdc_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        treasury = treasury_;
        currentHour = uint64(block.timestamp / 3600);
    }

    function currentHourId() public view returns (uint64) {
        return uint64(block.timestamp / 3600);
    }

    function secondsLeft() public view returns (uint256) {
        uint256 end = (uint256(currentHourId()) + 1) * 3600;
        if (block.timestamp >= end) return 0;
        return end - block.timestamp;
    }

    /// @notice Quote for the hour that is actually open, even if `sync()` has not run.
    function quoteTake() public view returns (uint64) {
        if (currentHourId() > currentHour) {
            return minBid;
        }
        return live.amount == 0 ? minBid : live.amount + increment;
    }

    function sync() public {
        _syncHour();
    }

    function take(
        uint64 expectedHour,
        uint64 amount,
        uint8 kind,
        address token,
        string calldata name,
        string calldata ticker,
        string calldata link
    ) external {
        if (expectedHour != currentHourId()) revert HourExpired();
        _syncHour();
        _validateAmount(amount, quoteTake());
        _validateListing(kind, token, name, ticker, link);

        uint64 pullAmount = amount;
        if (live.bidder == msg.sender && live.amount > 0 && _sameIdentity(kind, token, link)) {
            pullAmount = amount - live.amount;
        }

        _setLive(msg.sender, amount, kind, token, name, ticker, link);
        totalRaised += pullAmount;
        emit CrownTaken(currentHour, msg.sender, amount, kind, token, name, ticker, link);
        usdc.safeTransferFrom(msg.sender, treasury, pullAmount);
    }

    function raise(uint64 expectedHour, uint64 newAmount) external {
        if (expectedHour != currentHourId()) revert HourExpired();
        _syncHour();
        if (live.bidder != msg.sender) revert NotHolder();
        _validateAmount(newAmount, live.amount + increment);

        uint64 pullAmount = newAmount - live.amount;
        live.amount = newAmount;
        live.timestamp = uint64(block.timestamp);
        totalRaised += pullAmount;
        emit CrownTaken(
            currentHour,
            msg.sender,
            newAmount,
            live.kind,
            live.token,
            live.name,
            live.ticker,
            live.link
        );
        usdc.safeTransferFrom(msg.sender, treasury, pullAmount);
    }

    function _syncHour() internal {
        uint64 hour = currentHourId();
        if (hour == currentHour) return;

        if (live.amount > 0 && live.bidder != address(0)) {
            archive[currentHour] = live;
            emit HourSealed(currentHour, live.bidder, live.amount);
        }

        delete live;
        currentHour = hour;
    }

    function _setLive(
        address bidder,
        uint64 amount,
        uint8 kind,
        address token,
        string calldata name,
        string calldata ticker,
        string calldata link
    ) internal {
        live.bidder = bidder;
        live.amount = amount;
        live.kind = kind;
        live.token = token;
        live.refHash = _identityHash(kind, token, link);
        live.name = name;
        live.ticker = ticker;
        live.link = link;
        live.timestamp = uint64(block.timestamp);
    }

    function _validateAmount(uint64 amount, uint64 quote) internal pure {
        if (amount % increment != 0) revert NotWholeDollar();
        if (amount > maxBid) revert BidTooHigh();
        if (amount < quote) revert BidTooLow();
    }

    function _validateListing(
        uint8 kind,
        address token,
        string calldata name,
        string calldata ticker,
        string calldata link
    ) internal pure {
        if (kind != KIND_TOKEN && kind != KIND_X && kind != KIND_URL) {
            revert InvalidKind();
        }

        uint256 nameLen = bytes(name).length;
        if (nameLen < 1 || nameLen > 32 || !_printableAscii(name, true) || _isBlank(name)) {
            revert InvalidName();
        }

        uint256 tickerLen = bytes(ticker).length;
        if (tickerLen > 12 || (tickerLen > 0 && !_printableAscii(ticker, false))) {
            revert InvalidTicker();
        }

        uint256 linkLen = bytes(link).length;
        if (linkLen < 1 || linkLen > 128 || !_safeLinkChars(link)) revert InvalidLink();

        if (kind == KIND_TOKEN) {
            if (token == address(0)) revert InvalidToken();
        } else if (token != address(0)) {
            revert InvalidToken();
        }

        if (kind == KIND_X) {
            if (!_isXLink(link)) revert InvalidLink();
        } else if (kind == KIND_URL) {
            if (!_isHttps(link)) revert InvalidLink();
        }
    }

    function _sameIdentity(uint8 kind, address token, string calldata link)
        internal
        view
        returns (bool)
    {
        return live.refHash == _identityHash(kind, token, link);
    }

    function _identityHash(uint8 kind, address token, string calldata link)
        internal
        pure
        returns (bytes32)
    {
        if (kind == KIND_TOKEN) return keccak256(abi.encode(kind, token));
        return keccak256(abi.encode(kind, keccak256(bytes(link))));
    }

    function _printableAscii(string memory s, bool allowSpace) internal pure returns (bool) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c < 0x20 || c > 0x7E) return false;
            if (!allowSpace && c == 0x20) return false;
        }
        return true;
    }

    function _isBlank(string memory s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] != 0x20) return false;
        }
        return true;
    }

    function _safeLinkChars(string memory s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c < 0x21 || c > 0x7E) return false;
            if (c == 0x3C || c == 0x3E || c == 0x22 || c == 0x27 || c == 0x5C) return false;
        }
        return true;
    }

    function _isHttps(string memory s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        if (b.length < 9) return false;
        return b[0] == "h" && b[1] == "t" && b[2] == "t" && b[3] == "p" && b[4] == "s"
            && b[5] == ":" && b[6] == "/" && b[7] == "/";
    }

    function _isXLink(string memory s) internal pure returns (bool) {
        if (_hasPrefix(s, "https://x.com/")) {
            return _validHandle(s, 14);
        }
        if (_hasPrefix(s, "https://twitter.com/")) {
            return _validHandle(s, 20);
        }
        return false;
    }

    function _hasPrefix(string memory s, string memory prefix) internal pure returns (bool) {
        bytes memory a = bytes(s);
        bytes memory p = bytes(prefix);
        if (a.length <= p.length) return false;
        for (uint256 i = 0; i < p.length; i++) {
            if (a[i] != p[i]) return false;
        }
        return true;
    }

    function _validHandle(string memory s, uint256 offset) internal pure returns (bool) {
        bytes memory b = bytes(s);
        uint256 n = b.length - offset;
        if (n < 1 || n > 32) return false;
        for (uint256 i = offset; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            bool ok = (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5A)
                || (c >= 0x61 && c <= 0x7A) || c == 0x5F;
            if (!ok) return false;
        }
        return true;
    }
}
