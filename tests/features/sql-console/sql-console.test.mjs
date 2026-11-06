import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { highlight, isSchemaChange, lineColumn, newlineIndent, toCsv, toTsv } from "../../../src/features/sql-console/sql-domain.ts";

const read = (path) => readFileSync(new URL(`../../../src/features/${path}`, import.meta.url), "utf8");

test("highlighter classifies keywords, strings, numbers and comments", () => {
  const kinds = highlight("SELECT 'a''b', 12 -- note\nFROM t").filter((t) => t.kind !== "plain").map((t) => [t.kind, t.text]);
  assert.deepEqual(kinds, [["keyword", "SELECT"], ["string", "'a''b'"], ["number", "12"], ["comment", "-- note"], ["keyword", "FROM"]]);
});

test("Enter keeps indentation and indents after an opening bracket", () => {
  assert.equal(newlineIndent("  select a", 10), "\n  ");
  assert.equal(newlineIndent("create table t (", 16), "\n  ");
  assert.equal(newlineIndent("x", 1), "\n");
});

test("CSV quotes cells, keeps NULL empty and neutralises spreadsheet formulas", () => {
  const result = { columns: [{ name: "a", type: "text" }, { name: "b,c", type: "text" }], rows: [["=SUM(1)", 'say "hi"'], [null, "x\ny"]] };
  assert.equal(toCsv(result), `a,"b,c"\r\n'=SUM(1),"say ""hi"""\r\n,"x\ny"`);
  assert.equal(toTsv(result), "a\tb,c\n=SUM(1)\tsay \"hi\"\n\tx y");
});

test("schema refresh follows DDL only; error position maps to line and column", () => {
  assert.ok(isSchemaChange("CREATE TABLE") && isSchemaChange("DROP TABLE") && isSchemaChange("ALTER TABLE"));
  assert.ok(!isSchemaChange("SELECT 1") && !isSchemaChange("INSERT 0 1"));
  assert.deepEqual(lineColumn("select 1\nselec 2", 10), { line: 2, column: 1 });
});

test("SQL console is Super Admin only in navigation, shell and workspace", () => {
  assert.match(read("workspace/workspace-access.ts"), /SUPER_ADMIN_ONLY: WorkspaceId\[\] = \["sql"\]/);
  assert.match(read("workspace/workspace-shell.tsx"), /SUPER_ADMIN_ONLY\.includes\(workspaceId\) && !session\.account\.is_super_admin/);
  assert.match(read("workspace/connected-workspace.tsx"), /account\.is_super_admin \? <SqlConsole/);
});

test("destructive statements are confirmed and re-sent with confirm:true; Ctrl+Enter runs", () => {
  const source = read("sql-console/sql-console.tsx");
  assert.match(source, /error\.code === "confirmation_required"\) setConfirm/);
  assert.match(source, /\{ sql, confirm: confirmed \}/);
  assert.match(source, /event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"/);
});
