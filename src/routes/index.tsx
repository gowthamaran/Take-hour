import { createFileRoute } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { Crown } from "@/components/crown";
import { ProtocolStats } from "@/components/protocol-stats";
import { SiteShell } from "@/components/site-shell";
import { TakeForm } from "@/components/take-form";
import { Tape } from "@/components/tape";
import { useLiveHour } from "@/hooks/use-live-hour";
import { useMounted } from "@/hooks/use-now";
import { track } from "@/lib/analytics";
import { isEmptyBid } from "@/lib/contracts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HOUR — One crown every hour" },
      {
        name: "description",
        content:
          "Every UTC hour has one crown. Highest USDC bid on Arc keeps it until the hour ends.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const hour = useLiveHour();
  const { address } = useAccount();
  const mounted = useMounted();

  useEffect(() => {
    track("page_view");
  }, []);

  const youHold =
    mounted &&
    !!address &&
    !isEmptyBid(hour.live) &&
    hour.live.bidder.toLowerCase() === address.toLowerCase();

  return (
    <SiteShell hourId={hour.hourId} secondsLeft={hour.secondsLeft}>
      <p className="mt-8 text-sm text-mute">
        One crown. One hour. Highest USDC bid keeps it.
      </p>
      <div className="mt-10">
        <Crown bid={hour.live} quote={hour.quote} youHold={youHold} />
      </div>
      <TakeForm
        hourId={hour.hourId}
        quote={hour.quote}
        live={hour.live}
        secondsLeft={hour.secondsLeft}
        onTaken={() => {
          void hour.refetch();
        }}
      />
      <ProtocolStats volume24h={hour.volume24h} record={hour.record} />
      <Tape rows={hour.tape} hourId={hour.hourId} />
    </SiteShell>
  );
}
