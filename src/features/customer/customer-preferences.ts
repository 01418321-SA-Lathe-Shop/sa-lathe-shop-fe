import { getTheme } from "../../components/appearance/appearance-preferences";
import type { Theme } from "../../components/appearance/appearance-preferences";

// Honor a saved preference; the approved customer surface is light for first use.
// Staff/Admin retain their existing default. No auth data is stored here.
export function getCustomerTheme(): Theme {
  try { const saved = window.localStorage.getItem("lathe-theme"); return saved === "dark" ? "dark" : "light"; }
  catch { return getTheme(); }
}
export function getServerCustomerTheme(): Theme { return "light"; }
