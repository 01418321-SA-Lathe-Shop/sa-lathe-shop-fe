import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BackendApi, ApiError, parseApiJSON, positiveInt64, moneyInput, displayMoney, uploadType, isDefiniteRejection, rejectionMessage } from "../../../src/lib/api/backend-api.ts";

test("preserves unsafe int64 values without changing quoted strings or money", () => {
  assert.deepEqual(parseApiJSON('{"qty":9223372036854775807,"note":"1234567890123456789","price":"1600.01","version":2}'), { qty: "9223372036854775807", note: "1234567890123456789", price: "1600.01", version: 2 });
  assert.equal(positiveInt64("9223372036854775807"), 9223372036854775807n);
  for (const value of ["0", "-1", "1.2", "1e3", "9223372036854775808"]) assert.throws(() => positiveInt64(value));
});
test("money stays exact across the full PostgreSQL range, including zero", () => {
  assert.equal(moneyInput("0"), "0.00"); assert.equal(moneyInput("1600.1"), "1600.10");
  assert.equal(displayMoney("9999999999999999.99"), "THB 9,999,999,999,999,999.99");
  for (const value of ["-1", "1e3", "1.001", "10000000000000000"]) assert.throws(() => moneyInput(value));
});
test("upload allowlist, exact 100MB boundary and MIME agreement", () => {
  assert.equal(uploadType({ name: "drawing.PDF", type: "application/pdf", size: 100000000 }), "application/pdf");
  assert.equal(uploadType({ name: "notes.txt", type: "", size: 1 }), "text/plain");
  for (const file of [{ name: "x.svg", type: "image/svg+xml", size: 1 }, { name: "x.pdf", type: "image/png", size: 1 }, { name: "x.pdf", type: "", size: 100000001 }, { name: "x.pdf", type: "", size: 0 }]) assert.throws(() => uploadType(file));
});
test("Bearer is scoped to API, exact integers serialize, logout clears credentials", async () => {
  const original = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), ...init });
    if (String(url).endsWith("/auth/login")) return Response.json({ access_token: "test-only-token", token_type: "Bearer", account: { role: "customer" } });
    if (String(url).endsWith("/uploads")) return Response.json({ url: "https://storage.test/private", attachment_id: "a", headers: { "Content-Type": "text/plain" } });
    return new Response(null, { status: 204 });
  };
  try {
    const api = new BackendApi("https://api.test");
    await api.login("name", "test-only-password");
    await api.call("/requests", "POST", { qty: positiveInt64("9223372036854775807") });
    assert.equal(calls[1].body, '{"qty":9223372036854775807}');
    assert.equal(calls[1].headers.Authorization, "Bearer test-only-token");
    await api.upload("request", new File(["hello"], "notes.txt", { type: "text/plain" }));
    const storage = calls.find((c) => c.url.includes("storage.test"));
    assert.equal(new Headers(storage.headers).has("Authorization"), false);
    assert.equal(storage.credentials, "omit");
    assert.equal(calls.at(-1).url, "https://api.test/uploads/a/complete");
    await api.logout(); await api.call("/auth/me");
    assert.equal(calls.at(-1).headers.Authorization, undefined);
  } finally { globalThis.fetch = original; }
});
test("401 expires session once and errors retain reference without logging bodies", async () => {
  const original = globalThis.fetch; let expired = 0;
  globalThis.fetch = async (url) => String(url).endsWith("/auth/login") ? Response.json({ access_token: "test-only", token_type: "Bearer", account: { role: "worker" } }) : Response.json({ error: { code: "unauthorized", message: "Login required", request_id: "ref" } }, { status: 401 });
  try {
    const api = new BackendApi("https://api.test", () => expired++); await api.login("u", "p");
    await assert.rejects(api.call("/auth/me"), (error) => error instanceof ApiError && error.status === 401 && error.requestId === "ref");
    assert.equal(expired, 1);
    await assert.rejects(api.call("//other.test"));
  } finally { globalThis.fetch = original; }
});
test("failed upload requires a fresh intent and never completes failed storage writes", async () => {
  const original = globalThis.fetch; let intents = 0; let completions = 0; let fail = true;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/uploads")) return Response.json({ url: "https://storage.test/private", attachment_id: `attempt-${++intents}` });
    if (String(url).includes("storage.test")) return new Response(null, { status: fail ? 503 : 200 });
    completions++; return new Response(null, { status: 204 });
  };
  try {
    const api = new BackendApi("https://api.test"); const file = new File(["notes"], "notes.txt", { type: "text/plain" });
    await assert.rejects(api.upload("request", file), /Upload again/);
    assert.equal(intents, 1); assert.equal(completions, 0);
    fail = false; await api.upload("request", file);
    assert.equal(intents, 2); assert.equal(completions, 1);
  } finally { globalThis.fetch = original; }
});
test("API requests send only the guarded session cookie, reject redirects, bypass cache and abort on session close", async () => {
  const original = globalThis.fetch; let captured;
  globalThis.fetch = async (_, init) => { captured = init; return new Response(null, { status: 204 }); };
  try {
    const api = new BackendApi("https://api.test"); await api.call("/requests");
    // The HttpOnly session cookie is accepted by the API only with this guard header.
    assert.equal(captured.credentials, "include"); assert.equal(captured.headers["X-Session-Cookie"], "1"); assert.equal(captured.redirect, "error"); assert.equal(captured.cache, "no-store");
    assert.equal(captured.signal.aborted, false); api.close(); assert.equal(captured.signal.aborted, true);
    assert.throws(() => new BackendApi("https://user:secret@api.test"));
    assert.throws(() => new BackendApi("https://api.test?token=not-allowed"));
  } finally { globalThis.fetch = original; }
});

test("only a 4xx is a definite rejection; lost responses, 408 and 5xx stay uncertain", () => {
  for (const status of [400, 401, 403, 404, 409, 422, 429]) assert.equal(isDefiniteRejection(new ApiError(status, "x", "x")), true, String(status));
  for (const status of [408, 500, 502, 503]) assert.equal(isDefiniteRejection(new ApiError(status, "x", "x")), false, String(status));
  assert.equal(isDefiniteRejection(new TypeError("Failed to fetch")), false);
});

test("rejection messages are Thai, specific to the status, and keep the support reference", () => {
  for (const status of [400, 401, 403, 404, 409, 429]) assert.match(rejectionMessage(new ApiError(status, "x", "english detail")), /[ก-๙]/);
  assert.match(rejectionMessage(new ApiError(403, "x", "x")), /ไม่มีสิทธิ์/);
  assert.match(rejectionMessage(new ApiError(409, "x", "x")), /โหลดข้อมูลล่าสุด/);
  assert.match(rejectionMessage(new ApiError(400, "x", "x", "req-1")), /รหัสอ้างอิง req-1/);
});

test("every staff write outcome goes through WriteOutcome, which separates rejected from uncertain", () => {
  const read = (path) => readFileSync(new URL(`../../../src/${path}`, import.meta.url), "utf8");
  const panel = read("components/staff-ui/staff-ui.tsx");
  assert.match(panel, /if \(write\.uncertain\) return <RetryPanel/);
  assert.match(panel, /if \(write\.rejected\) return/);
  assert.match(read("hooks/backend-hooks.ts"), /if \(!isDefiniteRejection\(error\)\) throw error;\s+setAttempt\(null\); setRejected\(true\);/);
  for (const file of ["delivery/delivery-actions", "delivery/delivery-payments", "production/production-work", "receiving/receiving-receipt", "procurement/procurement-order"]) assert.doesNotMatch(read(`features/${file}.tsx`), /<RetryPanel/);
});
