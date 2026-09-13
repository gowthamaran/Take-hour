import { explorerTx, truncateAddress, type TapeRow } from "@/lib/contracts";
import { formatUtcShort } from "@/lib/hour";
import { hostnameOf, kindFromNumber, xHandleFromLink } from "@/lib/listings";
import { formatUsdc } from "@/lib/usdc";
import { isBlockedListing } from "@/lib/blockedListings";

export function Tape({ rows, hourId }: { rows: TapeRow[]; hourId: bigint }) {
  return (
    <section className="border-t border-rule pt-8">
      <p className="label-kicker">This hour</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-mute">No takes yet.</p>
      ) : (
        <ol className="mt-4 divide-y divide-rule">
          {rows.map((row, i) => {
            const blocked = isBlockedListing(row.token, row.link);
            const kind = kindFromNumber(row.kind);
            let label = row.name;
            if (blocked) label = "Hidden";
            else if (kind === "x") label = xHandleFromLink(row.link);
            else if (kind === "url") label = hostnameOf(row.link);
            const inner = (
              <span className="grid grid-cols-[5.5rem_1fr_auto] items-baseline gap-3 py-2.5 font-mono text-tick sm:grid-cols-[5.5rem_minmax(0,1fr)_7.5rem_4.5rem]">
                <span className="tabular text-ink">{formatUsdc(row.amount)}</span>
                <span className="truncate text-secondary">{label}</span>
                <span className="hidden truncate text-mute sm:block">
                  {truncateAddress(row.bidder)}
                </span>
                <span className="tabular text-mute">
                  {row.timestamp > 0n ? formatUtcShort(Number(row.timestamp)) : "—"}
                </span>
              </span>
            );
            return (
              <li key={`${row.txHash ?? "row"}-${hourId}-${i}`}>
                {row.txHash ? (
                  <a
                    href={explorerTx(row.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-rule/40"
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
