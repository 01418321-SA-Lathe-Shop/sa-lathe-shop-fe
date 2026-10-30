import test from "node:test";
import assert from "node:assert/strict";
import { draftOf, initials, matchWorker, usernameChanged, workerErrors, workerPasswordError, workerPayload } from "../../../src/features/workers/workers-domain.ts";

const draft = { name: " สมชาย ใจดี ", username: "somchai.w", employee_no: "EMP-001", email: " a@b.com ", phone: "+66 81 234 5678", position: " ช่างกลึง " };

test("worker fields: Thai errors per field, trimmed payload", () => {
  assert.deepEqual(workerErrors(draft), {});
  assert.deepEqual(workerPayload(draft), { email: "a@b.com", phone: "+66 81 234 5678", name: "สมชาย ใจดี", username: "somchai.w", employee_no: "EMP-001", position: "ช่างกลึง" });
  const bad = workerErrors({ ...draft, name: " ", username: "ab", employee_no: "EMP 1", email: "", phone: "123", position: "x".repeat(101) });
  assert.deepEqual(Object.keys(bad).sort(), ["email", "employee_no", "name", "phone", "position", "username"]);
  assert.match(bad.username, /3–64/);
});

test("password rule matches the server and needs a matching confirmation", () => {
  assert.equal(workerPasswordError("x".repeat(12), "x".repeat(12)), "");
  assert.match(workerPasswordError("short", "short"), /12/);
  assert.match(workerPasswordError("ก".repeat(43), "ก".repeat(43)), /128/);
  assert.match(workerPasswordError("x".repeat(12), "y".repeat(12)), /ไม่ตรงกัน/);
});

test("username change is case-insensitive; legacy null contacts become blank drafts", () => {
  assert.equal(usernameChanged({ username: "somchai.w" }, " Somchai.W "), false);
  assert.equal(usernameChanged({ username: "somchai.w" }, "somchai2"), true);
  const legacy = { id: "1", username: "old", name: "Old", role: "worker", is_active: true, employee_no: "E1", email: null, phone: null };
  assert.equal(draftOf(legacy).email, ""); assert.equal(matchWorker(legacy, "e1"), true); assert.equal(matchWorker(legacy, "zzz"), false);
});

test("worker avatar initials skip Thai leading vowels", () => {
  assert.equal(initials(" สมชาย  ใจดี "), "สจ");
  assert.equal(initials("wichai thongdee extra"), "WT");
  assert.equal(initials("เอก"), "อ");
  assert.equal(initials(""), "");
});
