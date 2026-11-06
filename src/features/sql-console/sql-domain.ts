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
export const ER_TABLES = new Set("person customer customer_address admin worker job_request request_attachment quotation quotation_cost term_evidence job job_photo material unit unit_conversion supplier material_order material_order_item material_receipt_line material_claim material_reservation job_material_usage stock_movement delivery invoice customer_payment payment_allocation".split(" "));

// ER entity name shown in the panel; only differs from the table name where the schema renamed it. Queries always use the real table name.
const ER_RENAMED: Record<string, string> = { customer_payment: "PAYMENT", customer_address: "ADDRESS", material_claim: "MATERIAL_DEFECT_LOG" };
export const erName = (table: string): string | null => (ER_TABLES.has(table) ? ER_RENAMED[table] ?? table.toUpperCase() : null);
