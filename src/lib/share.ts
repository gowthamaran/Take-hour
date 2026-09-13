import { siteUrl } from "./env";
import { formatCountdown } from "./hour";
import { formatUsdc } from "./usdc";

export function hourUrl(hourId: bigint): string {
  return `${siteUrl}/hours/${hourId.toString()}`;
}

export function liveShareText(opts: {
  hourId: bigint;
  amount: bigint;
  secondsLeft: number;
}): string {
  return [
    `I own Hour ${opts.hourId.toString()} for ${formatUsdc(opts.amount)}.`,
    "",
    `${formatCountdown(opts.secondsLeft)} left.`,
    "",
    "Take it from me ↓",
    hourUrl(opts.hourId),
  ].join("\n");
}

export function sealedShareText(opts: { hourId: bigint; amount: bigint }): string {
  return [
    `I owned Hour ${opts.hourId.toString()}.`,
    `${formatUsdc(opts.amount)}.`,
    "",
    "Sealed forever.",
    hourUrl(opts.hourId),
  ].join("\n");
}

export function shareIntent(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
