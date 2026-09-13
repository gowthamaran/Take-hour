import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  emptyBid,
  isEmptyBid,
  publicClient,
  readArchiveRange,
  readLiveState,
  readTape,
  type CrownBid,
  type TapeRow,
} from "@/lib/contracts";
import { crownAbi } from "@/lib/contracts";
import { crownAddress, hasCrownContract } from "@/lib/env";
import { currentHourId, secondsLeftInHour } from "@/lib/hour";
import { MIN_BID } from "@/lib/usdc";
import { useNow } from "./use-now";

export type LiveHourData = {
  hourId: bigint;
  quote: bigint;
  live: CrownBid;
  tape: TapeRow[];
  totalRaised: bigint;
  volume24h: bigint;
  record: bigint;
  contractReady: boolean;
  stale: boolean;
};

const emptyLive: LiveHourData = {
  hourId: currentHourId(),
  quote: MIN_BID,
  live: emptyBid,
  tape: [],
  totalRaised: 0n,
  volume24h: 0n,
  record: 0n,
  contractReady: false,
  stale: false,
};

async function fetchLive(): Promise<LiveHourData> {
  const state = await readLiveState();
  const [tape, archive24] = await Promise.all([
    readTape(state.hourId),
    readArchiveRange(state.hourId, 24),
  ]);
  const archive168 = await readArchiveRange(state.hourId, 168);

  let volume24h = 0n;
  if (!isEmptyBid(state.displayLive)) volume24h += state.displayLive.amount;
  for (const row of archive24) volume24h += row.bid.amount;

  let record = 0n;
  if (!isEmptyBid(state.displayLive) && state.displayLive.amount > record) {
    record = state.displayLive.amount;
  }
  for (const row of archive168) {
    if (row.bid.amount > record) record = row.bid.amount;
  }

  return {
    hourId: state.hourId,
    quote: state.quote,
    live: state.displayLive,
    tape: !isEmptyBid(state.displayLive)
      ? [
          {
            ...state.displayLive,
            hour: state.hourId,
          },
          ...tape.filter(
            (row) =>
              !(
                row.bidder === state.displayLive.bidder &&
                row.amount === state.displayLive.amount &&
                row.name === state.displayLive.name
              ),
          ),
        ]
      : tape,
    totalRaised: state.totalRaised,
    volume24h,
    record,
    contractReady: hasCrownContract,
    stale: state.hourId > state.contractHour && !isEmptyBid(state.live),
  };
}

export function useLiveHour() {
  const now = useNow(250);
  const clockHour = currentHourId(now);
  const secondsLeft = secondsLeftInHour(now);

  const query = useQuery({
    queryKey: ["hour", "live"],
    queryFn: fetchLive,
    refetchInterval: () => (typeof document !== "undefined" && document.hidden ? false : 2000),
    refetchOnWindowFocus: true,
    retry: 1,
    placeholderData: emptyLive,
  });

  useEffect(() => {
    if (!hasCrownContract) return;
    const unwatchTaken = publicClient.watchContractEvent({
      address: crownAddress(),
      abi: crownAbi,
      eventName: "CrownTaken",
      onLogs: () => {
        void query.refetch();
      },
    });
    const unwatchSealed = publicClient.watchContractEvent({
      address: crownAddress(),
      abi: crownAbi,
      eventName: "HourSealed",
      onLogs: () => {
        void query.refetch();
      },
    });
    return () => {
      unwatchTaken();
      unwatchSealed();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCrownContract]);

  const data = query.data ?? emptyLive;
  const hourRolled = clockHour > data.hourId;
  const live = hourRolled ? emptyBid : data.live;
  const quote = hourRolled ? MIN_BID : data.quote;
  const hourId = hourRolled ? clockHour : data.hourId;

  return {
    ...data,
    hourId,
    live,
    quote,
    secondsLeft: hourRolled ? secondsLeftInHour(now) : secondsLeft,
    clockHour,
    isFetching: query.isFetching,
    refetch: query.refetch,
    error: query.error,
  };
}
