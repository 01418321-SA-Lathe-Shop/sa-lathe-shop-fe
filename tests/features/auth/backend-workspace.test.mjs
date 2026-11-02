import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../../src/features/auth/backend-workspace.tsx", import.meta.url), "utf8");

test("login/register cannot natively submit credentials into the URL before hydration", () => {
  assert.match(source, /<form ref=\{loginForm\} method="post"/);
  assert.match(source, /useSyncExternalStore\(noSubscribe, \(\) => true, \(\) => false\)/);
  assert.match(source, /<fieldset disabled=\{action\.busy \|\| !hydrated\}/);
});
