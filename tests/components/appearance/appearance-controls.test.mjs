import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../../../src/components/appearance/appearance.tsx", import.meta.url), "utf8");
function controls(theme) {
  const changes = [];
  const react = { ...require("react"), createContext: () => ({}), useContext: () => ({ onTheme: value => changes.push(value), onUiSize: () => {} }), useSyncExternalStore: (_, read) => read(), useId: () => "settings", useRef: () => ({ current: null }) };
  const componentModule = { exports: {} };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, { module: componentModule, exports: componentModule.exports, require: name => name === "react" ? react : name === "./icons" ? { Icon: () => null } : name === "../ui/style-scopes" ? {} : name === "./appearance-preferences" ? { getTheme: () => theme, getUiSize: () => "medium" } : require(name) });
  return { ...componentModule.exports, changes };
}
function elements(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
}
test("theme is one icon-only immediate action with the destination in its accessible name", () => {
  for (const [current, next, icon, label] of [["dark", "light", "sun", "เปลี่ยนเป็นธีมสว่าง"], ["light", "dark", "moon", "เปลี่ยนเป็นธีมมืด"]]) {
    const control = controls(current); const button = control.ThemeToggle();
    assert.equal(button.type, "button"); assert.equal(button.props.type, "button");
    assert.equal(button.props["aria-label"], label); assert.equal(button.props.title, label);
    assert.equal(button.props.children.props.name, icon); assert.equal(button.props["aria-haspopup"], undefined);
    button.props.onClick(); assert.deepEqual(control.changes, [next]);
  }
});
test("Settings retains size choices and has no theme radios", () => {
  const nodes = elements(controls("dark").SettingsToggle());
  assert.deepEqual(nodes.filter(n => n.type === "input").map(n => n.props.value), ["small", "medium", "large"]);
  assert.equal(nodes.filter(n => n.type === "legend").length, 1);
  assert.equal(nodes.find(n => n.type === "legend").props.children, "ขนาดการแสดงผล");
});
