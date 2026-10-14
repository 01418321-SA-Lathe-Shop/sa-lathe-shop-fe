import assert from "node:assert/strict";
import test from "node:test";
import { canAccessWorkspace, getWorkspaces, isRole } from "./demo-access.ts";

test("demo roles reject external Supplier and malformed stored values", () => {
  for (const role of ["Customer", "Worker", "Admin"]) assert.equal(isRole(role), true);
  for (const value of ["Supplier", "admin", "", null, undefined, {}, 42]) {
    assert.equal(isRole(value), false);
  }
});

test("Customer has customer UCs and cannot enter workshop management", () => {
  assert.deepEqual(getWorkspaces("Customer").map(({ useCase }) => useCase), ["UC1", "UC3", "UC4", "UC9"]);
  for (const id of ["materials", "orders", "receiving", "production", "workers"]) {
    assert.equal(canAccessWorkspace("Customer", id), false);
  }
});

test("Worker has UC2 and UC5–UC9 without Admin worker management", () => {
  assert.deepEqual(getWorkspaces("Worker").map(({ useCase }) => useCase), ["UC2", "UC5", "UC6", "UC7", "UC8", "UC9"]);
  assert.equal(canAccessWorkspace("Worker", "workers"), false);
  assert.equal(canAccessWorkspace("Worker", "deposit-po"), false);
});

test("Admin can manage Workers and perform UC6 without inheriting Worker UCs", () => {
  assert.deepEqual(getWorkspaces("Admin").map(({ id }) => id), ["workers", "orders"]);
  for (const id of ["requests", "quotations", "materials", "receiving", "production", "delivery-payment"]) {
    assert.equal(canAccessWorkspace("Admin", id), false);
  }
});

test("all roles can navigate to overview and their own registered workspaces", () => {
  for (const role of ["Customer", "Worker", "Admin"]) {
    assert.equal(canAccessWorkspace(role, "overview"), true);
    for (const { id } of getWorkspaces(role)) assert.equal(canAccessWorkspace(role, id), true);
  }
});
