import { createPublicClient, http, fallback, parseAbiItem, type Address } from "viem";
import { hourlyCrownAbi } from "./abi";
import { arcChain } from "./chain";
import { crownAddress, explorerUrl, hasCrownContract, rpcUrl, zeroAddress } from "./env";
import { currentHourId, hourStartUnix } from "./hour";
import { MIN_BID } from "./usdc";

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

export const crownAbi = hourlyCrownAbi;

export type CrownBid = {
  bidder: Address;
  amount: bigint;
  kind: number;
  token: Address;
  refHash: `0x${string}`;
  name: string;
  ticker: string;
  link: string;
  timestamp: bigint;
};

export type TapeRow = CrownBid & {
  hour: bigint;
  txHash?: `0x${string}`;
};

export const emptyBid: CrownBid = {
  bidder: zeroAddress,
  amount: 0n,
  kind: 0,
  token: zeroAddress,
  refHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  name: "",
  ticker: "",
  link: "",
  timestamp: 0n,
};

export function isEmptyBid(bid: CrownBid | null | undefined): boolean {
  if (!bid) return true;
  return bid.amount === 0n || bid.bidder === zeroAddress;
}

export const publicClient = createPublicClient({
  chain: arcChain,
  transport: fallback([
    http(rpcUrl, { timeout: 8_000, retryCount: 1 }),
    http("https://rpc.testnet.arc.network", { timeout: 8_000, retryCount: 1 }),
  ]),
});

function tupleToBid(row: unknown): CrownBid {
  if (Array.isArray(row)) {
    const [
      bidder,
      amount,
      kind,
      token,
      refHash,
      name,
      ticker,
      link,
      timestamp,
    ] = row as [
      Address,
      bigint,
      number,
      Address,
      `0x${string}`,
      string,
      string,
      string,
      bigint,
    ];
    return { bidder, amount, kind, token, refHash, name, ticker, link, timestamp };
  }
  const r = row as CrownBid;
  return {
    bidder: r.bidder,
    amount: BigInt(r.amount ?? 0),
    kind: Number(r.kind ?? 0),
    token: r.token,
    refHash: r.refHash,
    name: r.name ?? "",
    ticker: r.ticker ?? "",
    link: r.link ?? "",
    timestamp: BigInt(r.timestamp ?? 0),
  };
}

export async function readLiveState(): Promise<{
  clockHour: bigint;
  contractHour: bigint;
  quote: bigint;
  live: CrownBid;
  totalRaised: bigint;
  displayLive: CrownBid;
  hourId: bigint;
}> {
  const clockHour = currentHourId();
  if (!hasCrownContract) {
    return {
      clockHour,
      contractHour: clockHour,
      quote: MIN_BID,
      live: emptyBid,
      totalRaised: 0n,
      displayLive: emptyBid,
      hourId: clockHour,
    };
  }

  const address = crownAddress();
  const [hourId, storedHour, quote, liveRaw, totalRaised] = await Promise.all([
    publicClient.readContract({
      address,
      abi: crownAbi,
      functionName: "currentHourId",
    }),
    publicClient.readContract({
      address,
      abi: crownAbi,
      functionName: "currentHour",
    }),
    publicClient.readContract({
      address,
      abi: crownAbi,
      functionName: "quoteTake",
    }),
    publicClient.readContract({
      address,
      abi: crownAbi,
      functionName: "live",
    }),
    publicClient.readContract({
      address,
      abi: crownAbi,
      functionName: "totalRaised",
    }),
  ]);

  const live = tupleToBid(liveRaw);
  const stale = hourId > storedHour;
  return {
    clockHour,
    contractHour: storedHour,
    quote,
    live,
    totalRaised,
    displayLive: stale ? emptyBid : live,
    hourId,
  };
}

export async function readArchive(hour: bigint): Promise<CrownBid> {
  if (!hasCrownContract) return emptyBid;
  const raw = await publicClient.readContract({
    address: crownAddress(),
    abi: crownAbi,
    functionName: "archive",
    args: [hour],
  });
  return tupleToBid(raw);
}

export async function readArchiveRange(
  fromHour: bigint,
  count: number,
): Promise<{ hour: bigint; bid: CrownBid }[]> {
  if (!hasCrownContract || count <= 0) return [];
  const address = crownAddress();
  const contracts = Array.from({ length: count }, (_, i) => {
    const hour = fromHour - BigInt(i);
    if (hour < 0n) return null;
    return {
      address,
      abi: crownAbi,
      functionName: "archive" as const,
      args: [hour] as const,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const results = await publicClient.multicall({
    contracts,
    allowFailure: true,
  });

  return results.flatMap((res, i) => {
    const hour = fromHour - BigInt(i);
    if (res.status !== "success") return [];
    const bid = tupleToBid(res.result);
    if (isEmptyBid(bid)) return [];
    return [{ hour, bid }];
  });
}

const crownTakenEvent = parseAbiItem(
  "event CrownTaken(uint64 indexed hour, address indexed bidder, uint64 amount, uint8 kind, address token, string name, string ticker, string link)",
);

export async function readTape(hour: bigint): Promise<TapeRow[]> {
  if (!hasCrownContract) return [];
  try {
    const fromBlock = await estimateFromBlock(hour);
    const logs = await publicClient.getLogs({
      address: crownAddress(),
      event: crownTakenEvent,
      args: { hour },
      fromBlock,
      toBlock: "latest",
    });
    const rows: TapeRow[] = logs.map((log) => ({
      hour: log.args.hour ?? hour,
      bidder: (log.args.bidder ?? zeroAddress) as Address,
      amount: log.args.amount ?? 0n,
      kind: log.args.kind ?? 0,
      token: (log.args.token ?? zeroAddress) as Address,
      refHash: emptyBid.refHash,
      name: log.args.name ?? "",
      ticker: log.args.ticker ?? "",
      link: log.args.link ?? "",
      timestamp: 0n,
      txHash: log.transactionHash,
    }));
    return rows.reverse();
  } catch (err) {
    console.error("[hour] tape", err);
    return [];
  }
}

async function estimateFromBlock(hour: bigint): Promise<bigint> {
  try {
    const latest = await publicClient.getBlockNumber();
    const now = Math.floor(Date.now() / 1000);
    const age = Math.max(0, now - hourStartUnix(hour));
    const approxBlocks = BigInt(Math.ceil(age * 4) + 4000);
    if (approxBlocks >= latest) return 0n;
    return latest - approxBlocks;
  } catch {
    return 0n;
  }
}

export function explorerAddress(address: string): string {
  return `${explorerUrl}/address/${address}`;
}

export function explorerTx(hash: string): string {
  return `${explorerUrl}/tx/${hash}`;
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
