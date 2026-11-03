import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../../src/features/workers/${path}`, import.meta.url), "utf8");

test("UC12 admin management is shown only to a Super Admin", () => {
  assert.match(read("workers.tsx"), /\{account\.is_super_admin && <LiveAdmins api=\{api\} \/>\}/);
});

test("UC12 never promotes and never offers to deactivate a Super Admin", () => {
  const source = read("admins.tsx");
  assert.doesNotMatch(source, /is_super_admin:/);
  assert.match(source, /\{!admin\.is_super_admin && <Button/);
  assert.match(source, /api\.call\(`\/admin\/admins\/\$\{admin\.id\}`, "PATCH", \{ is_active: !admin\.is_active \}/);
});
