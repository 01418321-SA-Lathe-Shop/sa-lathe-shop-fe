// Pure helpers for the Super Admin SQL console (backend: /admin/sql/*).
export type SqlColumn = { name: string; type: string };
export type SqlResult = { command: string; rows_affected: number; columns: SqlColumn[]; rows: (string | null)[][]; truncated: boolean; elapsed_ms: number };
export type SchemaTable = {
  name: string; kind: "table" | "view";
  columns: { name: string; type: string; not_null: boolean; default?: string }[];
  constraints: { name: string; type: "primary_key" | "unique" | "foreign_key" | "check"; definition: string; references?: string }[];
  indexes: { name: string; definition: string }[];
};

const KEYWORDS = new Set(`select from where group by having order limit offset insert into values update set delete create alter drop truncate table add column constraint primary key foreign references unique check default not null index view join inner left right full outer cross on using as and or in is like ilike between exists case when then else end distinct union all intersect except with returning asc desc cascade restrict if rename to type true false`.split(" "));

export type Token = { text: string; kind: "keyword" | "string" | "number" | "comment" | "plain" };

// One-pass tokenizer for highlighting only; the server does the real parsing.
export function highlight(sql: string): Token[] {
  const out: Token[] = [];
  const re = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([\s\S])/g;
  for (let m: RegExpExecArray | null; (m = re.exec(sql)); ) {
    const kind = m[1] ? "comment" : m[2] ? "string" : m[3] ? "number" : m[4] && KEYWORDS.has(m[4].toLowerCase()) ? "keyword" : "plain";
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += m[0]; else out.push({ text: m[0], kind });
  }
  return out;
}

// Enter keeps the current line's indentation; one extra level after an opening bracket.
export function newlineIndent(value: string, caret: number): string {
  const line = value.slice(value.lastIndexOf("\n", caret - 1) + 1, caret);
  const indent = /^[ \t]*/.exec(line)![0];
  return "\n" + indent + (/[(]\s*$/.test(line) ? "  " : "");
}

export function isSchemaChange(command: string): boolean { return /^(CREATE|ALTER|DROP)\b/i.test(command); }

// Spreadsheet formula injection: neutralise cells that start with = + - @ or a control character.
const csvCell = (value: string | null) => {
  if (value === null) return "";
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};
export function toCsv(result: Pick<SqlResult, "columns" | "rows">): string {
  return [result.columns.map((c) => csvCell(c.name)).join(","), ...result.rows.map((row) => row.map(csvCell).join(","))].join("\r\n");
}
export function toTsv(result: Pick<SqlResult, "columns" | "rows">): string {
  const cell = (v: string | null) => (v ?? "").replace(/[\t\r\n]+/g, " ");
  return [result.columns.map((c) => cell(c.name)).join("\t"), ...result.rows.map((row) => row.map(cell).join("\t"))].join("\n");
}

// 1-based character position from PostgreSQL → line/column in the editor text.
export function lineColumn(sql: string, position: number): { line: number; column: number } {
  const before = sql.slice(0, Math.max(0, position - 1)).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

// Tables that map to the project ER diagram (backend docs/021-er-schema-comparison.md). The schema panel shows only these by default.
export const ER_TABLES = new Set("person customer address admin worker job_request request_attachment quotation quotation_cost purchase_order deposit job job_photo job_material_usage material_reservation material unit unit_conversion delivery supplier material_order material_order_item stock_movement material_defect_log invoice payment payment_allocation".split(" "));

// Tables now carry the ER entity names, so the panel label is the upper-cased table name.
export const erName = (table: string): string | null => (ER_TABLES.has(table) ? table.toUpperCase() : null);

// --- Table browser: attribute display and filters that become a real WHERE clause ---

// PK/FK column names, read from pg_get_constraintdef output such as "FOREIGN KEY (a, b) REFERENCES t(id)".
export function keyColumns(table: Pick<SchemaTable, "constraints">): { pk: Set<string>; fk: Set<string> } {
  const keys = { pk: new Set<string>(), fk: new Set<string>() };
  for (const constraint of table.constraints) {
    if (constraint.type !== "primary_key" && constraint.type !== "foreign_key") continue;
    const list = /\(([^)]*)\)/.exec(constraint.definition)?.[1] ?? "";
    const target = constraint.type === "primary_key" ? keys.pk : keys.fk;
    for (const name of list.split(",")) target.add(name.trim().replace(/^"|"$/g, ""));
  }
  return keys;
}

export const shortType = (type: string): string => type
  .replace("timestamp with time zone", "timestamptz")
  .replace("timestamp without time zone", "timestamp")
  .replace("character varying", "varchar");

export type FilterKind = "text" | "number" | "date" | "boolean" | "other";
export type FilterOp = "contains" | "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "true" | "false" | "null" | "notnull";
export type TableFilter = { id: number; column: string; op: FilterOp; value: string };

export function filterKind(type: string): FilterKind {
  const t = type.toLowerCase();
  if (t.endsWith("[]") || /^(json|jsonb|bytea|xml)\b/.test(t)) return "other";
  if (/^(smallint|integer|bigint|numeric|decimal|real|double precision)\b/.test(t)) return "number";
  if (/^(date|timestamp)\b/.test(t)) return "date";
  return t === "boolean" ? "boolean" : "text";
}

const OPS: Record<FilterKind, FilterOp[]> = {
  text: ["contains", "eq", "ne", "null", "notnull"],
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "null", "notnull"],
  date: ["eq", "gt", "gte", "lt", "lte", "null", "notnull"],
  boolean: ["true", "false", "null", "notnull"],
  other: ["contains", "null", "notnull"],
};
export const opsFor = (kind: FilterKind): FilterOp[] => OPS[kind];

const OP_LABEL: Record<FilterOp, string> = { contains: "มีคำว่า", eq: "=", ne: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", true: "เป็นจริง", false: "เป็นเท็จ", null: "ว่าง (NULL)", notnull: "ไม่ว่าง" };
export const opLabel = (kind: FilterKind, op: FilterOp): string => kind === "text" && op === "eq" ? "เท่ากับ" : kind === "text" && op === "ne" ? "ไม่เท่ากับ" : OP_LABEL[op];
export const opNeedsValue = (op: FilterOp): boolean => !["true", "false", "null", "notnull"].includes(op);

export const quoteIdent = (name: string): string => `"${name.replaceAll('"', '""')}"`;
export const quoteLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;

export function filterError(kind: FilterKind, filter: TableFilter): string | null {
  if (!opNeedsValue(filter.op)) return null;
  if (!filter.value.trim()) return "กรอกค่าที่ต้องการกรอง";
  if (kind === "number" && !/^-?\d+(\.\d+)?$/.test(filter.value.trim())) return "กรอกเป็นตัวเลข";
  if (kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(filter.value)) return "เลือกวันที่";
  return null;
}

const COMPARE: Partial<Record<FilterOp, string>> = { eq: "=", ne: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" };

// Date filters compare whole days; timestamptz days are Bangkok days (the project's display zone).
function filterCondition(type: string, filter: TableFilter): string {
  const column = quoteIdent(filter.column);
  const kind = filterKind(type);
  if (filter.op === "null") return `${column} IS NULL`;
  if (filter.op === "notnull") return `${column} IS NOT NULL`;
  if (filter.op === "true") return `${column} IS TRUE`;
  if (filter.op === "false") return `${column} IS FALSE`;
  if (filter.op === "contains") return `${column}::text ILIKE ${quoteLiteral(`%${filter.value.replace(/[\\%_]/g, "\\$&")}%`)}`;
  if (kind === "number") return `${column} ${COMPARE[filter.op]} ${filter.value.trim()}`;
  if (kind === "date") {
    const lower = type.toLowerCase();
    const day = lower.startsWith("timestamp with time zone") ? `(${column} AT TIME ZONE 'Asia/Bangkok')::date` : lower.startsWith("timestamp") ? `${column}::date` : column;
    return `${day} ${COMPARE[filter.op]} ${quoteLiteral(filter.value)}`;
  }
  return `${column} ${COMPARE[filter.op]} ${quoteLiteral(filter.value)}`;
}

// Whole-table query: no LIMIT, the server caps the response and reports truncation.
export function buildTableQuery(table: Pick<SchemaTable, "name" | "columns">, filters: TableFilter[] = []): string {
  const conditions = filters.map((filter) => filterCondition(table.columns.find((c) => c.name === filter.column)?.type ?? "text", filter));
  const where = conditions.length ? `\nWHERE ${conditions.join("\n  AND ")}` : "";
  return `SELECT * FROM ${quoteIdent(table.name)}${where};`;
}
