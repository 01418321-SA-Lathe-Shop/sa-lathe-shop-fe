// All workspaces use the same preference, storage-failure fallback and system default.
// Keep the Customer adapter names stable for existing consumers. No auth data is stored.
export { getTheme as getCustomerTheme, getServerTheme as getServerCustomerTheme } from "../../components/appearance/appearance-preferences.ts";
