"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ApiError, type BackendApi } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { Button, ConfirmDialog, ToneBadge } from "../../components/staff-ui/staff-ui";
import { SqlFilterBar } from "./sql-filter-bar";
import { SqlSchemaPanel } from "./sql-schema-panel";
import { STATUS_SHORTCUTS, buildStatusCountQuery, buildTableQuery, highlight, isSchemaChange, lineColumn, newlineIndent, shortType, toCsv, toTsv, type SchemaTable, type SqlResult, type TableFilter } from "./sql-domain";
import styles from "./sql-console.module.css";

type Failure = { message: string; sqlstate?: string; position?: number; detail?: string; hint?: string; sql: string };

const SAMPLE = "-- Ctrl + Enter เพื่อรัน\nSELECT now() AS current_time;";

// Super Admin only (the API enforces it). One statement per run; destructive statements are
// confirmed here and again enforced by the server.
export function SqlConsole({ api }: { api: BackendApi }) {
  const schema = useResource<{ tables: SchemaTable[] }>(api, "/admin/sql/schema");
  const [sql, setSql] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(SqlResult & { sql: string }) | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [sort, setSort] = useState<{ col: number; desc: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [editorOpen, setEditorOpen] = useState(true);
  // The table being browsed and the SQL the panel/filters wrote for it. Any manual edit makes
  // the editor differ from that SQL, which hides the filter bar so it can never overwrite it.
  const [browsing, setBrowsing] = useState<{ table: string; sql: string } | null>(null);
  const [filters, setFilters] = useState<TableFilter[]>([]);
  const running = useRef(false);
  const mirror = useRef<HTMLPreElement>(null);

  async function run(confirmed = false, text = sql) {
    if (running.current || !text.trim()) return;
    running.current = true; setBusy(true); setNote("");
    try {
      const res = await api.call<SqlResult>("/admin/sql/execute", "POST", { sql: text, confirm: confirmed });
      setResult({ ...res, sql: text }); setFailure(null); setSort(null);
      if (isSchemaChange(res.command)) schema.reload();
    } catch (error) {
      if (error instanceof ApiError && error.code === "confirmation_required") setConfirm(error.message);
      else {
        // Old rows under a failed filter would read as that filter's result.
        setResult(null);
        if (error instanceof ApiError && error.status === 404) setFailure({ sql: text, message: "SQL console ยังไม่เปิดใช้งานบนเซิร์ฟเวอร์ (SQL_CONSOLE_ENABLE=true)" });
        else if (error instanceof ApiError) {
          const d = error.details ?? {};
          setFailure({ sql: text, message: error.message, sqlstate: d.sqlstate as string | undefined, position: (d.position as number) || undefined, detail: d.detail as string | undefined, hint: d.hint as string | undefined });
        } else setFailure({ sql: text, message: "ติดต่อเซิร์ฟเวอร์ไม่ได้ คำสั่งอาจยังไม่ถูกรัน ตรวจสอบก่อนรันซ้ำ" });
      }
    } finally { running.current = false; setBusy(false); }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const el = event.currentTarget;
    const edit = (text: string, from = el.selectionStart, to = el.selectionEnd) => {
      event.preventDefault();
      const next = el.value.slice(0, from) + text + el.value.slice(to);
      setSql(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = from + text.length; });
    };
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void run(); }
    else if (event.key === "Enter" && !event.shiftKey) edit(newlineIndent(el.value, el.selectionStart));
    else if (event.key === "Tab" && !event.shiftKey) edit("  ");
  }

  const rows = useMemo(() => {
    if (!result || !sort) return result?.rows ?? [];
    const numeric = result.rows.every((r) => r[sort.col] === null || r[sort.col] !== "" && !Number.isNaN(Number(r[sort.col])));
    return [...result.rows].sort((a, b) => {
      const x = a[sort.col], y = b[sort.col];
      if (x === y) return 0; if (x === null) return 1; if (y === null) return -1;
      const c = numeric ? Number(x) - Number(y) : x.localeCompare(y);
      return sort.desc ? -c : c;
    });
  }, [result, sort]);

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob(["﻿" + toCsv({ columns: result.columns, rows })], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "query-result.csv"; a.click(); URL.revokeObjectURL(url);
  }
  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(toTsv({ columns: result.columns, rows })); setNote("คัดลอกผลลัพธ์แล้ว"); } catch { setNote("คัดลอกไม่สำเร็จ ตรวจสอบสิทธิ์คลิปบอร์ดของเบราว์เซอร์"); }
  }

  function runTableQuery(table: SchemaTable, next: TableFilter[]) {
    const text = buildTableQuery(table, next);
    setBrowsing({ table: table.name, sql: text });
    setSql(text);
    setEditorOpen(false);
    void run(false, text);
  }
  function browse(table: SchemaTable) { setFilters([]); runTableQuery(table, []); }
  function runShortcut(text: string) {
    setBrowsing(null);
    setFilters([]);
    setSql(text);
    setEditorOpen(false);
    void run(false, text);
  }

  const tables = schema.data?.tables ?? null;
  const filterTable = browsing && browsing.sql === sql ? tables?.find((t) => t.name === browsing.table) ?? null : null;
  const where = failure?.position ? lineColumn(failure.sql, failure.position) : null;
  const hasRows = Boolean(result && result.columns.length > 0);

  return <div className={styles.layout}>
    <SqlSchemaPanel tables={tables} loading={schema.loading} failed={Boolean(schema.error)} busy={busy} activeTable={filterTable?.name ?? null} onReload={schema.reload} onQuery={(t) => browse(t)} />

    <section className={styles.main} aria-label="SQL console">
      <div className={styles.shortcuts} role="group" aria-label="นับจำนวนตาม status">
        <span className={styles.muted}>นับ status</span>
        {STATUS_SHORTCUTS.map((shortcut) => {
          const text = buildStatusCountQuery(shortcut);
          return <button key={`${shortcut.table}.${shortcut.column}`} type="button" className={styles.shortcut} aria-pressed={sql === text} disabled={busy} onClick={() => runShortcut(text)}>{shortcut.label}</button>;
        })}
      </div>

      {editorOpen ? <div className={styles.editorPanel}>
        <div className={styles.editor}>
          <pre ref={mirror} className={styles.mirror} aria-hidden="true">{highlight(sql).map((t, i) => <span key={i} className={styles[t.kind]}>{t.text}</span>)}{"\n"}</pre>
          <textarea className={styles.input} value={sql} spellCheck={false} aria-label="SQL editor" autoCapitalize="off" autoCorrect="off"
            onChange={(e) => setSql(e.target.value)} onKeyDown={onKeyDown}
            onScroll={(e) => { if (mirror.current) { mirror.current.scrollTop = e.currentTarget.scrollTop; mirror.current.scrollLeft = e.currentTarget.scrollLeft; } }} />
        </div>
        <div className={styles.toolbar}>
          <Button variant="primary" onClick={() => void run()} disabled={busy || !sql.trim()}>{busy ? "กำลังรัน…" : "รันคำสั่ง"}</Button>
          {result && <Button variant="text" onClick={() => setEditorOpen(false)}>ย่อ</Button>}
          <span className={styles.muted}>Ctrl + Enter · ครั้งละ 1 คำสั่ง · หมดเวลา 10 วินาที</span>
        </div>
      </div> : <div className={styles.sqlLine}>
        <code title={sql}>{sql.replace(/\s+/g, " ")}</code>
        <Button onClick={() => setEditorOpen(true)}>แก้ไข SQL</Button>
      </div>}

      {filterTable && <SqlFilterBar table={filterTable} filters={filters} busy={busy} currentSql={sql} onChange={setFilters} onApply={(next) => runTableQuery(filterTable, next)} />}

      <div className={styles.status} role="status" aria-live="polite">
        <span>
          {busy && "กำลังรันคำสั่ง…"}
          {!busy && result && !failure && <><ToneBadge tone="done">สำเร็จ</ToneBadge> {result.columns.length ? `${result.rows.length.toLocaleString("th-TH")} แถว` : `${result.command} · กระทบ ${result.rows_affected.toLocaleString("th-TH")} แถว`} · {result.elapsed_ms} ms</>}
          {note && <> · {note}</>}
        </span>
        {hasRows && <span className={styles.resultActions}><Button variant="text" onClick={() => void copy()}>คัดลอก</Button><Button variant="text" onClick={download}>ส่งออก CSV</Button></span>}
      </div>

      {result?.truncated && <p className={styles.truncated} role="note">แสดงเฉพาะ 1,000 แถวแรก ข้อมูลมีมากกว่านี้ {filterTable ? "ใช้ Filter เพื่อแคบผลลัพธ์" : "เพิ่ม WHERE เพื่อแคบผลลัพธ์"}</p>}

      {failure && <div className={styles.error} role="alert">
        <strong>คำสั่งไม่สำเร็จ{failure.sqlstate && ` (SQLSTATE ${failure.sqlstate})`}</strong>
        <p>{failure.message}</p>
        {where && <p>ที่บรรทัด {where.line} คอลัมน์ {where.column}</p>}
        {failure.detail && <p>{failure.detail}</p>}
        {failure.hint && <p>คำแนะนำ: {failure.hint}</p>}
        {failure.sqlstate && <small>ไม่มีการเปลี่ยนแปลงข้อมูล (rollback แล้ว)</small>}
      </div>}

      {hasRows && result && <div className={styles.results}>
        <div className={styles.scroll}><table>
          <thead><tr>{result.columns.map((c, i) => <th key={i} scope="col" aria-sort={sort?.col === i ? (sort.desc ? "descending" : "ascending") : undefined}>
            <button type="button" className={styles.sortButton} onClick={() => setSort(sort?.col === i ? { col: i, desc: !sort.desc } : { col: i, desc: false })}>{c.name}{sort?.col === i && <span aria-hidden="true"> {sort.desc ? "↓" : "↑"}</span>}<small>{shortType(c.type)}</small></button></th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} title={v ?? undefined}>{v === null ? <em className={styles.null}>NULL</em> : v}</td>)}</tr>)}</tbody>
        </table></div>
        {!rows.length && <p className={styles.emptyResult}>{filterTable && filters.length ? "ไม่พบข้อมูลตาม Filter นี้" : "ไม่มีแถวผลลัพธ์"}</p>}
      </div>}

      {!result && !failure && !busy && <p className={styles.emptyResult}>เลือกตารางทางซ้ายแล้วกด Query ทั้งตาราง หรือเขียน SQL แล้วกดรันคำสั่ง</p>}
    </section>

    <ConfirmDialog open={confirm !== null} title="ยืนยันคำสั่งที่อาจทำลายข้อมูล?" confirmLabel="ยืนยันและรัน" danger onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); void run(true); }}>
      <p>{confirm}</p><pre className={styles.confirmSql}>{sql}</pre><p>การกระทำนี้ย้อนกลับไม่ได้ และรันบนฐานข้อมูลจริง</p>
    </ConfirmDialog>
  </div>;
}
