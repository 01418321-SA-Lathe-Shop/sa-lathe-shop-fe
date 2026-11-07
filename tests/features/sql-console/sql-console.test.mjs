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
  assert.match(source, /\{ sql: text, confirm: confirmed \}/);
  assert.match(source, /event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"/);
});

test("schema panel shows only ER tables unless 'show all' is ticked", () => {
  const source = read("sql-console/sql-schema-panel.tsx");
  assert.match(source, /allTables\.filter\(\(t\) => ER_TABLES\.has\(t\.name\)\)/);
  assert.match(source, /แสดงทุกตาราง/);
});

test("panel shows ER entity names while queries keep the real table name", async () => {
  const { erName } = await import("../../../src/features/sql-console/sql-domain.ts");
  assert.equal(erName("job_request"), "JOB_REQUEST");
  assert.equal(erName("payment"), "PAYMENT");
  assert.equal(erName("auth_session"), null);
  assert.match(read("sql-console/sql-domain.ts"), /SELECT \* FROM \$\{quoteIdent\(table\.name\)\}/);
});

test("whole-table query has no LIMIT and quotes identifiers", async () => {
  const { buildTableQuery } = await import("../../../src/features/sql-console/sql-domain.ts");
  assert.equal(buildTableQuery({ name: 'we"ird', columns: [] }), 'SELECT * FROM "we""ird";');
});

test("filters become one AND-joined WHERE with values safely quoted", async () => {
  const { buildTableQuery } = await import("../../../src/features/sql-console/sql-domain.ts");
  const columns = [{ name: "status", type: "text", not_null: false }, { name: "amount", type: "numeric(18,6)", not_null: false }];
  const filter = (id, column, op, value = "") => ({ id, column, op, value });
  assert.equal(buildTableQuery({ name: "payment", columns }, [filter(1, "status", "eq", "pa'id"), filter(2, "amount", "gte", " 500.5 ")]),
    `SELECT * FROM "payment"\nWHERE "status" = 'pa''id'\n  AND "amount" >= 500.5;`);
  assert.equal(buildTableQuery({ name: "payment", columns }, [filter(1, "status", "contains", "50%_a\\")]),
    `SELECT * FROM "payment"\nWHERE "status"::text ILIKE '%50\\%\\_a\\\\%';`);
  assert.equal(buildTableQuery({ name: "payment", columns }, [filter(1, "status", "null")]), `SELECT * FROM "payment"\nWHERE "status" IS NULL;`);
});

test("date filters compare whole days, in Bangkok for timestamptz", async () => {
  const { buildTableQuery } = await import("../../../src/features/sql-console/sql-domain.ts");
  const columns = [{ name: "a", type: "timestamp with time zone", not_null: true }, { name: "b", type: "timestamp without time zone", not_null: true }, { name: "c", type: "date", not_null: true }];
  const sql = buildTableQuery({ name: "t", columns }, ["a", "b", "c"].map((column, id) => ({ id, column, op: "gte", value: "2026-11-06" })));
  assert.equal(sql, `SELECT * FROM "t"\nWHERE ("a" AT TIME ZONE 'Asia/Bangkok')::date >= '2026-11-06'\n  AND "b"::date >= '2026-11-06'\n  AND "c" >= '2026-11-06';`);
});

test("operators follow the attribute type and invalid values are reported before running", async () => {
  const { filterKind, opsFor, filterError } = await import("../../../src/features/sql-console/sql-domain.ts");
  assert.equal(filterKind("character varying(100)"), "text");
  assert.equal(filterKind("uuid"), "text");
  assert.equal(filterKind("numeric(18,6)"), "number");
  assert.equal(filterKind("timestamp with time zone"), "date");
  assert.equal(filterKind("boolean"), "boolean");
  assert.equal(filterKind("jsonb"), "other");
  assert.equal(filterKind("text[]"), "other");
  assert.ok(!opsFor("boolean").includes("gt") && !opsFor("other").includes("eq") && opsFor("text").includes("contains"));
  const base = { id: 1, column: "x" };
  assert.equal(filterError("number", { ...base, op: "gt", value: "1; DROP TABLE x" }), "กรอกเป็นตัวเลข");
  assert.equal(filterError("number", { ...base, op: "gt", value: "-1.5" }), null);
  assert.equal(filterError("text", { ...base, op: "eq", value: "  " }), "กรอกค่าที่ต้องการกรอง");
  assert.equal(filterError("date", { ...base, op: "eq", value: "x" }), "เลือกวันที่");
  assert.equal(filterError("text", { ...base, op: "null", value: "" }), null);
});

test("attribute keys are read from constraint definitions and long types are shortened", async () => {
  const { keyColumns, shortType } = await import("../../../src/features/sql-console/sql-domain.ts");
  const keys = keyColumns({ constraints: [
    { name: "a", type: "primary_key", definition: "PRIMARY KEY (id)" },
    { name: "b", type: "foreign_key", definition: 'FOREIGN KEY (invoice_id, "Line") REFERENCES invoice(id, line)' },
    { name: "c", type: "check", definition: "CHECK ((amount > 0))" },
  ] });
  assert.deepEqual([...keys.pk], ["id"]);
  assert.deepEqual([...keys.fk], ["invoice_id", "Line"]);
  assert.equal(shortType("timestamp with time zone"), "timestamptz");
  assert.equal(shortType("character varying(20)"), "varchar(20)");
});

test("filter bar only exists for panel-written SQL, so it can never overwrite a manual edit", () => {
  const source = read("sql-console/sql-console.tsx");
  assert.match(source, /browsing && browsing\.sql === sql \?/);
  assert.match(source, /\{filterTable && <SqlFilterBar/);
  assert.match(source, /result\?\.truncated && /);
});

test("status shortcuts count one workflow document status each, in tables that exist", async () => {
  const { STATUS_SHORTCUTS, ER_TABLES, buildStatusCountQuery } = await import("../../../src/features/sql-console/sql-domain.ts");
  assert.equal(STATUS_SHORTCUTS.length, 10);
  assert.equal(new Set(STATUS_SHORTCUTS.map((s) => s.label)).size, 10);
  for (const shortcut of STATUS_SHORTCUTS) assert.ok(ER_TABLES.has(shortcut.table), shortcut.table);
  assert.equal(buildStatusCountQuery({ table: "material_order", column: "payment_status" }),
    'SELECT "payment_status", count(*) AS total\nFROM "material_order"\nGROUP BY "payment_status"\nORDER BY total DESC, "payment_status";');
});

test("write templates key UPDATE/DELETE on the primary key and skip defaulted columns on INSERT", async () => {
  const { buildWriteTemplate } = await import("../../../src/features/sql-console/sql-domain.ts");
  const table = { name: "unit", constraints: [{ name: "unit_pkey", type: "primary_key", definition: "PRIMARY KEY (id)" }],
    columns: [{ name: "id", type: "bigint", not_null: true, default: "nextval('unit_id_seq')" }, { name: "code", type: "character varying", not_null: true }, { name: "note", type: "text", not_null: false }] };
  assert.equal(buildWriteTemplate(table, "delete"), 'DELETE FROM "unit"\nWHERE "id" = NULL\nRETURNING *;');
  assert.equal(buildWriteTemplate(table, "update"), 'UPDATE "unit"\nSET "code" = NULL\nWHERE "id" = NULL\nRETURNING *;');
  assert.equal(buildWriteTemplate(table, "insert"), 'INSERT INTO "unit" ("code", "note")\nVALUES (\n  NULL, -- code varchar NOT NULL\n  NULL  -- note text\n)\nRETURNING *;');
  assert.match(buildWriteTemplate({ ...table, constraints: [] }, "delete"), /WHERE false/);
});
