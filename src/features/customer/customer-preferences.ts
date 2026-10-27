import type { Theme } from "../../components/appearance/appearance-preferences";

// Honor a saved preference; the customer surface defaults to dark to match the landing page aesthetic.
// Staff/Admin retain their existing default. No auth data is stored here.
export function getCustomerTheme(): Theme {
  try { const saved = window.localStorage.getItem("lathe-theme"); return saved === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}
export function getServerCustomerTheme(): Theme { return "dark"; }
