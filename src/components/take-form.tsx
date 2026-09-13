import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { ConnectModal } from "./connect-modal";
import { ShareHour } from "./share-hour";
import { track } from "@/lib/analytics";
import { arcChain } from "@/lib/chain";
import {
  crownAbi,
  erc20Abi,
  explorerTx,
  isEmptyBid,
  publicClient,
  truncateAddress,
  type CrownBid,
} from "@/lib/contracts";
import { crownAddress, faucetUrl, hasCrownContract, onrampEnabled, usdcAddress } from "@/lib/env";
import { userErrorMessage } from "@/lib/errors";
import {
  KIND,
  isAddress,
  isSafeName,
  isSafeTicker,
  normalizeHttpsUrl,
  normalizeX,
  sanitizeName,
  sanitizeTicker,
  type ListingKind,
} from "@/lib/listings";
import { DOLLAR, INCREMENT, MAX_BID, MIN_BID, formatUsdc, formatUsdcBalance } from "@/lib/usdc";

type Status =
  | "idle"
  | "approving"
  | "confirm"
  | "taking"
  | "success"
  | "error";

export function TakeForm({
  hourId,
  quote,
  live,
  secondsLeft,
  onTaken,
}: {
  hourId: bigint;
  quote: bigint;
  live: CrownBid;
  secondsLeft: number;
  onTaken: () => void;
}) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [connectOpen, setConnectOpen] = useState(false);
  const [kind, setKind] = useState<ListingKind>("token");
  const [token, setToken] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [dollars, setDollars] = useState(() => Number(quote / DOLLAR));
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [wasHolder, setWasHolder] = useState(false);
  const started = useRef(false);

  const youHold =
    !!address && !isEmptyBid(live) && live.bidder.toLowerCase() === address.toLowerCase();

  useEffect(() => {
    if (youHold) setWasHolder(true);
  }, [youHold]);

  const outbid = wasHolder && !youHold && !isEmptyBid(live);

  useEffect(() => {
    setDollars((prev) => {
      const min = Number(quote / DOLLAR);
      return prev < min ? min : prev;
    });
  }, [quote]);

  const listing = useMemo(() => {
    if (kind === "token") {
      const tokenAddr = isAddress(token) ? token : null;
      return {
        kind: KIND.token,
        token: tokenAddr,
        name,
        ticker,
        link: url || "https://takehour.lol",
        valid: !!tokenAddr && isSafeName(name) && isSafeTicker(ticker),
      };
    }
    if (kind === "x") {
      const link = normalizeX(handle);
      return {
        kind: KIND.x,
        token: null,
        name: name || handle.replace(/^@/, ""),
        ticker: "",
        link,
        valid: !!link && isSafeName(name || handle.replace(/^@/, "")),
      };
    }
    const link = normalizeHttpsUrl(url);
    return {
      kind: KIND.url,
      token: null,
      name: name || (link ? new URL(link).hostname : ""),
      ticker: "",
      link,
      valid: !!link && isSafeName(name || (link ? new URL(link).hostname : "")),
    };
  }, [kind, token, handle, url, name, ticker]);

  const amount = BigInt(Math.max(0, Math.floor(dollars))) * DOLLAR;
  const sameIdentity =
    youHold &&
    live.kind === listing.kind &&
    (listing.kind === 1
      ? listing.token?.toLowerCase() === live.token.toLowerCase()
      : listing.link?.toLowerCase() === live.link.toLowerCase());

  const isRaise = youHold && (sameIdentity || isEmptyBid(live) === false) && sameIdentity;
  const pullAmount = isRaise ? amount - live.amount : amount;
  const minDollars = Number(quote / DOLLAR);
  const amountOk =
    amount >= quote && amount <= MAX_BID && amount % INCREMENT === 0n && pullAmount > 0n;

  const { data: balance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && hasCrownContract ? [address, crownAddress()] : undefined,
    query: { enabled: !!address && hasCrownContract, refetchInterval: 4000 },
  });

  const needsApprove = (allowance ?? 0n) < pullAmount;
  const lowBalance = (balance ?? 0n) < pullAmount;

  const { writeContractAsync } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (receipt.isSuccess && status === "taking") {
      setStatus("success");
      track("bid_confirmed");
      onTaken();
    }
  }, [receipt.isSuccess, status, onTaken]);

  useEffect(() => {
    if (!isAddress(token) || kind !== "token") return;
    let cancelled = false;
    (async () => {
      try {
        const [n, s] = await Promise.all([
          publicClient.readContract({
            address: token,
            abi: erc20Abi,
            functionName: "name",
          }),
          publicClient.readContract({
            address: token,
            abi: erc20Abi,
            functionName: "symbol",
          }),
        ]);
        if (cancelled) return;
        if (typeof n === "string" && n) setName((prev) => prev || sanitizeName(n).slice(0, 32));
        if (typeof s === "string" && s)
          setTicker((prev) => prev || sanitizeTicker(s).slice(0, 12));
      } catch {
        /* malformed token contracts are allowed; user supplies name */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, kind]);

  function bump(delta: number) {
    setDollars((d) => Math.max(minDollars, d + delta));
  }

  function onAmountChange(raw: string) {
    const cleaned = raw.replace(/[^\d]/g, "");
    if (cleaned === "") {
      setDollars(minDollars);
      return;
    }
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return;
    setDollars(Math.min(Number(MAX_BID / DOLLAR), n));
  }

  async function submit() {
    setError(null);
    if (!hasCrownContract) {
      setError("Contract not deployed on this network yet.");
      setStatus("error");
      return;
    }
    const crown = crownAddress();
    if (!listing.valid || !listing.link || !amountOk) return;
    if (secondsLeft <= 0) {
      setError("Hour ended. Quote refreshed.");
      onTaken();
      return;
    }

    try {
      const freshQuote = (await publicClient.readContract({
        address: crown,
        abi: crownAbi,
        functionName: "quoteTake",
      })) as bigint;
      const expectedHour = (await publicClient.readContract({
        address: crown,
        abi: crownAbi,
        functionName: "currentHourId",
      })) as bigint;
      if (expectedHour !== hourId) {
        setError("Hour ended. Quote refreshed.");
        onTaken();
        return;
      }
      if (!isRaise && amount < freshQuote) {
        setError(`Crown moved. New minimum is ${formatUsdc(freshQuote)}.`);
        onTaken();
        return;
      }

      const zero = "0x0000000000000000000000000000000000000000" as const;
      const args = {
        expectedHour,
        amount,
        kind: listing.kind,
        token: (listing.token ?? zero) as `0x${string}`,
        name: listing.name.slice(0, 32),
        ticker: listing.ticker.slice(0, 12),
        link: listing.link,
      };

      if (needsApprove) {
        setStatus("approving");
        track("approval_start");
        const approveHash = await writeContractAsync({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [crown, pullAmount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
        track("approval_success");
      }

      setStatus("confirm");
      if (isRaise) {
        await publicClient.simulateContract({
          address: crown,
          abi: crownAbi,
          functionName: "raise",
          args: [expectedHour, amount],
          account: address,
        });
        setStatus("taking");
        track("bid_submitted");
        const hash = await writeContractAsync({
          address: crown,
          abi: crownAbi,
          functionName: "raise",
          args: [expectedHour, amount],
        });
        setTxHash(hash);
      } else {
        await publicClient.simulateContract({
          address: crown,
          abi: crownAbi,
          functionName: "take",
          args: [
            args.expectedHour,
            args.amount,
            args.kind,
            args.token,
            args.name,
            args.ticker,
            args.link,
          ],
          account: address,
        });
        setStatus("taking");
        track("bid_submitted");
        const hash = await writeContractAsync({
          address: crown,
          abi: crownAbi,
          functionName: "take",
          args: [
            args.expectedHour,
            args.amount,
            args.kind,
            args.token,
            args.name,
            args.ticker,
            args.link,
          ],
        });
        setTxHash(hash);
      }
    } catch (err) {
      const fresh = await publicClient
        .readContract({
          address: crown,
          abi: crownAbi,
          functionName: "quoteTake",
        })
        .catch(() => quote);
      setError(userErrorMessage(err, fresh as bigint));
      setStatus("error");
      onTaken();
    }
  }

  const wrongNetwork = isConnected && chainId !== arcChain.id;
  const formReady = listing.valid && amountOk && !lowBalance;

  let cta = `Take crown — ${formatUsdc(amount)}`;
  if (!isConnected) cta = `Connect to take — ${formatUsdc(quote)}`;
  else if (wrongNetwork) cta = "Switch to Arc";
  else if (switching) cta = "Switch to Arc";
  else if (!hasCrownContract) cta = "Contract pending";
  else if (needsApprove && formReady) cta = `Approve ${formatUsdc(pullAmount)}`;
  else if (isRaise) cta = `Raise to ${formatUsdc(amount)}`;
  else if (status === "approving") cta = "Approve USDC first.";
  else if (status === "confirm") cta = "Confirm in wallet";
  else if (status === "taking") cta = "Taking…";

  const disabled =
    status === "approving" ||
    status === "confirm" ||
    status === "taking" ||
    switching ||
    (isConnected && !wrongNetwork && (!formReady || !hasCrownContract));

  return (
    <section className="border-t border-rule pt-8">
      {outbid ? (
        <div className="mb-8 border-t border-alert pt-4">
          <p className="text-sm text-ink">Your crown was taken.</p>
          <p className="mt-2 font-mono text-lg tabular text-ink">
            Take it back — {formatUsdc(quote)}
          </p>
        </div>
      ) : null}

      <p className="label-kicker">{youHold ? "Raise" : "Take it"}</p>

      <div
        role="tablist"
        aria-label="Listing type"
        className="mt-5 flex gap-6 border-b border-rule"
      >
        {(["token", "x", "url"] as ListingKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            className={
              "pb-2 text-sm uppercase tracking-[0.14em] " +
              (kind === k
                ? "border-b border-ink text-ink"
                : "border-b border-transparent text-mute")
            }
            onClick={() => {
              if (!started.current) {
                started.current = true;
                track("bid_form_start");
              }
              setKind(k);
            }}
          >
            {k === "x" ? "X" : k}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {kind === "token" ? (
          <label className="block">
            <span className="label-kicker">Token</span>
            <input
              className="field font-mono"
              placeholder="0x…"
              value={token}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setToken(e.target.value.trim())}
            />
          </label>
        ) : null}
        {kind === "x" ? (
          <label className="block">
            <span className="label-kicker">Handle</span>
            <input
              className="field"
              placeholder="@handle"
              value={handle}
              autoComplete="off"
              onChange={(e) => setHandle(e.target.value)}
            />
            {normalizeX(handle) ? (
              <span className="mt-1 block font-mono text-tick text-mute">
                {normalizeX(handle)}
              </span>
            ) : null}
          </label>
        ) : null}
        {kind === "url" || kind === "token" ? (
          <label className="block">
            <span className="label-kicker">{kind === "url" ? "HTTPS URL" : "Link"}</span>
            <input
              className="field"
              placeholder="https://"
              value={url}
              inputMode="url"
              autoComplete="off"
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="label-kicker">Name</span>
            <input
              className="field"
              value={name}
              maxLength={32}
              onChange={(e) => setName(sanitizeName(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="label-kicker">Ticker</span>
            <input
              className="field font-mono"
              value={ticker}
              maxLength={12}
              onChange={(e) => setTicker(sanitizeTicker(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="mt-8">
        <p className="label-kicker">Bid</p>
        <div className="mt-2 flex items-baseline gap-1 font-mono text-price tabular text-ink">
          <span>$</span>
          <input
            className="w-full min-w-0 bg-transparent text-price tabular outline-none"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(dollars)}
            aria-label="Bid amount in dollars"
            onChange={(e) => onAmountChange(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" className="btn-step" onClick={() => bump(-1)} disabled={dollars <= minDollars}>
            − $1
          </button>
          <button type="button" className="btn-step" onClick={() => bump(1)}>
            + $1
          </button>
        </div>
        <p className="mt-3 text-tick text-mute">
          Minimum to take {formatUsdc(quote)}
          {isRaise ? ` · pay ${formatUsdc(pullAmount)} more` : ""}
        </p>
      </div>

      {address && balance !== undefined ? (
        <p className="mt-4 font-mono text-tick text-secondary">
          USDC {formatUsdcBalance(balance)}
        </p>
      ) : null}

      {lowBalance && isConnected ? (
        <p className="mt-3 text-sm text-alert" role="alert">
          Need {formatUsdc(pullAmount)} to take.
          {onrampEnabled ? " Add USDC, then bid." : null}{" "}
          <a
            href={faucetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Get testnet USDC
          </a>
        </p>
      ) : null}

      <div className="mt-6">
        <button
          type="button"
          className="btn-take"
          disabled={disabled && isConnected && !wrongNetwork}
          onClick={async () => {
            if (!isConnected) {
              setConnectOpen(true);
              return;
            }
            if (wrongNetwork) {
              try {
                await switchChainAsync({ chainId: arcChain.id });
              } catch {
                setError("Switch to Arc");
              }
              return;
            }
            await submit();
          }}
        >
          {cta}
        </button>
        <p className="mt-3 text-tick text-mute">Gas is USDC on Arc.</p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-alert" role="alert">
          {error}
        </p>
      ) : null}

      {status === "success" && txHash ? (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <p className="text-sm text-bid">
            Crown taken. {truncateAddress(txHash)} ·{" "}
            <a
              href={explorerTx(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              view
            </a>
          </p>
          <ShareHour hourId={hourId} amount={amount} secondsLeft={secondsLeft} />
        </div>
      ) : youHold ? (
        <div className="mt-6">
          <ShareHour
            hourId={hourId}
            amount={live.amount || amount}
            secondsLeft={secondsLeft}
          />
        </div>
      ) : null}

      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </section>
  );
}
