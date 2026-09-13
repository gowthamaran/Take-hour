import { Link } from "@tanstack/react-router";
import { formatCountdown } from "@/lib/hour";
import { WalletButton } from "./wallet-button";

export function Header({
  hourId,
  secondsLeft,
}: {
  hourId: bigint;
  secondsLeft: number;
}) {
  const urgent = secondsLeft < 60;
  const large = secondsLeft < 300;

  return (
    <header className="flex items-start justify-between gap-4 border-b border-rule pb-4">
      <Link to="/" className="group flex items-center gap-2">
        <CrownGlyph />
        <span className="text-sm font-semibold tracking-[0.22em] text-ink">
          HOUR
        </span>
      </Link>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-baseline gap-3 font-mono tabular text-ink">
          <span className="text-tick tracking-wide text-secondary">
            {hourId.toString()}
          </span>
          <span
            className={
              urgent
                ? "text-count font-medium text-alert"
                : large
                  ? "text-count font-medium text-ink"
                  : "text-tick text-ink"
            }
          >
            {formatCountdown(secondsLeft)}
          </span>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}

function CrownGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="text-ink"
    >
      <path
        d="M1.5 12.5h13v1.2H1.5zm1-1.8 2.4-5.4 2.6 3.4 2.6-3.4 2.4 5.4z"
        fill="currentColor"
      />
    </svg>
  );
}
