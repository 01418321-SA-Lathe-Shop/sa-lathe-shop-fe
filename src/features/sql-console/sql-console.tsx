"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ApiError, type BackendApi } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { Button, ConfirmDialog, LoadError, Skeleton, ToneBadge } from "../../components/staff-ui/staff-ui";
import { ER_TABLES, erName, highlight, isSchemaChange, lineColumn, newlineIndent, toCsv, toTsv, type SchemaTable, type SqlResult } from "./sql-domain";
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
  const [showAll, setShowAll] = useState(false);
  const running = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);
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
      else if (error instanceof ApiError && error.status === 404) setFailure({ sql: text, message: "SQL console ยังไม่เปิดใช้งานบนเซิร์ฟเวอร์ (SQL_CONSOLE_ENABLE=true)" });
      else if (error instanceof ApiError) {
        const d = error.details ?? {};
        setFailure({ sql: text, message: error.message, sqlstate: d.sqlstate as string | undefined, position: (d.position as number) || undefined, detail: d.detail as string | undefined, hint: d.hint as string | undefined });
      } else setFailure({ sql: text, message: "ติดต่อเซิร์ฟเวอร์ไม่ได้ คำสั่งอาจยังไม่ถูกรัน ตรวจสอบก่อนรันซ้ำ" });
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
  // Table browser: put a SELECT in the editor and run it right away.
  const browse = (name: string) => { const text = `SELECT * FROM "${name.replaceAll('"', '""')}"
LIMIT 100;`; setSql(text); void run(false, text); };
  const allTables = schema.data?.tables ?? [];
  const tables = showAll ? allTables : allTables.filter((t) => ER_TABLES.has(t.name));
  const where = failure?.position ? lineColumn(failure.sql, failure.position) : null;

  return <div className={styles.layout}>
    <aside className={styles.schema} aria-label="โครงสร้างฐานข้อมูล">
      <div className={styles.bar}><h2>ตารางในฐานข้อมูล</h2><Button onClick={schema.reload} disabled={schema.loading}>รีเฟรช</Button></div>
      {schema.loading && !schema.data && <Skeleton label="กำลังโหลดโครงสร้าง…" />}
      {schema.error && !schema.data && <LoadError title="โหลดโครงสร้างไม่สำเร็จ (ต้องเป็น Super Admin และเปิด SQL_CONSOLE_ENABLE)" onRetry={schema.reload} />}
      {schema.data && <label className={styles.muted}><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> แสดงทุกตาราง ({tables.length} จาก {allTables.length}; ค่าเริ่มต้นเฉพาะตารางตาม ER)</label>}
      {schema.data && !tables.length && <p className={styles.muted}>ยังไม่มีตารางใน schema public</p>}
      {tables.map((t) => <details key={t.name} className={styles.table}>
        <summary>{erName(t.name) ?? t.name}{erName(t.name) && erName(t.name)!.toLowerCase() !== t.name && <small className={styles.muted}> ({t.name})</small>}{t.kind === "view" && <ToneBadge tone="quiet">view</ToneBadge>}<small>{t.columns.length} คอลัมน์</small></summary>
        <button type="button" className={styles.link} onClick={() => browse(t.name)} disabled={busy}>ดูข้อมูลในตาราง (100 แถวแรก)</button>
        <ul aria-label={`คอลัมน์ของ ${t.name}`}>{t.columns.map((c) => <li key={c.name}><code>{c.name}</code> <span>{c.type}{c.not_null ? " · NOT NULL" : ""}{c.default ? ` · default ${c.default}` : ""}</span></li>)}</ul>
        {t.constraints.length > 0 && <><h3>ข้อจำกัดและความสัมพันธ์</h3><ul>{t.constraints.map((k) => <li key={k.name}><ToneBadge tone={k.type === "foreign_key" ? "action" : "quiet"}>{k.type === "foreign_key" ? "FK" : k.type === "primary_key" ? "PK" : k.type === "unique" ? "UQ" : "CHECK"}</ToneBadge> <code>{k.definition}</code></li>)}</ul></>}
        {t.indexes.length > 0 && <><h3>ดัชนี</h3><ul>{t.indexes.map((x) => <li key={x.name}><code>{x.definition}</code></li>)}</ul></>}
      </details>)}
    </aside>

    <section className={styles.main} aria-label="SQL console">
      <div className={styles.editor}>
        <pre ref={mirror} className={styles.mirror} aria-hidden="true">{highlight(sql).map((t, i) => <span key={i} className={styles[t.kind]}>{t.text}</span>)}{"\n"}</pre>
        <textarea ref={area} className={styles.input} value={sql} spellCheck={false} aria-label="SQL editor" autoCapitalize="off" autoCorrect="off"
          onChange={(e) => setSql(e.target.value)} onKeyDown={onKeyDown}
          onScroll={(e) => { if (mirror.current) { mirror.current.scrollTop = e.currentTarget.scrollTop; mirror.current.scrollLeft = e.currentTarget.scrollLeft; } }} />
      </div>
      <div className={styles.toolbar}>
        <Button variant="primary" onClick={() => void run()} disabled={busy || !sql.trim()}>{busy ? "กำลังรัน…" : "รันคำสั่ง (Ctrl + Enter)"}</Button>
        <span className={styles.muted}>คำสั่งละ 1 statement · หมดเวลา 10 วินาที · แสดงสูงสุด 1,000 แถว · DROP / TRUNCATE / UPDATE-DELETE ไม่มี WHERE ต้องยืนยัน</span>
      </div>

      <div className={styles.status} role="status" aria-live="polite">
        {busy && "กำลังรันคำสั่ง…"}
        {!busy && result && !failure && <><ToneBadge tone="done">สำเร็จ</ToneBadge> <strong>{result.command}</strong> · {result.columns.length ? `${result.rows.length.toLocaleString("th-TH")} แถว` : `กระทบ ${result.rows_affected.toLocaleString("th-TH")} แถว`} · {result.elapsed_ms} ms{result.truncated && " · ตัดที่ 1,000 แถว"}</>}
        {note}
      </div>
      {failure && <div className={styles.error} role="alert">
        <strong>คำสั่งไม่สำเร็จ{failure.sqlstate && ` (SQLSTATE ${failure.sqlstate})`}</strong>
        <p>{failure.message}</p>
        {where && <p>ที่บรรทัด {where.line} คอลัมน์ {where.column}</p>}
        {failure.detail && <p>{failure.detail}</p>}
        {failure.hint && <p>คำแนะนำ: {failure.hint}</p>}
        <small>ไม่มีการเปลี่ยนแปลงข้อมูล (rollback แล้ว)</small>
      </div>}

      {result && result.columns.length > 0 && <div className={styles.results}>
        <div className={styles.bar}><span>{result.rows.length.toLocaleString("th-TH")} แถว</span><span><Button onClick={() => void copy()}>คัดลอก</Button> <Button onClick={download}>ส่งออก CSV</Button></span></div>
        <div className={styles.scroll}><table>
          <thead><tr>{result.columns.map((c, i) => <th key={i} scope="col" aria-sort={sort?.col === i ? (sort.desc ? "descending" : "ascending") : undefined}>
            <button type="button" onClick={() => setSort(sort?.col === i ? { col: i, desc: !sort.desc } : { col: i, desc: false })}>{c.name}<small>{c.type}</small></button></th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? <em className={styles.null}>NULL</em> : v}</td>)}</tr>)}</tbody>
        </table></div>
        {!rows.length && <p className={styles.muted}>คำสั่งสำเร็จ แต่ไม่มีแถวผลลัพธ์</p>}
      </div>}
    </section>

    <ConfirmDialog open={confirm !== null} title="ยืนยันคำสั่งที่อาจทำลายข้อมูล?" confirmLabel="ยืนยันและรัน" danger onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); void run(true); }}>
      <p>{confirm}</p><pre className={styles.confirmSql}>{sql}</pre><p>การกระทำนี้ย้อนกลับไม่ได้ และรันบนฐานข้อมูลจริง</p>
    </ConfirmDialog>
  </div>;
}
