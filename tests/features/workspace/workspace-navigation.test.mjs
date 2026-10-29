import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NAV_GROUPS, ROLE_WORKSPACES, canAccessWorkspace } from "../../../src/features/workspace/workspace-access.ts";
import { staffNotice } from "../../../src/features/workspace/workspace-notifications.ts";

test("sidebar groups list every permitted Staff/Admin page exactly once, with inbox behind the bell", () => {
  for (const role of ["Worker", "Admin"]) {
    const grouped = NAV_GROUPS[role].flatMap((group) => group.items);
    assert.equal(new Set(grouped).size, grouped.length);
    assert.deepEqual([...grouped].sort(), ROLE_WORKSPACES[role].filter((id) => id !== "inbox").sort());
    assert(grouped.every((id) => canAccessWorkspace(role, id)));
    assert(canAccessWorkspace(role, "inbox"));
  }
  assert.deepEqual(NAV_GROUPS.Admin.filter((group) => group.admin).flatMap((group) => group.items), ["workers"]);
  assert(!NAV_GROUPS.Worker.some((group) => group.admin));
});

test("bell shows the five backend notification titles in Thai and keeps the request number", () => {
  assert.deepEqual(staffNotice("New request #12"), { text: "คำขอผลิตใหม่", reference: "12" });
  assert.deepEqual(staffNotice("Delivery ready for inspection — request #3"), { text: "ส่งมอบงานแล้ว รอลูกค้าตรวจรับ", reference: "3" });
  assert.equal(staffNotice("Customer inspection recorded — request #3").text, "ลูกค้าบันทึกผลตรวจรับแล้ว");
  assert.equal(staffNotice("Customer payment awaiting review — request #9").text, "มีหลักฐานชำระเงินรอตรวจ");
  assert.equal(staffNotice("Payment review completed — request #9").text, "ตรวจการชำระเงินเสร็จแล้ว");
  assert.deepEqual(staffNotice("Something else"), { text: "มีความคืบหน้าของคำขอผลิต", reference: undefined });
  assert.equal(staffNotice("ข้อความไทย #4").text, "ข้อความไทย #4");
});

test("shell renders Thai group labels and no English workspace eyebrow", () => {
  const shell = readFileSync(new URL("../../../src/features/workspace/workspace-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /nav-group-label/);
  assert.doesNotMatch(shell, /WORKSPACE<\/span>|workspaceId\.toUpperCase\(\)/);
});
