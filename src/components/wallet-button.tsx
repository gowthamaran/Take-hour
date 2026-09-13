import { useState } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { ClientOnly } from "@tanstack/react-router";
import { addArcChainParams, arcChain } from "@/lib/chain";
import { truncateAddress } from "@/lib/contracts";
import { ConnectModal } from "./connect-modal";

export function WalletButton() {
  return (
    <ClientOnly fallback={<span className="btn-ghost">Connect</span>}>
      <WalletButtonInner />
    </ClientOnly>
  );
}

function WalletButtonInner() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  if (!isConnected || !address) {
    return (
      <>
        <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
          Connect
        </button>
        <ConnectModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const wrong = chainId !== arcChain.id;

  if (wrong) {
    return (
      <button
        type="button"
        className="btn-ghost text-alert"
        disabled={isPending}
        onClick={async () => {
          try {
            await switchChainAsync({ chainId: arcChain.id });
          } catch {
            const eth = (
              window as Window & {
                ethereum?: {
                  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
                };
              }
            ).ethereum;
            if (!eth) return;
            try {
              await eth.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: addArcChainParams.chainId }],
              });
            } catch {
              await eth.request({
                method: "wallet_addEthereumChain",
                params: [addArcChainParams],
              });
            }
          }
        }}
      >
        Switch to Arc
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-ghost font-mono"
        onClick={() => setMenu((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menu}
      >
        {truncateAddress(address)}
      </button>
      {menu ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 min-w-40 border border-rule bg-paper"
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-secondary hover:text-ink"
            onClick={() => {
              setMenu(false);
              disconnect();
            }}
          >
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
