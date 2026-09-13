import { Link } from "@tanstack/react-router";
import { isBlockedListing } from "@/lib/blockedListings";
import { truncateAddress, type CrownBid } from "@/lib/contracts";
import { formatUtcHourStamp, hourEndUnix } from "@/lib/hour";
import { hostnameOf, kindFromNumber, xHandleFromLink } from "@/lib/listings";
import { formatUsdc } from "@/lib/usdc";

export function ArchiveTable({
  rows,
}: {
  rows: { hour: bigint; bid: CrownBid }[];
}) {
  if (rows.length === 0) {
    return <p className="mt-8 text-sm text-mute">No sealed hours yet.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead>
          <tr className="label-kicker border-b border-rule">
            <th className="py-3 pr-4 font-medium">Hour</th>
            <th className="py-3 pr-4 font-medium">Name</th>
            <th className="py-3 pr-4 font-medium">Winning bid</th>
            <th className="py-3 pr-4 font-medium">Bidder</th>
            <th className="py-3 font-medium">Sealed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ hour, bid }) => {
            const blocked = isBlockedListing(bid.token, bid.link);
            const kind = kindFromNumber(bid.kind);
            let label = bid.name;
            if (blocked) label = "Hidden";
            else if (kind === "x") label = xHandleFromLink(bid.link);
            else if (kind === "url") label = hostnameOf(bid.link);
            return (
              <tr key={hour.toString()} className="border-b border-rule">
                <td className="py-3 pr-4 font-mono tabular">
                  <Link
                    to="/hours/$id"
                    params={{ id: hour.toString() }}
                    className="hover:underline"
                  >
                    {hour.toString()}
                  </Link>
                </td>
                <td className="max-w-[12rem] truncate py-3 pr-4">{label}</td>
                <td className="py-3 pr-4 font-mono tabular">{formatUsdc(bid.amount)}</td>
                <td className="py-3 pr-4 font-mono">{truncateAddress(bid.bidder)}</td>
                <td className="py-3 font-mono text-secondary">
                  {formatUtcHourStamp(hourEndUnix(hour))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
