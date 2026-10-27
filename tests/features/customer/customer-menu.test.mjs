import assert from "node:assert/strict";
import test from "node:test";
import { bindCustomerMenu } from "../../../src/features/customer/customer-menu.ts";

function fixture() {
  const style = (value = "", priority = "") => ({
    value, priority,
    getPropertyValue() { return this.value; },
    getPropertyPriority() { return this.priority; },
    setProperty(_name, value, priority = "") { this.value = value; this.priority = priority; },
    removeProperty() { this.value = ""; this.priority = ""; },
  });
  const desktop = Object.assign(new EventTarget(), { matches: false });
  const documentElement = { style: style("auto", "important") }, body = { style: style() };
  const document = { documentElement, body, defaultView: { matchMedia: () => desktop }, activeElement: null };
  const controls = [0, 1, 2].map(() => ({ getClientRects: () => [1], focus() { document.activeElement = this; } }));
  const dialog = Object.assign(new EventTarget(), {
    open: false,
    ownerDocument: document,
    querySelectorAll: () => controls,
    close() { this.open = false; this.dispatchEvent(new Event("close")); },
    showModal() { this.open = true; this.dispatchEvent(new Event("toggle")); },
  });
  const trigger = { expanded: "false", setAttribute(_name, value) { this.expanded = value; } };
  const dispose = bindCustomerMenu(dialog, trigger);
  return { dialog, trigger, desktop, documentElement, body, document, controls, dispose };
}

test("menu locks background scroll and restores original styles after every close", () => {
  const f = fixture();
  for (let count = 0; count < 2; count++) {
    f.dialog.showModal();
    assert.equal(f.trigger.expanded, "true");
    assert.equal(f.documentElement.style.value, "hidden");
    assert.equal(f.body.style.value, "hidden");
    f.dialog.close();
    assert.equal(f.trigger.expanded, "false");
    assert.equal(f.documentElement.style.value, "auto");
    assert.equal(f.documentElement.style.priority, "important");
    assert.equal(f.body.style.value, "");
  }
  f.dispose();
});

test("desktop breakpoint closes the modal and releases its scroll lock", () => {
  const f = fixture();
  f.dialog.showModal();
  f.desktop.dispatchEvent(new Event("change"));
  assert.equal(f.dialog.open, true);
  f.desktop.matches = true;
  f.desktop.dispatchEvent(new Event("change"));
  assert.equal(f.dialog.open, false);
  assert.equal(f.trigger.expanded, "false");
  assert.equal(f.body.style.value, "");
  f.dispose();
});

test("unmount cleans up an open modal and removes lifecycle listeners", () => {
  const f = fixture();
  f.dialog.showModal();
  f.dispose();
  assert.equal(f.dialog.open, false);
  assert.equal(f.documentElement.style.value, "auto");
  assert.equal(f.body.style.value, "");
  f.dialog.showModal();
  assert.equal(f.trigger.expanded, "false");
  assert.equal(f.body.style.value, "");
});

test("Tab wraps between the last and first visible menu controls in both directions", () => {
  const f = fixture();
  const tab = (shiftKey = false) => {
    const event = Object.assign(new Event("keydown", { cancelable: true }), { key: "Tab", shiftKey });
    f.dialog.dispatchEvent(event);
    return event.defaultPrevented;
  };
  f.controls[2].focus();
  assert.equal(tab(), true);
  assert.equal(f.document.activeElement, f.controls[0]);
  assert.equal(tab(true), true);
  assert.equal(f.document.activeElement, f.controls[2]);
  f.controls[1].focus();
  assert.equal(tab(), false);
  f.dispose();
});
