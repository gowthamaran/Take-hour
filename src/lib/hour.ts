export const HOUR_SECONDS = 3600;

export function hourIdFromUnix(unix: number): bigint {
  return BigInt(Math.floor(unix / HOUR_SECONDS));
}

export function currentHourId(nowMs = Date.now()): bigint {
  return hourIdFromUnix(Math.floor(nowMs / 1000));
}

export function secondsLeftInHour(nowMs = Date.now()): number {
  const unix = Math.floor(nowMs / 1000);
  const rem = unix % HOUR_SECONDS;
  return rem === 0 ? 0 : HOUR_SECONDS - rem;
}

export function hourStartUnix(hourId: bigint): number {
  return Number(hourId) * HOUR_SECONDS;
}

export function hourEndUnix(hourId: bigint): number {
  return Number(hourId + 1n) * HOUR_SECONDS;
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function formatUtcTime(unix: number): string {
  const d = new Date(unix * 1000);
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const ss = d.getUTCSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

export function formatUtcShort(unix: number): string {
  const d = new Date(unix * 1000);
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatUtcHourStamp(unix: number): string {
  const d = new Date(unix * 1000);
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

export function isValidHourId(value: string): boolean {
  return /^\d+$/.test(value) && BigInt(value) >= 0n;
}
