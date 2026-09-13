import type { Address } from "viem";

function read(name: string, fallback = ""): string {
  const fromVite = import.meta.env[`VITE_${name}`];
  if (typeof fromVite === "string" && fromVite.length > 0) return fromVite.trim();
  return fallback;
}

export const siteUrl = read("SITE_URL", "https://takehour.lol").replace(/\/$/, "");
export const networkName = read("NETWORK_NAME", "Arc Testnet");
export const chainId = Number(read("CHAIN_ID", "5042002"));
export const rpcUrl = read("RPC_URL", "https://rpc.testnet.arc.io");
export const wsUrl = read("WS_URL", "wss://rpc.testnet.arc.io");
export const explorerUrl = read("EXPLORER_URL", "https://testnet.arcscan.app").replace(
  /\/$/,
  "",
);
export const usdcAddress = read(
  "USDC",
  "0x3600000000000000000000000000000000000000",
) as Address;
export const crownContract = read("CROWN_CONTRACT");
export const treasuryAddress = read("TREASURY");
export const onrampEnabled = read("ONRAMP_ENABLED", "false") === "true";
export const walletConnectProjectId = read("WALLETCONNECT_PROJECT_ID");
export const faucetUrl = read("FAUCET_URL", "https://faucet.circle.com");

export const hasCrownContract = /^0x[a-fA-F0-9]{40}$/.test(crownContract);

export function crownAddress(): Address {
  if (!hasCrownContract) throw new Error("contract not configured");
  return crownContract as Address;
}

export const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;
