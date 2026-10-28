import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getServerTheme, getServerUiSize, getTheme, getUiSize, saveTheme, saveUiSize, subscribeAppearance } from "../../../src/components/appearance/appearance-preferences.ts";
import { getCustomerTheme, getServerCustomerTheme } from "../../../src/features/customer/customer-preferences.ts";

afterEach(() => {
  browser();
  saveTheme("dark");
  saveUiSize("medium");
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

function browser(light = false, blocked = false, writeBlocked = false) {
  const values = new Map<string, string>();
  const events = new EventTarget();
  const media = new EventTarget();
  let systemLight = light;
  const dataset: Record<string, string> = {};
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { dataset } } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem(key: string) { if (blocked) throw new Error("Storage blocked"); return values.get(key) ?? null; },
      setItem(key: string, value: string) { if (blocked || writeBlocked) throw new Error("Storage blocked"); values.set(key, value); },
    },
    matchMedia: () => ({ get matches() { return systemLight; }, addEventListener: media.addEventListener.bind(media), removeEventListener: media.removeEventListener.bind(media) }),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  } });
  return { values, dataset, events, setSystemLight(value: boolean) { systemLight = value; media.dispatchEvent(new Event("change")); } };
}

test("server snapshots are stable without browser globals", () => {
  assert.equal(getServerTheme(), "dark");
  assert.equal(getServerUiSize(), "medium");
  assert.equal(getServerCustomerTheme(), "dark");
});

test("saved preferences override system defaults and support the legacy size key", () => {
  const { values } = browser(true);
  assert.equal(getTheme(), "light");
  assert.equal(getCustomerTheme(), "light");
  assert.equal(getUiSize(), "medium");
  values.set("lathe-theme", "dark");
  values.set("lathe-text-size", "large");
  assert.equal(getTheme(), "dark");
  assert.equal(getCustomerTheme(), "dark");
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
  assert.equal(getCustomerTheme(), "light");
});

test("readable stale storage cannot override a current-page choice after a failed write", () => {
  const { values } = browser(false, false, true);
  values.set("lathe-theme", "dark");
  values.set("lathe-ui-size", "large");
  saveTheme("light");
  saveUiSize("small");
  assert.equal(getTheme(), "light");
  assert.equal(getCustomerTheme(), "light");
  assert.equal(getUiSize(), "small");
  assert.equal(values.get("lathe-theme"), "dark");
});

test("system theme updates all subscribers, explicit preferences win and cleanup removes listeners", () => {
  const { values, setSystemLight } = browser();
  let notifications = 0;
  const unsubscribe = subscribeAppearance(() => notifications++);
  setSystemLight(true);
  assert.equal(notifications, 1);
  assert.equal(getTheme(), "light");
  assert.equal(getCustomerTheme(), "light");
  values.set("lathe-theme", "dark");
  setSystemLight(false);
  setSystemLight(true);
  assert.equal(getCustomerTheme(), "dark");
  unsubscribe();
  const previous = notifications;
  setSystemLight(false);
  assert.equal(notifications, previous);
});
