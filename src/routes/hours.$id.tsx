import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "@/components/crown";
import { ShareHour } from "@/components/share-hour";
import { SiteShell } from "@/components/site-shell";
import { Tape } from "@/components/tape";
import { useLiveHour } from "@/hooks/use-live-hour";
import { emptyBid, isEmptyBid, readArchive, readTape } from "@/lib/contracts";
import { formatUsdc } from "@/lib/usdc";
import { isValidHourId } from "@/lib/hour";

export const Route = createFileRoute("/hours/$id")({
  head: ({ params }) => ({
    meta: [{ title: `HOUR ${params.id}` }],
  }),
  component: HourDetail,
});

function HourDetail() {
  const { id } = Route.useParams();
  const live = useLiveHour();
  const hourId = isValidHourId(id) ? BigInt(id) : 0n;
  const isLive = hourId === live.hourId;

  const archived = useQuery({
    queryKey: ["hour", hourId.toString()],
    queryFn: () => readArchive(hourId),
    enabled: !isLive && hourId > 0n,
  });

  const tape = useQuery({
    queryKey: ["tape", hourId.toString()],
    queryFn: () => readTape(hourId),
    enabled: hourId > 0n,
  });

  const bid = isLive ? live.live : (archived.data ?? emptyBid);
  const sealed = !isLive;
  const titleName = isEmptyBid(bid) ? "OPEN" : bid.name;

  return (
    <SiteShell hourId={live.hourId} secondsLeft={live.secondsLeft}>
      <p className="mt-10 label-kicker">{sealed ? "Sealed" : "Live"}</p>
      <h1 className="mt-3 font-mono text-2xl tabular text-ink">
        HOUR {hourId.toString()}
      </h1>
      <p className="sr-only">
        {`HOUR ${hourId.toString()} — ${titleName} ${
          isEmptyBid(bid) ? "" : `won with ${formatUsdc(bid.amount)}`
        }`}
      </p>
      <div className="mt-8">
        <Crown
          bid={bid}
          quote={isLive ? live.quote : bid.amount || live.quote}
          sealed={sealed}
        />
      </div>
      {!isEmptyBid(bid) ? (
        <div className="mt-6">
          <ShareHour
            hourId={hourId}
            amount={bid.amount}
            secondsLeft={live.secondsLeft}
            sealed={sealed}
          />
        </div>
      ) : sealed ? (
        <p className="mt-6 text-sm text-mute">This hour had no crown.</p>
      ) : null}
      <Tape rows={isLive ? live.tape : (tape.data ?? [])} hourId={hourId} />
    </SiteShell>
  );
}
