import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(new URL("../../../src/features/auth/demo-account-switch.tsx", import.meta.url));
const source = readFileSync(new URL("../../../src/features/auth/demo-account-switch.tsx", import.meta.url), "utf8");
function harness(localTestEnabled, session, busy = false) {
  const events = []; let finish, reject, pending;
  const menu = { current: { open: true, querySelector: () => ({ focus: () => events.push("focus") }) } };
  const componentModule = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const stubs = {
    react: { useRef: () => menu },
    "next/navigation": { useRouter: () => ({ replace: path => events.push(path) }) },
    "./api-session": { useApiSession: () => ({ session, localTestEnabled, signInLocalTest: username => {
      events.push(["sign-in", username]); return new Promise((resolve, fail) => { finish = resolve; reject = fail; });
    } }) },
    "../../hooks/backend-hooks": { useCommand: () => ({ busy, error: "", run: (action) => {
      events.push("busy"); pending = action().catch(() => events.push("error")); return pending;
    } }) },
    "../workspace/workspace-access": { API_ROLES: { customer: "Customer", worker: "Worker", admin: "Admin" } },
    "../workspace/workspace-routes": { ROLE_ROOTS: { Customer: "/customer", Worker: "/staff", Admin: "/admin" } },
    "../../components/appearance/icons": { Icon: () => null },
  };
  runInNewContext(code, { module: componentModule, exports: componentModule.exports, require: name => stubs[name] ?? require(name) });
  return { element: componentModule.exports.DemoAccountSwitch(), events, menu,
    finish: role => finish({ account: { role } }), fail: () => reject(new Error("unavailable")), settled: () => pending };
}
const session = { localTest: true, account: { username: "pim.admin" } };
const buttons = h => h.element.props.children[1].props.children[1];

test("switch is hidden for ordinary sessions, absent sessions and disabled local-test mode", () => {
  for (const [enabled, account] of [[false, session], [true, null], [true, { account: session.account }]]) {
    assert.equal(harness(enabled, account).element, null);
  }
});

test("menu selection switches immediately using server role without visiting login", async () => {
  const h = harness(true, session);
  assert.equal(h.element.type, "details"); assert.deepEqual(h.events, []);
  assert.equal(buttons(h).length, 6); assert.equal(buttons(h)[0].props.disabled, true);
  buttons(h)[1].props.onClick();
  assert.deepEqual(h.events, ["busy", ["sign-in", "anan.staff"]]);
  h.finish("customer"); await h.settled();
  assert.deepEqual(h.events, ["busy", ["sign-in", "anan.staff"], "/customer"]);
  assert.equal(h.menu.current.open, false);
});

test("busy/current-account actions do nothing and cancel only closes the menu", () => {
  const h = harness(true, session);
  buttons(h)[0].props.onClick(); assert.deepEqual(h.events, []);
  h.element.props.children[1].props.children[4].props.onClick();
  assert.equal(h.menu.current.open, false); assert.deepEqual(h.events, ["focus"]);
  const pending = harness(true, session, true);
  for (const button of buttons(pending)) { assert.equal(button.props.disabled, true); button.props.onClick(); }
  assert.deepEqual(pending.events, []);
});

test("failed selection leaves picker open without navigating or signing out", async () => {
  const h = harness(true, session); buttons(h)[1].props.onClick();
  h.fail(); await h.settled();
  assert.equal(h.menu.current.open, true);
  assert.deepEqual(h.events, ["busy", ["sign-in", "anan.staff"], "error"]);
});
