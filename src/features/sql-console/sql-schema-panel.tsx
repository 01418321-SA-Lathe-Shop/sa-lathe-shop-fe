"use client";

import { useState } from "react";
import { Button, LoadError, Skeleton, ToneBadge } from "../../components/staff-ui/staff-ui";
import { ER_TABLES, erName, keyColumns, shortType, type SchemaTable, type WriteKind } from "./sql-domain";
import styles from "./sql-console.module.css";

type Props = {
  tables: SchemaTable[] | null;
  loading: boolean;
  failed: boolean;
  busy: boolean;
  activeTable: string | null;
  onReload: () => void;
  onQuery: (table: SchemaTable) => void;
  onTemplate: (table: SchemaTable, kind: WriteKind) => void;
};

// Table list: search, one open table at a time, a whole-table query button and the attributes.
export function SqlSchemaPanel({ tables, loading, failed, busy, activeTable, onReload, onQuery, onTemplate }: Props) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const allTables = tables ?? [];
  const scope = showAll ? allTables : allTables.filter((t) => ER_TABLES.has(t.name));
  const needle = search.trim().toLowerCase();
  const shown = needle ? scope.filter((t) => t.name.toLowerCase().includes(needle)) : scope;

  return <aside className={styles.schema} aria-label="ตารางในฐานข้อมูล">
    <div className={styles.bar}><h2>ตาราง</h2><Button variant="text" onClick={onReload} disabled={loading}>รีเฟรช</Button></div>
    {loading && !tables && <Skeleton label="กำลังโหลดตาราง…" />}
    {failed && !tables && <LoadError title="โหลดรายการตารางไม่สำเร็จ (ต้องเป็น Super Admin และเปิด SQL_CONSOLE_ENABLE)" onRetry={onReload} />}
    {tables && <input className={styles.search} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาตาราง…" aria-label="ค้นหาตาราง" />}
    {tables && !shown.length && <p className={styles.muted}>{needle ? "ไม่พบตารางที่ค้นหา" : "ยังไม่มีตารางใน schema public"}</p>}
    <ul className={styles.tableList}>
      {shown.map((t) => {
        const isOpen = open === t.name;
        const keys = keyColumns(t);
        return <li key={t.name} className={t.name === activeTable ? styles.activeTable : undefined}>
          <button type="button" className={styles.tableName} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.name)}>
            <span className={styles.chevron} aria-hidden="true" />
            <span className={styles.nameText}>{erName(t.name) ?? t.name}</span>
            {t.kind === "view" && <ToneBadge tone="quiet">view</ToneBadge>}
          </button>
          {isOpen && <div className={styles.tableBody}>
            <Button variant="primary" className={styles.queryButton} onClick={() => onQuery(t)} disabled={busy}>Query ทั้งตาราง</Button>
            {t.kind === "table" && <div className={styles.writeButtons} role="group" aria-label={`เขียน SQL แก้ไขข้อมูลใน ${t.name}`}>
              {(["insert", "update", "delete"] as const).map((kind) => <Button key={kind} onClick={() => onTemplate(t, kind)} disabled={busy}>{kind.toUpperCase()}</Button>)}
            </div>}
            <ul className={styles.attributes} aria-label={`Attributes ของ ${t.name}`}>
              {t.columns.map((c) => <li key={c.name}>
                <code>{c.name}</code>
                {keys.pk.has(c.name) && <span className={styles.pk}>PK</span>}
                {keys.fk.has(c.name) && <span className={styles.fk}>FK</span>}
                <span className={styles.type}>{shortType(c.type)}</span>
              </li>)}
            </ul>
          </div>}
        </li>;
      })}
    </ul>
    {tables && <label className={styles.showAll}><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> แสดงทุกตาราง ({allTables.length})</label>}
  </aside>;
}
