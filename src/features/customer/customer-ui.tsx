"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";

export function PageTitle({ title, description, action, back }: { title: string; description?: string; action?: ReactNode; back?: string }) {
  return <><header className="cust-heading">{back && <Link className="cust-back" href={back}><Icon name="arrow" size={16} /> กลับ</Link>}<div><div><h1 tabIndex={-1}>{title}</h1>{description && <p>{description}</p>}</div>{action}</div></header></>;
}
export function Badge({ value, labels }: { value: string; labels: Record<string, string> }) {
  const tone = ["approved", "paid", "delivered", "completed"].includes(value) ? "success" : ["rejected", "returned"].includes(value) ? "danger" : ["in_progress", "shipping", "ongoing", "sent"].includes(value) ? "info" : "quiet";
  return <span className={`cust-badge ${tone}`}><span aria-hidden="true" className="cust-status-dot" />{labels[value] ?? "สถานะยังไม่ระบุ"}</span>;
}
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <section className="cust-empty"><Icon name="inbox" size={30} /><h2>{title}</h2>{children && <p>{children}</p>}{action}</section>;
}
export function ResourceFeedback({ loading, error, reload }: { loading?: boolean; error?: string; reload?: () => void }) {
  return <>{loading && <div className="cust-loading" role="status"><span />กำลังโหลดข้อมูล…</div>}{error && <div className="cust-alert danger" role="alert"><strong>ยังโหลดข้อมูลล่าสุดไม่ได้</strong><p>{/[ก-๙]/.test(error) ? error : "กรุณาลองอีกครั้ง หากเพิ่งบันทึกข้อมูล ให้ตรวจสอบสถานะก่อนส่งซ้ำ"}</p>{reload && <button type="button" onClick={reload}>ลองอีกครั้ง</button>}</div>}</>;
}
export function ActionFeedback({ busy, error, message }: { busy?: boolean; error?: string; message?: string }) {
  return <>{busy && <p role="status" className="cust-muted">กำลังดำเนินการ…</p>}{error && <p role="alert" className="cust-alert danger">{/[ก-๙]/.test(error) ? error : "ดำเนินการไม่สำเร็จ ตรวจสอบข้อมูลและโหลดสถานะล่าสุดก่อนส่งซ้ำ"}</p>}{message && <p role="status" className="cust-alert success">{message}</p>}</>;
}
export function Limited({ complete }: { complete?: boolean }) {
  return complete === false ? <p className="cust-alert">ข้อมูลยังไม่ครบ การค้นหาและจำนวนครอบคลุมเฉพาะรายการที่โหลดสำเร็จ · ระบบโหลดได้สูงสุด 1,000 รายการต่อชุด</p> : null;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="cust-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function PrivateFile({ api, path, name = "เปิดไฟล์" }: { api: BackendApi; path: string; name?: string }) {
  const action = useCommand();
  return <><button type="button" className="cust-link" disabled={action.busy} onClick={() => void action.run((signal) => api.download(path, undefined, signal), "เปิดไฟล์ส่วนตัวแล้ว")}>{name} <Icon name="arrow" size={14} /></button><ActionFeedback {...action} /></>;
}
export function LocalPages({ count, page, setPage }: { count: number; page: number; setPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / 20));
  if (pages <= 1) return null;
  return <nav className="cust-pagination" aria-label="หน้ารายการ"><button disabled={page === 0} onClick={() => setPage(page - 1)}>ก่อนหน้า</button><span>หน้า {page + 1} / {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>ถัดไป</button></nav>;
}
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return <details className="cust-disclosure"><summary>{title}</summary>{children}</details>;
}
export function ConfirmChoice({ title, children, onConfirm, onCancel, busy = false, danger = false }: { title: string; children: ReactNode; onConfirm: () => void; onCancel: () => void; busy?: boolean; danger?: boolean }) {
  const [checked, setChecked] = useState(false);
  const section = useRef<HTMLElement>(null);
  useEffect(() => { section.current?.focus(); }, []);
  return <section ref={section} tabIndex={-1} className="cust-confirm" aria-label={title}><h2>{title}</h2>{children}<label className="cust-checkbox"><input type="checkbox" checked={checked} disabled={busy} onChange={(e) => setChecked(e.target.checked)} />ฉันอ่านรายละเอียดและยืนยันการดำเนินการนี้</label><div className="cust-actions"><button className={danger ? "cust-danger" : "cust-primary"} disabled={!checked || busy} onClick={onConfirm}>ยืนยัน</button><button disabled={busy} onClick={onCancel}>กลับไปตรวจสอบ</button></div></section>;
}
