import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../../src/features/workspace/workspace-shell.tsx", import.meta.url), "utf8");
test("Staff/Admin navbar keeps actions in one group and sign-out in the sidebar", () => {
  const header = source.slice(source.indexOf('<header className="topbar'), source.indexOf("</header>"));
  assert.match(header, /workspace-navbar-environment/);
  assert.match(header, /workspace-navbar-brand/);
  const actions = header.slice(header.indexOf('className="workspace-navbar-actions"'));
  assert.match(actions, /<ThemeToggle\/>/);
  assert.match(actions, /workspacePath\(role, "inbox"\)/);
  assert.match(actions, /aria-label="การแจ้งเตือน"/);
  assert.match(actions, /id="navigation-toggle"/);
  assert.doesNotMatch(header, /Connected API|switch-account|onClick=\{leave\}/);
  assert.match(source.slice(0, source.indexOf("</aside>")), /aria-label="ออกจากระบบ" onClick=\{leave\}/);
  assert.match(source, /if \(role === "Customer"\) return <CustomerShell/);
});
