"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { BackendApi, Notification } from "../../lib/api/backend-api";
import { Icon } from "../../components/appearance/icons";
import { useCommand } from "../../hooks/backend-hooks";
import { useCollection, useNow } from "./customer-hooks";
import { customerHref, dateTH, isBangkokToday, relativeTH, thaiNotice, unreadCount } from "./customer-domain";
import { ActionFeedback, Empty, Limited, PageTitle, ResourceFeedback } from "./customer-ui";
import { markNotifications } from "./customer-notification-domain";

export function CustomerNotifications({ api, panel = false, onClose, revision = 0 }: { api: BackendApi; panel?: boolean; onClose?: () => void; revision?: number }) {
  const resource = useCollection<Notification>(api, "/notifications");
  const router = useRouter();
  const [tab, setTab] = useState("all"); const [shown, setShown] = useState(20);
  const [read, setRead] = useState<Set<string>>(new Set()); const action = useCommand(); const now = useNow();
  const all = resource.data?.items ?? [];
  const unread = all.filter((item) => !item.read_at && !read.has(item.id));
  const items = (tab === "unread" ? unread : all).slice(0, shown);
  const reload = resource.reload;
  useEffect(() => {
    window.addEventListener("lathe-inbox-read", reload);
    return () => window.removeEventListener("lathe-inbox-read", reload);
  }, [reload]);
  async function mark(ids: string[], signal: AbortSignal) {
    await markNotifications(api, ids, signal, (id) => setRead((old) => new Set([...old, id])), () => window.dispatchEvent(new Event("lathe-inbox-read")));
  }
  return <section className={panel ? "cust-inbox-panel" : "cust-notification-page"} aria-label="การแจ้งเตือน" data-revision={revision}>
    {!panel && <PageTitle title="การแจ้งเตือนทั้งหมด" description="ความคืบหน้าและเอกสารที่เกี่ยวข้องกับคำขอของคุณ" />}
    <div className="cust-toolbar"><h2>{panel ? "การแจ้งเตือน" : "ข้อความของคุณ"}</h2><button className="cust-link" disabled={action.busy || resource.loading || !resource.data?.complete || Boolean(resource.error) || !unread.length} onClick={() => void action.run((signal) => mark(unread.map((item) => item.id), signal), "ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว")}>อ่านทั้งหมด</button>{panel && <button aria-label="ปิดการแจ้งเตือน" onClick={onClose}><Icon name="close" /></button>}</div>
    <div className="cust-tabs" aria-label="กรองการแจ้งเตือน">{[["all", "ทั้งหมด"], ["unread", "ยังไม่อ่าน"]].map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setShown(20); }}>{label}</button>)}</div>
    <ResourceFeedback {...resource} /><Limited complete={resource.data?.complete} /><ActionFeedback {...action} />
    <div className="cust-notification-scroll">
      {resource.data && !items.length && !resource.loading && !resource.error && <Empty title={tab === "unread" ? "คุณอ่านการแจ้งเตือนครบแล้ว" : "ยังไม่มีการแจ้งเตือน"}>เมื่อมีความคืบหน้า คุณจะเห็นที่นี่</Empty>}
      {now !== null && [true, false].map((today) => {
        const group = items.filter((item) => isBangkokToday(item.created_at, now) === today);
        return group.length ? <section key={String(today)}><h3 className="cust-group-title">{today ? "ใหม่ · วันนี้" : "ก่อนหน้านี้"}</h3>{group.map((item) => {
          const isRead = Boolean(item.read_at) || read.has(item.id);
          const reference = item.title.match(/#\s*(\d+)/)?.[1];
          return <article className={`cust-notification ${isRead ? "" : "unread"}`} key={item.id}>
            <span className="cust-notice-icon"><Icon name="bell" /></span><div><Link onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void action.run(async (signal) => { if (!isRead) await mark([item.id], signal); }, "").then(() => { onClose?.(); router.push(customerHref("requests", { request: item.request_id })); }); }} href={customerHref("requests", { request: item.request_id })}>{thaiNotice(item.title)}<strong>{reference ? `คำขอ #${reference}` : "เปิดคำขอที่เกี่ยวข้อง"} <Icon name="arrow" size={14} /></strong></Link><time dateTime={item.created_at} title={dateTH(item.created_at)}>{relativeTH(item.created_at, now)}</time></div>
            {!isRead && <span className="cust-unread-dot" aria-label="ยังไม่อ่าน" />}
            <details><summary aria-label="ตัวเลือกการแจ้งเตือน">•••</summary><div><button disabled={isRead || action.busy} onClick={() => void action.run((signal) => mark([item.id], signal), "ทำเครื่องหมายว่าอ่านแล้ว")}>ทำเป็นอ่านแล้ว</button><button disabled title="ขณะนี้ยังทำเป็นยังไม่อ่านไม่ได้">ทำเป็นยังไม่อ่าน — ยังไม่รองรับ</button></div></details>
          </article>;
        })}</section> : null;
      })}
      {(tab === "unread" ? unread : all).length > shown && <button className="cust-load-more" onClick={() => setShown(shown + 20)}>โหลดเพิ่ม</button>}
    </div>
    <details className="cust-notification-help"><summary>เกี่ยวกับการแจ้งเตือน</summary><p className="cust-muted cust-small">ขณะนี้แต่ละข้อความเปิดได้ถึงคำขอที่เกี่ยวข้อง ยังไม่รองรับลิงก์ตรงไปงานหรือใบแจ้งหนี้ทุกประเภท การอ่านทั้งหมดอาจสำเร็จเพียงบางข้อความหากการเชื่อมต่อขัดข้อง</p></details>
    {panel && <Link className="cust-inbox-footer" onClick={onClose} href="/customer/inbox">ดูการแจ้งเตือนทั้งหมด <Icon name="arrow" size={16} /></Link>}
  </section>;
}

export function NotificationBell({ api, beforeOpen }: { api: BackendApi; beforeOpen?: () => void }) {
  const resource = useCollection<Notification>(api, "/notifications"); const [open, setOpen] = useState(false); const [revision, setRevision] = useState(0);
  const reload = resource.reload;
  const dialog = useRef<HTMLDialogElement>(null); const bell = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    window.addEventListener("lathe-inbox-read", reload);
    return () => window.removeEventListener("lathe-inbox-read", reload);
  }, [reload]);
  const badge = resource.data && !resource.error ? unreadCount(resource.data.items, resource.data.complete) : "";
  function close() { dialog.current?.close(); setOpen(false); resource.reload(); bell.current?.focus(); }
  return <><button ref={bell} className="cust-bell" aria-label={`การแจ้งเตือน${badge ? resource.data?.complete ? ` · ${badge} ยังไม่อ่าน` : " · ยังตรวจจำนวนไม่ครบ" : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { beforeOpen?.(); setRevision(revision + 1); setOpen(true); dialog.current?.showModal(); }}><Icon name="bell" size={22} />{badge && <span>{badge}</span>}</button>
    <dialog ref={dialog} className="cust-notification-dialog" aria-label="การแจ้งเตือน" onCancel={() => { setOpen(false); resource.reload(); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      {open && <CustomerNotifications key={revision} api={api} panel revision={revision} onClose={close} />}
    </dialog>
  </>;
}
