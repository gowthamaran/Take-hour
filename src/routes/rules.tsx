import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { useLiveHour } from "@/hooks/use-live-hour";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [{ title: "Rules — HOUR" }],
  }),
  component: RulesPage,
});

function RulesPage() {
  const live = useLiveHour();
  return (
    <SiteShell hourId={live.hourId} secondsLeft={live.secondsLeft}>
      <p className="mt-10 label-kicker">Protocol</p>
      <h1 className="mt-3 font-serif text-4xl italic text-ink">HOUR</h1>
      <div className="mt-10 max-w-xl space-y-6 text-[15px] leading-7 text-secondary">
        <p>Every UTC hour has a single crown.</p>
        <p>You pay USDC on Arc to take it.</p>
        <p>Taking the crown costs at least one dollar more than the current bid.</p>
        <p>The opening bid each hour is $1.</p>
        <p>
          When the hour ends, the sitting name is sealed. The next hour opens at $1.
        </p>
        <p>
          Bids are not refunded. Raising only charges the difference while you still hold
          the crown.
        </p>
        <p>If you are outbid and take it again, you pay the full new bid.</p>
        <p>No accounts. No ads. No ranking algorithm. Rank is the bid.</p>
      </div>
    </SiteShell>
  );
}
