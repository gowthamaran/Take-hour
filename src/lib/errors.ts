import { formatUsdc } from "./usdc";

export function userErrorMessage(error: unknown, quote?: bigint): string {
  const raw =
    error instanceof Error
      ? `${error.name} ${error.message} ${"shortMessage" in error ? String((error as { shortMessage?: string }).shortMessage) : ""}`
      : String(error);
  const text = raw.toLowerCase();

  if (text.includes("hourexpired")) return "Hour ended. Quote refreshed.";
  if (text.includes("bidtoolow")) {
    return quote !== undefined
      ? `Crown moved. New minimum is ${formatUsdc(quote)}.`
      : "Crown moved. Quote refreshed.";
  }
  if (text.includes("bidtoohigh")) return "Amount exceeds the maximum bid.";
  if (text.includes("notwholedollar")) return "Bids are whole dollars only.";
  if (text.includes("invalidname")) return "Name must be 1–32 printable characters.";
  if (text.includes("invalidlink") || text.includes("invalidurl"))
    return "Use a valid https link.";
  if (text.includes("invalidkind") || text.includes("invalidtoken"))
    return "Listing is not valid.";
  if (text.includes("notholder")) return "Only the current holder can raise.";
  if (text.includes("user rejected") || text.includes("user denied") || text.includes("rejected the request"))
    return "Transaction rejected.";
  if (text.includes("insufficient funds") || text.includes("exceeds balance") || text.includes("transfer amount exceeds"))
    return "Insufficient USDC.";
  if (text.includes("allowance") || text.includes("insufficient allowance"))
    return "Approve USDC first.";
  if (text.includes("contract not configured") || text.includes("not deployed"))
    return "Contract not deployed on this network yet.";

  console.error("[hour]", error);
  return "Transaction failed. Quote refreshed.";
}
