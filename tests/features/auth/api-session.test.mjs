import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../../../src/features/auth/api-session.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });

function sessionHarness(failLogin = false) {
  const calls = [], instances = [];
  const account = { id: "test-account", role: "customer", username: "test-customer" };
  class TestApi {
    constructor(base) { calls.push(["base", base]); instances.push(this); }
    async login(username, password) {
      calls.push(["login", username, password]);
      if (failLogin) throw new Error("connection unavailable");
      return { expires_at: "2099-01-01T00:00:00Z" };
    }
    async call(path) { calls.push(["read", path]); return account; }
    close() { calls.push(["close"]); }
    async logout() { calls.push(["logout"]); }
  }
  const componentModule = { exports: {} };
  const hooks = {
    createContext: () => ({ Provider: "session-provider" }),
    useCallback: (callback) => callback, useMemo: (factory) => factory(),
    useRef: () => ({ current: null }), useState: (initial) => [initial, () => {}],
    useEffect() {},
  };
  runInNewContext(outputText, {
    module: componentModule, exports: componentModule.exports,
    process: { env: { NEXT_PUBLIC_API_BASE_URL: "https://api.test" } },
    require: (name) => name === "react/jsx-runtime" ? require(name) : name === "react" ? hooks : name === "../../lib/api/backend-api" ? { BackendApi: TestApi } : assert.fail(`Unexpected import: ${name}`),
  });
  const context = componentModule.exports.ApiSessionProvider({ children: null }).props.value;
  return { context, calls, instances, account };
}

test("session login uses configured API then /auth/me, without a mode selector", async () => {
  const { context, calls, account } = sessionHarness();
  const session = await context.signIn("test-customer", "test-only-password");
  assert.deepEqual(calls, [["base", "https://api.test"], ["login", "test-customer", "test-only-password"], ["read", "/auth/me"]]);
  assert.equal(session.account, account);
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
