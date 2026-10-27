import assert from "node:assert/strict";
import test from "node:test";
import { BackendApi } from "../../../src/lib/api/backend-api.ts";

test("private previews preserve the app tab and named downloads retain their filename", async () => {
  const originalFetch = globalThis.fetch, originalDocument = globalThis.document;
  const anchors = [];
  globalThis.fetch = async () => Response.json({ url: "https://storage.test/private" });
  globalThis.document = { body: { append() {} }, createElement() { const a = { click() {}, remove() {} }; anchors.push(a); return a; } };
  try {
    const api = new BackendApi("https://api.test");
    await api.download("/private/download"); await api.download("/private/download", "drawing.pdf");
    assert.equal(anchors[0].target, "_blank"); assert.equal(anchors[0].rel, "noreferrer noopener"); assert.equal(anchors[0].referrerPolicy, "no-referrer");
    assert.equal(anchors[1].download, "drawing.pdf"); assert.equal(anchors[1].target, undefined);
  } finally { globalThis.fetch = originalFetch; if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; }
});
