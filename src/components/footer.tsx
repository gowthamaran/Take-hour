import { Link } from "@tanstack/react-router";
import { explorerAddress } from "@/lib/contracts";
import { crownAddress, hasCrownContract } from "@/lib/env";
import { CreatorAttribution } from "./creator-attribution";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-rule pt-8 pb-12">
      <p className="text-sm text-secondary">
        Bids in USDC on Arc. No refunds. Every hour starts at $1.
      </p>
      <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to="/rules" className="text-ink underline-offset-4 hover:underline">
          Rules
        </Link>
        <Link to="/hours" className="text-ink underline-offset-4 hover:underline">
          Hours
        </Link>
        {hasCrownContract ? (
          <>
            <a
              href={explorerAddress(crownAddress())}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline-offset-4 hover:underline"
            >
              Explorer
            </a>
            <a
              href={explorerAddress(crownAddress())}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline-offset-4 hover:underline"
            >
              Contract
            </a>
          </>
        ) : (
          <span className="text-mute">Contract pending</span>
        )}
      </nav>
      <div className="mt-8">
        <CreatorAttribution />
      </div>
    </footer>
  );
}
