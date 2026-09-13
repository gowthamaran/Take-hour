import { useEffect } from "react";
import { useConnect } from "wagmi";
import { track } from "@/lib/analytics";

const LABELS: Record<string, string> = {
  injected: "Browser wallet",
  metaMask: "MetaMask",
  "com.okex.wallet": "OKX",
  "io.rabby": "Rabby",
  "app.phantom": "Phantom",
  walletConnect: "WalletConnect",
  coinbaseWalletSDK: "Coinbase Wallet",
};

export function ConnectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { connectors, connect, isPending, error } = useConnect();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const seen = new Set<string>();
  const unique = connectors.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-title"
      onClick={onClose}
    >
      <div
        className="cut-primary w-full max-w-sm bg-paper p-6 shadow-[0_12px_40px_rgba(18,18,18,0.18)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="label-kicker" id="connect-title">
          Connect
        </p>
        <p className="mt-3 font-serif text-2xl leading-none text-ink">Wallet</p>
        <p className="mt-3 text-sm text-secondary">
          Identity is a wallet. No accounts.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {unique.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              className="cut-secondary flex min-h-11 items-center justify-between border border-ink bg-paper px-4 text-left text-sm text-ink hover:bg-ink hover:text-paper"
              disabled={isPending}
              onClick={() => {
                track("wallet_connect");
                connect(
                  { connector },
                  {
                    onSuccess: () => onClose(),
                  },
                );
              }}
            >
              <span>{LABELS[connector.id] ?? connector.name}</span>
              <span className="font-mono text-tick text-mute">↗</span>
            </button>
          ))}
        </div>
        {error ? (
          <p className="mt-4 text-sm text-alert" role="alert">
            {error.message.includes("rejected")
              ? "Transaction rejected."
              : "Could not connect."}
          </p>
        ) : null}
        <button type="button" className="btn-ghost mt-6" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
