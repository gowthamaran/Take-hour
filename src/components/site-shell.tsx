import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Header } from "./header";

export function SiteShell({
  hourId,
  secondsLeft,
  children,
  wide,
}: {
  hourId: bigint;
  secondsLeft: number;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div
        className={
          "mx-auto px-page py-6 sm:px-8 sm:py-8 " +
          (wide ? "max-w-[920px]" : "max-w-[760px]")
        }
      >
        <Header hourId={hourId} secondsLeft={secondsLeft} />
        {children}
        <Footer />
      </div>
    </div>
  );
}
