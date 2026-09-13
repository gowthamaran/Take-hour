export type HourEvent =
  | "page_view"
  | "crown_outbound_click"
  | "share_click"
  | "bid_form_start"
  | "wallet_connect"
  | "approval_start"
  | "approval_success"
  | "bid_submitted"
  | "bid_confirmed";

export function track(event: HourEvent, props?: Record<string, string | number | boolean>) {
  try {
    window.dispatchEvent(new CustomEvent("hour:track", { detail: { event, props } }));
  } catch {
    /* analytics must never break the product */
  }
}
