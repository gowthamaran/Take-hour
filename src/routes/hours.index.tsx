import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArchiveTable } from "@/components/archive-table";
import { SiteShell } from "@/components/site-shell";
import { useLiveHour } from "@/hooks/use-live-hour";
import { readArchiveRange } from "@/lib/contracts";

export const Route = createFileRoute("/hours/")({
  head: () => ({
    meta: [{ title: "Hours — HOUR" }],
  }),
  component: HoursIndex,
});

function HoursIndex() {
  const live = useLiveHour();
  const [cursor, setCursor] = useState<bigint | null>(null);
  const from = cursor ?? live.hourId - 1n;

  const { data, isFetching } = useQuery({
    queryKey: ["archive", from.toString()],
    queryFn: () => readArchiveRange(from, 168),
  });

  const rows = data ?? [];
  const last = rows.length ? rows[rows.length - 1]!.hour : from;

  return (
    <SiteShell hourId={live.hourId} secondsLeft={live.secondsLeft} wide>
      <p className="mt-10 label-kicker">Archive</p>
      <h1 className="mt-3 font-serif text-4xl italic text-ink">Hours</h1>
      <p className="mt-3 max-w-md text-sm text-secondary">
        When the hour dies, the sitting name is sealed. Empty hours are omitted.
      </p>
      <ArchiveTable rows={rows} />
      <button
        type="button"
        className="btn-ghost mt-8"
        disabled={isFetching || last <= 0n}
        onClick={() => setCursor(last - 1n)}
      >
        Earlier hours
      </button>
    </SiteShell>
  );
}
