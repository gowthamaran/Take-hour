import { createFileRoute } from "@tanstack/react-router";
import { useLiveHour } from "@/hooks/use-live-hour";
import { isEmptyBid } from "@/lib/contracts";
import { formatCountdown } from "@/lib/hour";
import { formatUsdc } from "@/lib/usdc";
import { hostnameOf, kindFromNumber, xHandleFromLink } from "@/lib/listings";

export const Route = createFileRoute("/og")({
  head: () => ({
    meta: [{ title: "HOUR — Open Graph" }],
  }),
  component: OgPreview,
});

function OgPreview() {
  const hour = useLiveHour();
  const empty = isEmptyBid(hour.live);
  const kind = kindFromNumber(hour.live.kind);
  let title = "OPEN";
  if (!empty) {
    if (kind === "x") title = xHandleFromLink(hour.live.link);
    else if (kind === "url") title = hostnameOf(hour.live.link);
    else title = hour.live.name;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="relative h-[315px] w-[600px] overflow-hidden border border-ink sm:h-[630px] sm:w-[1200px]">
        <div className="absolute left-0 top-0 size-8 border-b border-r border-ink bg-paper" />
        <div className="absolute bottom-0 right-0 size-8 border-l border-t border-ink bg-paper" />
        <div className="flex h-full flex-col justify-between p-10 sm:p-16">
          <div className="flex items-center justify-between">
            <span className="text-sm tracking-[0.22em] text-ink">HOUR</span>
            <span className="label-kicker">{empty ? "Open" : "Live"}</span>
          </div>
          <div>
            <p className="font-serif text-5xl italic text-ink sm:text-7xl">{title}</p>
            <p className="mt-6 font-mono text-4xl tabular text-ink sm:text-6xl">
              {empty ? formatUsdc(hour.quote) : formatUsdc(hour.live.amount)}
            </p>
          </div>
          <p className="font-mono text-sm tabular text-secondary">
            HOUR {hour.hourId.toString()} · {formatCountdown(hour.secondsLeft)} LEFT
          </p>
        </div>
      </div>
    </div>
  );
}
