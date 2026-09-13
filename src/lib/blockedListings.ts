const blocked = new Set<string>([
  // lowercase token addresses or normalized links
]);

export function isBlockedListing(token: string, link: string): boolean {
  const tokenKey = token.toLowerCase();
  const linkKey = link.toLowerCase();
  return blocked.has(tokenKey) || blocked.has(linkKey);
}
