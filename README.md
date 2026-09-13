# HOUR

**takehour.lol** — every UTC hour has one crown. The highest USDC bid on Arc owns it until the hour dies. Then the board resets.

Phase 1 ships on **Arc Testnet**. Mainnet is a separate gate. Do not deploy mainnet because the code builds.

Built by [@TheMaran](https://x.com/themaran).

## What it is

60 minutes of internet real estate. One owner. Money determines the temporary owner. Time guarantees scarcity. The chain proves the result.

- Opening bid each hour: **$1**
- Minimum next take: current bid + **$1**
- Whole dollars only
- No refunds. Outbid money is not returned
- Current holder may **raise** and pay only the delta
- A former holder who retakes pays the **full** new bid
- `expectedHour` prevents a dying-hour bid from landing in the new $1 hour

## Architecture

```
contracts/          HourlyCrown.sol — Foundry, OZ v5, immutable treasury
src/                TanStack Start app (Vite) — live hour, archive, rules, OG
public/             favicon, share card, @TheMaran pfp
```

Chain events and contract state are the source of truth. No database. No accounts.

The original spec asked for Next.js 15. This repo runs on TanStack Start so it can ship in this environment and on Vercel without a rewrite of the product. Contract, auction rules, copy, and UI language follow the spec.

## Contract rules

- USDC (6 decimals). `$1 = 1_000_000`
- `hourId = floor(unix / 3600)` UTC
- Listings: Arc token / X handle / HTTPS URL
- `take(expectedHour, amount, kind, token, name, ticker, link)`
- `raise(expectedHour, newAmount)`
- `quoteTake()` returns `$1` if the chain hour has moved and `sync()` has not run
- `_syncHour()` archives a winner if one existed, emits `HourSealed`, and does **not** fabricate winners for skipped empty hours
- No owner, no proxy, no fee switch, no admin withdrawal

## expectedHour protection

A bid prepared for the dying hour must never become a huge bid in the newly opened `$1` hour. If `expectedHour != block.timestamp / 3600`, the contract reverts `HourExpired()`. The UI refetches and does not resubmit.

## Environment

Copy `.env.example`. Public values use `VITE_`. Never prefix a private key with `VITE_`.

Official Arc Testnet (verify again on deploy day):

| | |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.io` |
| WS | `wss://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` |
| USDC | `0x3600000000000000000000000000000000000000` |
| Faucet | `https://faucet.circle.com` |

`VITE_CROWN_CONTRACT` and `VITE_TREASURY` stay empty until you deploy.

## Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
cd contracts
git clone --depth 1 --branch v5.2.0 https://github.com/OpenZeppelin/openzeppelin-contracts.git lib/openzeppelin-contracts
git clone --depth 1 --branch v1.9.6 https://github.com/foundry-rs/forge-std lib/forge-std
forge fmt
forge test
forge build
node script/export-abi.mjs
```

## Deploy HourlyCrown (Arc Testnet)

You need a funded deployer (USDC for gas on Arc) and an immutable treasury address.

```bash
cd contracts
export USDC=0x3600000000000000000000000000000000000000
export TREASURY=0xYourTreasury
export ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.io
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

Put the printed address in `VITE_CROWN_CONTRACT` and the same treasury in `VITE_TREASURY`. Confirm the immutable treasury on the explorer before announcing.

## Web

```bash
npm install
npm run dev        # 0.0.0.0:8080 in this workspace
npm run typecheck
npm run build
```

Wallet: wagmi v2 + viem. Injected (MetaMask, Rabby, Rainbow, OKX, Coinbase) plus WalletConnect if `VITE_WALLETCONNECT_PROJECT_ID` is set. Exact USDC approval. One USDC ERC-20 balance. Native symbol shown to wallets: USDC.

## Mainnet migration gate

Do not execute until the testnet acceptance checklist is green, including two-wallet adversarial bidding across hour boundaries and a retest of `expectedHour` near the rollover. Verify official Arc mainnet chain ID, RPC, WS, explorer, and USDC from Circle/Arc docs on the day you deploy. Fresh immutable contract. Separate env. Low-value smoke test before public mainnet.

## Security assumptions

- Circle USDC `transferFrom` / `approve` behave as standard ERC-20 (SafeERC20)
- No refunds, no custody of bidder funds after the pull to treasury
- Listing strings are validated on-chain (printable ASCII, https-only links)
- The interface may hide a blocked listing; it cannot change ownership
- Frontend always trusts `quoteTake()` and refetches before send
