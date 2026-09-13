import { defineChain } from "viem";
import {
  chainId,
  explorerUrl,
  networkName,
  rpcUrl,
  wsUrl,
} from "./env";

export const arcChain = defineChain({
  id: chainId,
  name: networkName,
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
      webSocket: wsUrl ? [wsUrl] : [],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: explorerUrl,
    },
  },
  testnet: true,
});

export const addArcChainParams = {
  chainId: `0x${chainId.toString(16)}`,
  chainName: networkName,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [rpcUrl],
  blockExplorerUrls: [explorerUrl],
} as const;
