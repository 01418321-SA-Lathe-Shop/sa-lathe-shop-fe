export type Theme = "dark" | "light";
export type UiSize = "small" | "medium" | "large";

const changeEvent = "lathe-appearance-change";

export function getServerTheme(): Theme { return "dark"; }
export function getServerUiSize(): UiSize { return "medium"; }

export function getTheme(): Theme {
  try {
    const saved = window.localStorage.getItem("lathe-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "dark") return current;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getUiSize(): UiSize {
  try {
    const saved = window.localStorage.getItem("lathe-ui-size") ?? window.localStorage.getItem("lathe-text-size");
    return saved === "small" || saved === "large" ? saved : "medium";
  } catch {
    const current = document.documentElement.dataset.uiSize;
    return current === "small" || current === "large" ? current : "medium";
  }
}

export function subscribeAppearance(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || ["lathe-theme", "lathe-ui-size", "lathe-text-size"].includes(event.key)) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, onChange);
  };
}

export function saveTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try { window.localStorage.setItem("lathe-theme", theme); } catch { /* Keep the current-page preference. */ }
  window.dispatchEvent(new Event(changeEvent));
}

export function saveUiSize(size: UiSize) {
  document.documentElement.dataset.uiSize = size;
  try { window.localStorage.setItem("lathe-ui-size", size); } catch { /* Keep the current-page preference. */ }
  window.dispatchEvent(new Event(changeEvent));
}
