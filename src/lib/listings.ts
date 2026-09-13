import { zeroAddress } from "./env";

export type ListingKind = "token" | "x" | "url";

export const KIND = {
  token: 1,
  x: 2,
  url: 3,
} as const;

export function kindFromNumber(kind: number): ListingKind | null {
  if (kind === 1) return "token";
  if (kind === 2) return "x";
  if (kind === 3) return "url";
  return null;
}

const HANDLE_RE = /^[A-Za-z0-9_]{1,32}$/;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isAddress(value: string): value is `0x${string}` {
  return ADDRESS_RE.test(value);
}

export function stripAt(handle: string): string {
  return handle.trim().replace(/^@+/, "");
}

export function normalizeX(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let handle = stripAt(raw);
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");
      if (host !== "x.com" && host !== "twitter.com") return null;
      handle = stripAt(url.pathname.split("/").filter(Boolean)[0] ?? "");
    }
  } catch {
    return null;
  }
  if (!HANDLE_RE.test(handle)) return null;
  return `https://x.com/${handle}`;
}

export function xHandleFromLink(link: string): string {
  try {
    const url = new URL(link);
    const handle = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return handle ? `@${handle}` : link;
  } catch {
    return link;
  }
}

export function normalizeHttpsUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const scheme = url.protocol.toLowerCase();
  if (scheme !== "https:") return null;
  const forbidden = ["javascript:", "data:", "file:", "vbscript:", "blob:", "about:"];
  if (forbidden.includes(scheme)) return null;
  if (/[<>"'\\]/.test(url.href)) return null;
  if (url.href.length > 128) return null;
  return url.href;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function sanitizeName(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "").slice(0, 32);
}

export function sanitizeTicker(value: string): string {
  return value.replace(/[^\x21-\x7E]/g, "").slice(0, 12);
}

export function isSafeName(value: string): boolean {
  return value.length >= 1 && value.length <= 32 && /^[\x20-\x7E]+$/.test(value) && value.trim().length > 0;
}

export function isSafeTicker(value: string): boolean {
  return value.length === 0 || (value.length <= 12 && /^[\x21-\x7E]+$/.test(value));
}

export function listingHref(kind: number, token: string, link: string): string | null {
  if (kind === 1 && isAddress(token) && token !== zeroAddress) return null;
  if ((kind === 2 || kind === 3) && link.startsWith("https://")) return link;
  return link.startsWith("https://") ? link : null;
}
