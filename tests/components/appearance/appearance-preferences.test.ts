import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getServerTheme, getServerUiSize, getTheme, getUiSize, saveTheme, saveUiSize, subscribeAppearance } from "../../../app/appearance-preferences.ts";

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

function browser(light = false, blocked = false) {
  const values = new Map<string, string>();
  const events = new EventTarget();
  const dataset: Record<string, string> = {};
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { dataset } } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem(key: string) { if (blocked) throw new Error("Storage blocked"); return values.get(key) ?? null; },
      setItem(key: string, value: string) { if (blocked) throw new Error("Storage blocked"); values.set(key, value); },
    },
    matchMedia: () => ({ matches: light }),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  } });
  return { values, dataset, events };
}

test("server snapshots are stable without browser globals", () => {
  assert.equal(getServerTheme(), "dark");
  assert.equal(getServerUiSize(), "medium");
});

test("saved preferences override system defaults and support the legacy size key", () => {
  const { values } = browser(true);
  assert.equal(getTheme(), "light");
  assert.equal(getUiSize(), "medium");
  values.set("lathe-theme", "dark");
  values.set("lathe-text-size", "large");
  assert.equal(getTheme(), "dark");
  assert.equal(getUiSize(), "large");
  values.set("lathe-ui-size", "small");
  assert.equal(getUiSize(), "small");
  values.set("lathe-ui-size", "invalid");
  assert.equal(getUiSize(), "medium");
});

test("settings changes update storage, document and subscribers; unsubscribe cleans up", () => {
  const { values, dataset, events } = browser();
  let notifications = 0;
  const unsubscribe = subscribeAppearance(() => notifications++);
  saveTheme("light");
  saveUiSize("large");
  assert.equal(values.get("lathe-theme"), "light");
  assert.equal(values.get("lathe-ui-size"), "large");
  assert.deepEqual(dataset, { theme: "light", uiSize: "large" });
  assert.equal(notifications, 2);
  const storageEvent = new Event("storage");
  Object.defineProperty(storageEvent, "key", { value: "lathe-theme" });
  events.dispatchEvent(storageEvent);
  assert.equal(notifications, 3);
  unsubscribe();
  saveTheme("dark");
  events.dispatchEvent(storageEvent);
  assert.equal(notifications, 3);
});

test("blocked storage still allows current-page theme and size changes", () => {
  browser(false, true);
  assert.equal(getTheme(), "dark");
  assert.equal(getUiSize(), "medium");
  saveTheme("light");
  saveUiSize("small");
  assert.equal(getTheme(), "light");
  assert.equal(getUiSize(), "small");
});
