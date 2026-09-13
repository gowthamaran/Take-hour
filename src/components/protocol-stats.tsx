import { formatUsdc } from "@/lib/usdc";

export function ProtocolStats({
  volume24h,
  record,
}: {
  volume24h: bigint;
  record: bigint;
}) {
  return (
    <section className="flex items-end justify-between gap-6 border-t border-rule py-6">
      <div>
        <p className="label-kicker">24h</p>
        <p className="mt-2 font-mono text-xl tabular text-ink">{formatUsdc(volume24h)}</p>
      </div>
      <div className="text-right">
        <p className="label-kicker">Record</p>
        <p className="mt-2 font-mono text-xl tabular text-ink">{formatUsdc(record)}</p>
      </div>
    </section>
  );
}
