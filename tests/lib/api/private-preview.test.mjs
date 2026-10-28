import test from "node:test";
import assert from "node:assert/strict";
import { BackendApi } from "../../../src/lib/api/backend-api.ts";
import { canPreview, readPrivatePreview } from "../../../src/lib/api/private-preview.ts";

const pdf = new Blob(["%PDF-1.4\ntest document"], { type: "application/octet-stream" });
const file = { id: "private-file", file_name: "po.pdf", state: "ready", byte_size: pdf.size, content_type: "application/pdf" };
const link = () => ({ url: "https://storage.test/private?signature=temporary", expires_at: new Date(Date.now() + 60000).toISOString(), headers: { Authorization: "must-not-forward", Cookie: "must-not-forward" } });
const signal = () => new AbortController().signal;

test("preview scopes Bearer to API, never forwards credentials, cookies, referrer or redirects to storage", async () => {
  const calls = []; const api = new BackendApi("https://api.test", () => {}, { fetch: async (url, init) => {
    calls.push({ url, ...init });
    if (String(url).endsWith("/auth/login")) return Response.json({ access_token: "test-only-token", token_type: "Bearer", account: { role: "customer" } });
    if (String(url).startsWith("https://api.test")) return Response.json(link());
    return new Response(pdf);
  } });
  await api.login("test", "test"); const blob = await api.preview(file);
  assert.equal(blob.type, "application/pdf"); assert.equal(await blob.text(), await pdf.text());
  assert.equal(calls[1].url, "https://api.test/attachments/private-file/download");
  assert.equal(calls[1].headers.Authorization, "Bearer test-only-token");
  const storage = calls[2]; assert.equal(new Headers(storage.headers).has("Authorization"), false); assert.equal(new Headers(storage.headers).has("Cookie"), false);
  assert.equal(storage.credentials, "omit"); assert.equal(storage.redirect, "error"); assert.equal(storage.referrerPolicy, "no-referrer"); assert.equal(storage.cache, "no-store");
  api.close(); assert.equal(storage.signal.aborted, true);
});

test("only ready PDF/JPEG/PNG with matching extensions can preview; unsupported files never request a link", async () => {
  assert.equal(canPreview(file), true); assert.equal(canPreview({ ...file, file_name: "PO.PDF" }), true);
  let links = 0;
  for (const invalid of [{ ...file, state: "pending" }, { ...file, content_type: "text/html" }, { ...file, file_name: "po.svg" }, { ...file, byte_size: 100000001 }, { ...file, byte_size: 0 }, { ...file, byte_size: 1.5 }]) await assert.rejects(readPrivatePreview(invalid, async () => { links++; return link(); }, { fetch }, signal()));
  assert.equal(links, 0);
});

test("signed links reject invalid scheme, credentials, missing expiry and expired expiry before storage reads", async () => {
  let reads = 0;
  for (const invalid of [{ url: "javascript:alert(1)" }, { url: "https://user:secret@storage.test" }, { expires_at: "invalid" }, { expires_at: new Date(0).toISOString() }]) await assert.rejects(readPrivatePreview(file, async () => ({ ...link(), ...invalid }), { fetch: async () => { reads++; return new Response(pdf); } }, signal()));
  assert.equal(reads, 0);
});

test("checks actual byte count and signature even when storage declares octet-stream", async () => {
  const from = (blob) => ({ fetch: async () => new Response(blob) });
  await assert.rejects(readPrivatePreview({ ...file, byte_size: 1 }, async () => link(), from(pdf), signal()), /ขนาดไฟล์/);
  await assert.rejects(readPrivatePreview({ ...file, byte_size: pdf.size + 1 }, async () => link(), from(pdf), signal()), /ขนาดไฟล์/);
  const html = new Blob(["<html>not a pdf</html>"]);
  await assert.rejects(readPrivatePreview({ ...file, byte_size: html.size }, async () => link(), from(html), signal()), /ชนิดไฟล์/);
  const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]);
  assert.equal((await readPrivatePreview({ ...file, file_name: "po.png", content_type: "image/png", byte_size: png.size }, async () => link(), from(png), signal())).type, "image/png");
});

test("canceled preview never requests a private link or reads storage", async () => {
  const controller = new AbortController(); let links = 0;
  const transport = { fetch: async () => { throw new Error("unexpected storage read"); } };
  controller.abort(); await assert.rejects(readPrivatePreview(file, async () => { links++; return link(); }, transport, controller.signal), { name: "AbortError" });
  assert.equal(links, 0);
});

test("cancellation during a storage read rejects before a Blob can reach the viewer", async () => {
  const controller = new AbortController(); let canceled = false;
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("%PDF-")); }, pull() { controller.abort(); }, cancel() { canceled = true; } });
  await assert.rejects(readPrivatePreview(file, async () => link(), { fetch: async () => new Response(stream) }, controller.signal), { name: "AbortError" });
  assert.equal(canceled, true);
});
