import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../../../src/features/auth/demo-account-switch.tsx", import.meta.url), "utf8");
function harness(localTestEnabled, session, busy = false) {
  const events = []; let finish;
  const componentModule = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(code, { module: componentModule, exports: componentModule.exports, require: name => name === "react" ? { useState: () => [busy, () => events.push("busy")] } : name === "next/navigation" ? { useRouter: () => ({ push: path => events.push(path) }) } : name === "./api-session" ? { useApiSession: () => ({ session, localTestEnabled, signOut: () => { events.push("logout"); return new Promise(resolve => { finish = resolve; }); } }) } : name.endsWith("icons") ? { Icon: () => null } : require(name) });
  return { button: componentModule.exports.DemoAccountSwitch(), events, finish: () => finish() };
}
test("switch is hidden for ordinary sessions, absent sessions and disabled local-test mode", () => {
  for (const [enabled, session] of [[false, { localTest: true }], [true, null], [true, { account: { username: "pim.admin" } }]]) assert.equal(harness(enabled, session).button, null);
});
test("test-account switch waits for logout before opening the existing picker", async () => {
  const h = harness(true, { localTest: true });
  assert.equal(h.button.props.type, "button");
  h.button.props.onClick();
  assert.deepEqual(h.events, ["busy", "logout"]);
  h.finish(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.events, ["busy", "logout", "/login?accounts=test"]);
  const pending = harness(true, { localTest: true }, true);
  assert.equal(pending.button.props.disabled, true); pending.button.props.onClick(); assert.deepEqual(pending.events, []);
});
