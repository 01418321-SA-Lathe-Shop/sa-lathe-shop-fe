import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { documentFilters, documentListHref, documentParams, SORT_LABELS, type DocumentView } from "./customer-documents-domain";
import { Field } from "./customer-ui";
import styles from "./customer-documents.module.css";

export function DocumentFilters({ section, params, view, labels, counts, loading, unavailable }: { section: string; params: URLSearchParams; view: DocumentView; labels: Record<string, string>; counts: Record<string, number>; loading: boolean; unavailable: boolean }) {
  const router = useRouter(); const filters = documentFilters(params);
  function href(key: string, value = "") { const next = documentParams(params); if (value) next.set(key, value); else next.delete(key); next.delete("page"); return documentListHref(section, next); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const next = documentParams(params);
    for (const key of ["q", "from", "to", "type", "min", "max", "sort"]) { const value = String(data.get(key) ?? "").trim(); if (value) next.set(key, value); else next.delete(key); }
    next.delete("page"); router.replace(documentListHref(section, next), { scroll: false });
  }
  const clear = new URLSearchParams(); if (view === "po") clear.set("view", "po");
  const chipLabels: Record<string, string> = { q: "ค้นหา", status: "สถานะ", from: "ตั้งแต่", to: "ถึง", type: "ประเภท", min: "ราคาตั้งแต่", max: "ราคาไม่เกิน", view: "มุมมอง" };
  return <>
    {view !== "tasks" && <nav className={styles.tabs} aria-label="กรองสถานะเอกสาร">{[["", "ทั้งหมด"], ...Object.entries(labels)].map(([value, label]) => <Link key={value} href={href("status", value)} aria-current={filters.status === value ? "page" : undefined}><span>{label}</span><span className={styles.count}>{loading ? "…" : unavailable ? "—" : counts[value] ?? 0}</span></Link>)}</nav>}
    <form key={params.toString()} className={styles.filters} onSubmit={submit}>
      <Field label="ค้นหาเอกสาร"><input type="search" name="q" defaultValue={filters.q} placeholder="เลขใบเสนอราคา / คำขอ / ชื่องาน / ลูกค้า" /></Field>
      <Field label={view === "po" ? "วันที่ส่ง PO ตั้งแต่" : view === "tasks" ? "วันที่ตอบรับตั้งแต่" : "วันที่ส่งใบเสนอราคาตั้งแต่"}><input type="date" name="from" defaultValue={filters.from} /></Field>
      <Field label="ถึงวันที่"><input type="date" name="to" defaultValue={filters.to} /></Field>
      <Field label="ประเภทลูกค้า"><select name="type" defaultValue={filters.type}><option value="">ทั้งหมด</option><option value="individual">บุคคลทั่วไป</option><option value="company">บริษัท</option></select></Field>
      {view === "quotes" && <><Field label="ราคาต่ำสุด (บาท)"><input name="min" inputMode="decimal" defaultValue={filters.min} placeholder="ไม่จำกัด" /></Field><Field label="ราคาสูงสุด (บาท)"><input name="max" inputMode="decimal" defaultValue={filters.max} placeholder="ไม่จำกัด" /></Field></>}
      <Field label="เรียงรายการ"><select name="sort" defaultValue={filters.sort}>{Object.entries(SORT_LABELS).filter(([key]) => view === "quotes" || !key.startsWith("price_")).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      <div className={styles.filterActions}><button type="submit">ใช้ตัวกรอง</button><Link href={documentListHref(section, clear)}>ล้างตัวกรอง</Link></div>
    </form>
    <div className={styles.chips} aria-label="ตัวกรองที่ใช้อยู่">{Object.entries(chipLabels).filter(([key]) => params.get(key) && !(key === "view" && params.get(key) === "po")).map(([key, label]) => { const raw = params.get(key)!; const value = key === "status" ? labels[raw] ?? raw : key === "type" ? raw === "company" ? "บริษัท" : "บุคคลทั่วไป" : key === "view" ? "ประวัติ" : raw; return <Link key={key} href={href(key)} aria-label={`ลบตัวกรอง ${label}: ${value}`}>{label}: {value} <span aria-hidden="true">×</span></Link>; })}</div>
  </>;
}
