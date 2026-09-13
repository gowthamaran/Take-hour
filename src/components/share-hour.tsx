import { track } from "@/lib/analytics";
import { liveShareText, sealedShareText, shareIntent } from "@/lib/share";

export function ShareHour({
  hourId,
  amount,
  secondsLeft,
  sealed,
}: {
  hourId: bigint;
  amount: bigint;
  secondsLeft?: number;
  sealed?: boolean;
}) {
  const text = sealed
    ? sealedShareText({ hourId, amount })
    : liveShareText({ hourId, amount, secondsLeft: secondsLeft ?? 0 });

  return (
    <a
      className="btn-ghost"
      href={shareIntent(text)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("share_click")}
    >
      Share this hour
    </a>
  );
}
