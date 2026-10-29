import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { isLocalTestLoginEnabled, localTestLoginError } from "../../../src/features/auth/local-test-login.ts";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../../../src/features/auth/api-session.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });

function sessionHarness(failLogin = false, localEnabled = false, base = "https://api.test") {
  const calls = [], instances = [];
  let stateIndex = 0, savedSession = null, savedNotice = "";
  const account = { id: "test-account", role: "customer", username: "test-customer" };
  class TestApi {
    constructor(base) { calls.push(["base", base]); instances.push(this); }
    async login(username, password) {
      calls.push(["login", username, password]);
      if (failLogin) throw new Error("connection unavailable");
      return { expires_at: "2099-01-01T00:00:00Z" };
    }
    async call(path) { calls.push(["read", path]); return account; }
    async loginLocalTest(username) {
      calls.push(["local-login", username]);
      if (failLogin) throw new Error("connection unavailable");
      return { expires_at: "2099-01-01T00:00:00Z" };
    }
    close() { calls.push(["close"]); }
    async logout() { calls.push(["logout"]); }
  }
  const componentModule = { exports: {} };
  const hooks = {
    createContext: () => ({ Provider: "session-provider" }),
    useCallback: (callback) => callback, useMemo: (factory) => factory(),
    useRef: () => ({ current: null }), useState: (initial) => {
      const index = stateIndex++;
      return [initial, (value) => { if (index === 0) savedSession = value; else savedNotice = value; }];
    },
    useEffect() {},
  };
  runInNewContext(outputText, {
    Error,
    module: componentModule, exports: componentModule.exports,
    process: { env: { NEXT_PUBLIC_API_BASE_URL: base, NEXT_PUBLIC_LOCAL_TEST_LOGIN_ENABLED: localEnabled ? "true" : undefined } },
    require: (name) => name === "react/jsx-runtime" ? require(name) : name === "react" ? hooks : name === "../../lib/api/backend-api" ? { BackendApi: TestApi } : name === "./local-test-login" ? { isLocalTestLoginEnabled, localTestLoginError } : assert.fail(`Unexpected import: ${name}`),
  });
  const context = componentModule.exports.ApiSessionProvider({ children: null }).props.value;
  return { context, calls, instances, account, state: () => ({ session: savedSession, notice: savedNotice }) };
}

test("session login uses configured API then /auth/me, without a mode selector", async () => {
  const { context, calls, account } = sessionHarness();
  const session = await context.signIn("test-customer", "test-only-password");
  assert.deepEqual(calls, [["base", "https://api.test"], ["login", "test-customer", "test-only-password"], ["read", "/auth/me"]]);
  assert.equal(session.account, account);
  assert.equal(session.localTest, undefined);
  assert.equal("mode" in session, false);
  assert.equal("mock" in context, false);
  assert.equal("resetMock" in context, false);
});

test("failed login closes its client and does not retry with sample accounts", async () => {
  const { context, calls, instances } = sessionHarness(true);
  await assert.rejects(context.signIn("test-customer", "test-only-password"), /connection unavailable/);
  assert.equal(instances.length, 1);
  assert.deepEqual(calls.map(([action]) => action), ["base", "login", "close"]);
});

test("sign out still calls the backend logout for the active session", async () => {
  const { context, calls } = sessionHarness();
  await context.signIn("test-customer", "test-only-password");
  assert.match(await context.signOut(), /Server session revoked/);
  assert.deepEqual(calls.at(-1), ["logout"]);
});

test("local test login requires an explicit opt-in and a loopback API", async () => {
  for (const [flag, base] of [[false, "http://localhost:8080"], [true, "https://api.test"]]) {
    const { context, calls } = sessionHarness(false, flag, base);
    assert.equal(context.localTestEnabled, false);
    await assert.rejects(context.signInLocalTest("pim.admin"), /Frontend/);
    assert.deepEqual(calls, []);
  }
});

test("local test session confirms /auth/me and retains backend logout", async () => {
  const { context, calls, account } = sessionHarness(false, true, "http://localhost:8080");
  const session = await context.signInLocalTest("pim.admin");
  assert.equal(context.localTestEnabled, true);
  assert.equal(session.localTest, true);
  assert.equal(session.account, account);
  assert.deepEqual(calls, [["base", "http://localhost:8080"], ["local-login", "pim.admin"], ["read", "/auth/me"]]);
  await context.signOut(); assert.deepEqual(calls.at(-1), ["logout"]);
});

test("failed local test login closes its client without password or fixture fallback", async () => {
  const { context, calls } = sessionHarness(true, true, "http://localhost:8080");
  await assert.rejects(context.signInLocalTest("pim.admin"), /connection unavailable/);
  assert.deepEqual(calls.map(([action]) => action), ["base", "local-login", "close"]);
});

test("switch confirms the replacement before revoking the previous session without a signed-out gap", async () => {
  const h = sessionHarness(false, true, "http://localhost:8080");
  const previous = await h.context.signInLocalTest("pim.admin");
  let release;
  h.instances[0].logout = () => { h.calls.push(["previous-logout"]); return new Promise((resolve) => { release = resolve; }); };
  const pending = h.context.signInLocalTest("somchai");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.state().session, previous);
  assert.deepEqual(h.calls.slice(-2), [["read", "/auth/me"], ["previous-logout"]]);
  release(); const next = await pending;
  assert.notEqual(next.api, previous.api); assert.equal(h.state().session, next);
  assert.equal(next.localTest, true);
});

test("failed replacement identity read preserves the current session and revokes the candidate", async () => {
  const h = sessionHarness(false, true, "http://localhost:8080");
  const previous = await h.context.signInLocalTest("pim.admin");
  const pending = h.context.signInLocalTest("somchai");
  h.instances[1].call = async () => { throw new Error("identity unavailable"); };
  await assert.rejects(pending, /identity unavailable/);
  assert.equal(h.state().session, previous);
  assert.deepEqual(h.calls.slice(-2), [["logout"], ["close"]]);
});

test("uncertain old-session logout clears local state instead of silently adopting the new account", async () => {
  const h = sessionHarness(false, true, "http://localhost:8080");
  await h.context.signInLocalTest("pim.admin");
  h.instances[0].logout = async () => { throw new Error("lost logout response"); };
  await assert.rejects(h.context.signInLocalTest("somchai"), /logout could not be confirmed/);
  assert.equal(h.state().session, null);
  assert.match(h.state().notice, /may remain valid until expiry/);
  assert.deepEqual(h.calls.slice(-2), [["logout"], ["close"]]);
});

test("sign-out during a pending replacement prevents the candidate from restoring a session", async () => {
  const h = sessionHarness(false, true, "http://localhost:8080");
  await h.context.signInLocalTest("pim.admin");
  const pending = h.context.signInLocalTest("somchai");
  let release;
  h.instances[1].call = () => new Promise((resolve) => { release = resolve; });
  await new Promise((resolve) => setImmediate(resolve));
  await h.context.signOut(); release(h.account);
  await assert.rejects(pending, /active account changed/);
  assert.equal(h.state().session, null);
});
