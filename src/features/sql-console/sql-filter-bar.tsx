"use client";

import { useState, type FormEvent } from "react";
import { Button } from "../../components/staff-ui/staff-ui";
import { buildTableQuery, erName, filterError, filterKind, opLabel, opNeedsValue, opsFor, type FilterOp, type SchemaTable, type TableFilter } from "./sql-domain";
import styles from "./sql-console.module.css";

type Props = {
  table: SchemaTable;
  filters: TableFilter[];
  busy: boolean;
  currentSql: string;
  onChange: (filters: TableFilter[]) => void;
  onApply: (filters: TableFilter[]) => void;
};

// Filters for the table chosen from the panel. Applying writes a real WHERE into the editor and runs it.
export function SqlFilterBar({ table, filters, busy, currentSql, onChange, onApply }: Props) {
  const [showErrors, setShowErrors] = useState(false);
  const typeOf = (column: string) => table.columns.find((c) => c.name === column)?.type ?? "text";
  const kindOf = (column: string) => filterKind(typeOf(column));
  const update = (id: number, patch: Partial<TableFilter>) => onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  function add() {
    const column = table.columns[0]?.name;
    if (!column) return;
    onChange([...filters, { id: Math.max(0, ...filters.map((f) => f.id)) + 1, column, op: opsFor(kindOf(column))[0], value: "" }]);
    setShowErrors(false);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (filters.some((f) => filterError(kindOf(f.column), f))) { setShowErrors(true); return; }
    setShowErrors(false);
    onApply(filters);
  }
  // Removing every row still needs an apply when the running query is filtered.
  const canApply = filters.length > 0 || buildTableQuery(table) !== currentSql;

  return <form className={styles.filters} onSubmit={submit} aria-label={`Filter ตาราง ${table.name}`} noValidate>
    <div className={styles.bar}>
      <strong className={styles.filterTitle}>{erName(table.name) ?? table.name}</strong>
      <span className={styles.filterActions}>
        {filters.length > 0 && <Button variant="text" onClick={() => onChange([])} disabled={busy}>ล้างทั้งหมด</Button>}
        <Button onClick={add} disabled={!table.columns.length}>+ เพิ่ม Filter</Button>
        {canApply && <Button variant="primary" type="submit" disabled={busy}>{busy ? "กำลังกรอง…" : "ใช้ Filter"}</Button>}
      </span>
    </div>
    {filters.map((f) => {
      const kind = kindOf(f.column);
      const error = showErrors ? filterError(kind, f) : null;
      return <div key={f.id} className={styles.filterRow}>
        <select aria-label="Attribute" value={f.column} onChange={(e) => update(f.id, { column: e.target.value, op: opsFor(kindOf(e.target.value))[0], value: "" })}>
          {table.columns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select aria-label="เงื่อนไข" value={f.op} onChange={(e) => update(f.id, { op: e.target.value as FilterOp })}>
          {opsFor(kind).map((op) => <option key={op} value={op}>{opLabel(kind, op)}</option>)}
        </select>
        {opNeedsValue(f.op)
          ? <input aria-label="ค่า" aria-invalid={Boolean(error)} type={kind === "date" ? "date" : "text"} inputMode={kind === "number" ? "decimal" : undefined} value={f.value} placeholder={kind === "number" ? "ตัวเลข" : "ค่า"} onChange={(e) => update(f.id, { value: e.target.value })} />
          : <span />}
        <button type="button" className={styles.removeFilter} aria-label={`ลบ Filter ${f.column}`} onClick={() => onChange(filters.filter((x) => x.id !== f.id))}>×</button>
        {error && <p className={styles.filterError} role="alert">{error}</p>}
      </div>;
    })}
  </form>;
}
