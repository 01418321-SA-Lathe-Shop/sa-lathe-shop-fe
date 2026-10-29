import assert from "node:assert/strict";
import test from "node:test";
import { BackendApi, ApiError } from "../../../src/lib/api/backend-api.ts";

test("local test login sends only username and uses the normal opaque Bearer session", async () => {
  const calls = [];
  const account = { id: "test-id", username: "pim.admin", role: "admin" };
  const api = new BackendApi("http://localhost:8080", () => {}, { fetch: async (url, init) => {
    calls.push({ url: String(url), ...init });
    if (String(url).endsWith("/local-test/login")) return Response.json({ access_token: "test-only-token", token_type: "Bearer", expires_at: "2099-01-01T00:00:00Z", account });
    if (String(url).endsWith("/logout")) return new Response(null, { status: 204 });
    return Response.json(account);
  } });
  await api.loginLocalTest("pim.admin");
  assert.equal(calls[0].url, "http://localhost:8080/auth/local-test/login");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].body, '{"username":"pim.admin"}');
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(calls[0].credentials, "omit");
  assert.equal(calls[0].cache, "no-store");
  await api.call("/auth/me"); assert.equal(calls[1].headers.Authorization, "Bearer test-only-token");
  await api.logout(); assert.equal(calls[2].url, "http://localhost:8080/auth/logout");
  await api.call("/auth/me"); assert.equal(calls[3].headers.Authorization, undefined);
});

test("disabled, unseeded, rate-limited and offline local login never retry another endpoint", async () => {
  for (const status of [401, 404, 429, 0]) {
    let attempts = 0;
    const api = new BackendApi("http://localhost:8080", () => {}, { fetch: async () => {
      attempts++;
      if (!status) throw new TypeError("offline");
      return Response.json({ error: { code: "test", message: "unavailable" } }, { status });
    } });
    await assert.rejects(api.loginLocalTest("pim.admin"), (error) => status ? error instanceof ApiError && error.status === status : error instanceof TypeError);
    assert.equal(attempts, 1);
  }
});
