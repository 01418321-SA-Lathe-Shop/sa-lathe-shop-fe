"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "../appearance/icons";
import { statusOf, type StatusMap, type Tone } from "./staff-labels";
import styles from "./staff-ui.module.css";

// Shared Staff/Admin building blocks (approved design system). Status is never
// shown by colour alone: every badge carries Thai text and a shaped dot.

export function StatusBadge({ map, value }: { map: StatusMap; value: string }) {
  const status = statusOf(map, value);
  return <ToneBadge tone={status.tone}>{status.label}</ToneBadge>;
}

export function ToneBadge({ tone, children }: { tone: Tone | "today" | "danger" | "quiet"; children: ReactNode }) {
  return <span className={styles.badge} data-tone={tone}><span className={styles.dot} aria-hidden="true" />{children}</span>;
}

export type TabItem = { key: string; label: string; count?: number; attention?: boolean };
export function StatusTabs({ label, tabs, current, href, loading = false, unavailable = false }: { label: string; tabs: TabItem[]; current: string; href: (key: string) => string; loading?: boolean; unavailable?: boolean }) {
  return <nav className={styles.tabs} aria-label={label}>{tabs.map((tab) => {
    const count = loading ? "…" : unavailable || tab.count === undefined ? "—" : String(tab.count);
    return <Link key={tab.key} href={href(tab.key)} scroll={false} aria-current={current === tab.key ? "page" : undefined}>
      <span>{tab.label}</span><span className={styles.count} data-attention={tab.attention && tab.count ? "true" : undefined} aria-hidden="true">{count}</span>
      <span className={styles.visuallyHidden}>{loading ? " กำลังนับ" : unavailable ? " ยังนับไม่ได้" : ` ${count} รายการ${tab.attention && tab.count ? " ต้องดำเนินการ" : ""}`}</span>
    </Link>;
  })}</nav>;
}

export function SearchForm({ label, placeholder, value, onSearch }: { label: string; placeholder: string; value: string; onSearch: (value: string) => void }) {
  return <form key={value} role="search" className={styles.search} onSubmit={(event) => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("q") ?? "").trim()); }}>
    <label><span className={styles.visuallyHidden}>{label}</span><Icon name="search" size={18} /><input name="q" type="search" defaultValue={value} placeholder={placeholder} maxLength={200} /></label>
    <button type="submit" className={styles.secondary}>ค้นหา</button>
  </form>;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small className={styles.fieldError}>{error}</small>}</label>;
}

export function Button({ variant = "secondary", children, ...props }: { variant?: "primary" | "secondary" | "danger" | "text" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${styles[variant]} ${props.className ?? ""}`}>{children}</button>;
}

export function NextAction({ title, step, children }: { title: string; step?: ReactNode; children: ReactNode }) {
  return <section className={styles.nextAction} aria-label={`ขั้นตอนถัดไป: ${title}`}>{step}<h3>{title}</h3>{children}</section>;
}

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return <ol className={styles.steps} aria-label="ขั้นตอนของงาน">{steps.map((step, index) => <li key={step} data-state={index < current ? "done" : index === current ? "current" : undefined} aria-current={index === current ? "step" : undefined}><span aria-hidden="true">{index < current ? "✓" : index + 1}</span>{step}</li>)}</ol>;
}

export function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  return <details className={styles.collapsible}><summary>{title}</summary><div>{children}</div></details>;
}

/** Native modal confirmation; irreversible actions list checks that must all be ticked. */
export function ConfirmDialog({ open, title, children, checks = [], confirmLabel, danger = false, onConfirm, onClose }: { open: boolean; title: string; children: ReactNode; checks?: string[]; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const [ticked, setTicked] = useState<boolean[]>([]); const titleId = useId();
  useEffect(() => {
    const node = dialog.current; if (!node) return;
    if (open && !node.open) node.showModal(); else if (!open && node.open) node.close();
  }, [open]);
  const ready = checks.every((_, index) => ticked[index]);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={() => setTicked([])}>
    {open && <form method="dialog" onSubmit={(event) => { event.preventDefault(); if (ready) onConfirm(); }}>
      <h2 id={titleId}>{title}</h2><div className={styles.dialogBody}>{children}</div>
      {checks.map((check, index) => <label key={check} className={styles.check}><input type="checkbox" checked={Boolean(ticked[index])} onChange={(event) => setTicked((old) => { const next = [...old]; next[index] = event.target.checked; return next; })} />{check}</label>)}
      <div className={styles.dialogActions}><button type="button" className={styles.secondary} onClick={onClose}>ยกเลิก</button><button type="submit" className={danger ? styles.danger : styles.primary} disabled={!ready}>{confirmLabel}</button></div>
    </form>}
  </dialog>;
}

/** Native modal side panel: slides in from the right on desktop, full screen on phones. */
export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const titleId = useId();
  useEffect(() => {
    const node = dialog.current; if (!node) return;
    if (open && !node.open) node.showModal(); else if (!open && node.open) node.close();
  }, [open]);
  return <dialog ref={dialog} className={styles.drawer} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    {open && <><header className={styles.drawerHeader}><h2 id={titleId}>{title}</h2><button type="button" className={styles.secondary} onClick={onClose} aria-label="ปิดแผงนี้"><Icon name="close" size={18} /></button></header>
      <div className={styles.drawerBody}>{children}</div></>}
  </dialog>;
}

/** Shown when a write's response was lost; retry resends the frozen original command. */
export function RetryPanel({ busy, onRetry, onDiscard }: { busy: boolean; onRetry: () => void; onDiscard: () => void }) {
  return <div className={styles.retry} role="alert"><strong>ไม่แน่ใจว่าบันทึกสำเร็จหรือไม่</strong><p>การเชื่อมต่อขัดข้องระหว่างบันทึก ข้อมูลอาจถูกบันทึกไปแล้ว ส่งซ้ำแบบเดิมจะไม่บันทึกซ้ำ ถ้าต้องการแก้ข้อมูล ให้โหลดข้อมูลล่าสุดก่อน</p>
    <div className={styles.row}><button type="button" className={styles.primary} disabled={busy} onClick={onRetry}>ส่งซ้ำแบบเดิม</button><button type="button" className={styles.secondary} disabled={busy} onClick={onDiscard}>โหลดข้อมูลล่าสุด</button></div>
  </div>;
}

export function ErrorText({ error }: { error?: string }) {
  return error ? <p className={styles.error} role="alert">{/[ก-๙]/.test(error) ? error : "บันทึกไม่สำเร็จ ตรวจข้อมูลแล้วลองอีกครั้ง หรือโหลดข้อมูลล่าสุดก่อนแก้ไข"}</p> : null;
}

/** Success message that hides itself after five seconds. */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  // Latest onDone in a ref so parent re-renders (new callback each time) do not restart the timer.
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => done.current(), 5000); return () => clearTimeout(timer); }, [message]);
  return <div className={styles.toast} role="status" aria-live="polite">{message && <><span aria-hidden="true">✓</span>{message}</>}</div>;
}

export function Skeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return <div role="status" aria-label={label}><span className={styles.visuallyHidden}>{label}</span><div className={styles.skeleton} aria-hidden="true">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div></div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <section className={styles.empty}><Icon name="inbox" size={28} /><h3>{title}</h3>{children && <p>{children}</p>}</section>;
}

export function LoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return <div className={styles.loadError} role="alert"><strong>{title}</strong><p>ตรวจการเชื่อมต่อแล้วลองอีกครั้ง</p><button type="button" className={styles.secondary} onClick={onRetry}>ลองอีกครั้ง</button></div>;
}

export function TruncatedNotice({ show }: { show: boolean }) {
  return show ? <p className={styles.notice}>แสดงและนับได้ 1,000 รายการแรก จำนวนในแท็บอาจไม่ครบ</p> : null;
}
