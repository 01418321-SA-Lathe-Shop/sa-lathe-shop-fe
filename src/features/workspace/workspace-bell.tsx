"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi, Notification } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";
import { relativeTH, unreadCount } from "../customer/customer-domain";
import { useCollection, useNow } from "../customer/customer-hooks";
import { markNotifications } from "../customer/customer-notification-domain";
import type { Role } from "./workspace-access";
import { workspacePath } from "./workspace-routes";
import { staffNotice, staffNoticeHref } from "./workspace-notifications";

// Same bell pattern as the Customer navbar: full unread count, a dropdown of the
// newest items, and a link to the full inbox. Items open the related request.
export function WorkspaceBell({ api, role }: { api: BackendApi; role: Role }) {
  const resource = useCollection<Notification>(api, "/notifications"); const reload = resource.reload;
  const dialog = useRef<HTMLDialogElement>(null); const bell = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false); const [read, setRead] = useState<Set<string>>(new Set());
  const action = useCommand(); const now = useNow(); const router = useRouter();
  useEffect(() => {
    window.addEventListener("lathe-inbox-read", reload);
    return () => window.removeEventListener("lathe-inbox-read", reload);
  }, [reload]);
  const items = resource.data?.items ?? [];
  const unread = items.filter((item) => !item.read_at && !read.has(item.id));
  const badge = resource.data && !resource.error ? unreadCount(unread, resource.data.complete) : "";
  function close() { dialog.current?.close(); setOpen(false); bell.current?.focus(); }
  async function mark(ids: string[], signal: AbortSignal) {
    await markNotifications(api, ids, signal, (id) => setRead((old) => new Set([...old, id])), () => window.dispatchEvent(new Event("lathe-inbox-read")));
  }
  return <>
    <button ref={bell} type="button" className="workspace-bell" aria-haspopup="dialog" aria-expanded={open} aria-label={`การแจ้งเตือน${badge ? resource.data?.complete ? ` · ยังไม่อ่าน ${badge}` : " · ยังนับไม่ครบ" : ""}`} onClick={() => { setOpen(true); reload(); dialog.current?.showModal(); }}>
      <Icon name="bell" />{badge && <span aria-hidden="true">{badge}</span>}
    </button>
    <dialog ref={dialog} className="workspace-bell-dialog" aria-label="การแจ้งเตือน" onCancel={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      {open && <section>
        <header><h2>การแจ้งเตือน</h2>
          <button type="button" className="workspace-bell-text" disabled={action.busy || !resource.data?.complete || !unread.length} onClick={() => void action.run((signal) => mark(unread.map((item) => item.id), signal), "")}>อ่านทั้งหมด</button>
          <button type="button" className="workspace-bell-close" aria-label="ปิดการแจ้งเตือน" onClick={close}><Icon name="close" /></button>
        </header>
        {resource.loading && !resource.data && <p role="status" className="workspace-bell-note">กำลังโหลดการแจ้งเตือน…</p>}
        {resource.error && <p role="alert" className="workspace-bell-note">โหลดการแจ้งเตือนไม่สำเร็จ <button type="button" className="workspace-bell-text" onClick={reload}>ลองอีกครั้ง</button></p>}
        {action.error && <p role="alert" className="workspace-bell-note">ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จ กรุณาลองอีกครั้ง</p>}
        {resource.data && !items.length && <p className="workspace-bell-note">ยังไม่มีการแจ้งเตือน</p>}
        <ol>{items.slice(0, 8).map((item) => {
          const isRead = Boolean(item.read_at) || read.has(item.id); const notice = staffNotice(item.title);
          const href = staffNoticeHref(role === "Admin", item.request_id);
          return <li key={item.id} data-unread={isRead ? undefined : "true"}>
            <Link href={href} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void action.run(async (signal) => { if (!isRead) await mark([item.id], signal); }, "").then(() => { close(); router.push(href); }); }}>
              <strong>{notice.text}</strong>
              <span>{notice.reference ? `คำขอ #${notice.reference} · ` : ""}<time dateTime={item.created_at}>{now === null ? "" : relativeTH(item.created_at, now)}</time></span>
            </Link>
            {!isRead && <span className="workspace-bell-dot" aria-label="ยังไม่อ่าน" />}
          </li>;
        })}</ol>
        <Link className="workspace-bell-all" href={workspacePath(role, "inbox")} onClick={() => close()}>ดูการแจ้งเตือนทั้งหมด <Icon name="arrow" size={16} /></Link>
      </section>}
    </dialog>
  </>;
}
