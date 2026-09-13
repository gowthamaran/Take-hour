# HourlyCrown

Immutable hourly crown auction. USDC on Arc. No admin economics.

```bash
forge test
forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_TESTNET_RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY
node script/export-abi.mjs
```
