import { formatCountdown } from "@/lib/hour";

export function Countdown({ secondsLeft }: { secondsLeft: number }) {
  const urgent = secondsLeft < 60;
  const large = secondsLeft < 300;
  return (
    <p
      className={
        "font-mono tabular " +
        (urgent
          ? "text-count text-alert"
          : large
            ? "text-count text-ink"
            : "text-tick text-secondary")
      }
      aria-live="polite"
    >
      {formatCountdown(secondsLeft)}
    </p>
  );
}
