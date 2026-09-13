export const USDC_DECIMALS = 6;
export const DOLLAR = 1_000_000n;
export const MIN_BID = DOLLAR;
export const INCREMENT = DOLLAR;
export const MAX_BID = 1_000_000_000_000n;

export function parseUsdc(dollars: bigint): bigint {
  return dollars * DOLLAR;
}

export function dollarsFromUsdc(amount: bigint): bigint {
  return amount / DOLLAR;
}

export function isWholeDollar(amount: bigint): boolean {
  return amount % DOLLAR === 0n && amount > 0n;
}

export function formatUsdc(amount: bigint): string {
  const dollars = amount / DOLLAR;
  return `$${dollars.toLocaleString("en-US")}`;
}

export function formatUsdcBalance(amount: bigint): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const dollars = abs / DOLLAR;
  const cents = Number((abs % DOLLAR) / 10_000n)
    .toString()
    .padStart(2, "0");
  const whole = dollars.toLocaleString("en-US");
  const sign = negative ? "-" : "";
  if (abs % DOLLAR === 0n) return `${sign}$${whole}`;
  return `${sign}$${whole}.${cents}`;
}
