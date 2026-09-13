import { isBlockedListing } from "@/lib/blockedListings";
import { explorerAddress, isEmptyBid, truncateAddress, type CrownBid } from "@/lib/contracts";
import { formatUtcTime } from "@/lib/hour";
import { hostnameOf, kindFromNumber, listingHref, xHandleFromLink } from "@/lib/listings";
import { formatUsdc } from "@/lib/usdc";
import { track } from "@/lib/analytics";
import { zeroAddress } from "@/lib/env";

export function Crown({
  bid,
  quote,
  youHold,
  sealed,
}: {
  bid: CrownBid;
  quote: bigint;
  youHold?: boolean;
  sealed?: boolean;
}) {
  const empty = isEmptyBid(bid);
  const blocked = !empty && isBlockedListing(bid.token, bid.link);
  const kind = kindFromNumber(bid.kind);
  const href = blocked ? null : listingHref(bid.kind, bid.token, bid.link);

  let title = "—";
  let subtitle = "";
  if (!empty && !blocked) {
    if (kind === "x") title = xHandleFromLink(bid.link);
    else if (kind === "url") title = hostnameOf(bid.link);
    else title = bid.name || "Untitled";
    if (kind === "token" && bid.ticker) subtitle = bid.ticker;
    else if (kind === "url") subtitle = bid.link;
  }

  return (
    <section
      className={
        "border-t pt-6 " + (youHold ? "border-bid" : "border-rule")
      }
    >
      <div className="flex items-end justify-between gap-4">
        <p className="label-kicker">{sealed ? "Sealed crown" : "Current crown"}</p>
        {youHold ? (
          <p className="text-tick font-medium uppercase tracking-[0.14em] text-bid">
            You hold this hour
          </p>
        ) : null}
      </div>

      {empty ? (
        <>
          <p className="mt-5 font-serif text-crown italic text-ink">—</p>
          <p className="mt-4 font-mono text-price tabular text-ink">
            {formatUsdc(quote)} to take
          </p>
          <p className="mt-3 text-sm text-secondary">This hour is open.</p>
        </>
      ) : (
        <>
          <div className="mt-5 flex items-start gap-3">
            {kind === "token" ? <TokenMark name={blocked ? "H" : title} /> : null}
            <div className="min-w-0">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-serif text-crown italic text-ink hover:underline"
                  onClick={() => track("crown_outbound_click")}
                >
                  {title}
                </a>
              ) : (
                <p className="truncate font-serif text-crown italic text-ink">
                  {blocked ? "Listing hidden by interface." : title}
                </p>
              )}
              {subtitle && !blocked ? (
                <p className="mt-2 truncate font-mono text-sm text-secondary">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <p className="mt-6 font-mono text-price tabular text-ink">
            {formatUsdc(bid.amount)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-tick text-secondary">
            {kind === "token" && bid.token !== zeroAddress ? (
              <a
                href={explorerAddress(bid.token)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink"
              >
                {truncateAddress(bid.token)}
              </a>
            ) : null}
            <a
              href={explorerAddress(bid.bidder)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              {truncateAddress(bid.bidder)}
            </a>
            {bid.timestamp > 0n ? (
              <span>taken {formatUtcTime(Number(bid.timestamp))}</span>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function TokenMark({ name }: { name: string }) {
  const letter = (name.replace(/^@/, "").trim()[0] || "H").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="mt-2 inline-flex size-10 shrink-0 items-center justify-center border border-ink font-serif text-lg text-ink"
    >
      {letter}
    </span>
  );
}
