"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { BackendApi, Notification } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";
import { Button, EmptyState, ErrorText, LoadError, Skeleton, StatusTabs, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { dateTH, isBangkokToday, relativeTH } from "../customer/customer-domain";
import { useCollection, useNow } from "../customer/customer-hooks";
import { markNotifications } from "../customer/customer-notification-domain";
import { staffNotice, staffNoticeHref } from "../workspace/workspace-notifications";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inbox.module.css";

const PAGE = 20;

// การแจ้งเตือน (Staff/Admin): the "ดูทั้งหมด" page behind the bell. Same wording and
// links as the bell; opening an item marks it read, like the bell does.
export function Inbox({ api, admin }: { api: BackendApi; admin: boolean }) {
  const resource = useCollection<Notification>(api, "/notifications"); const reload = resource.reload;
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter();
  const tab = params.get("tab") === "unread" ? "unread" : "all";
  const [shown, setShown] = useState(PAGE); const [read, setRead] = useState<Set<string>>(new Set());
  const action = useCommand(); const now = useNow();
  useEffect(() => {
    window.addEventListener("lathe-inbox-read", reload);
    return () => window.removeEventListener("lathe-inbox-read", reload);
  }, [reload]);
  const all = resource.data?.items ?? [];
  const unread = all.filter((item) => !item.read_at && !read.has(item.id));
  const list = tab === "unread" ? unread : all; const items = list.slice(0, shown);
  async function mark(ids: string[], signal: AbortSignal) {
    await markNotifications(api, ids, signal, (id) => setRead((old) => new Set([...old, id])), () => window.dispatchEvent(new Event("lathe-inbox-read")));
  }
  const open = (href: string, isRead: boolean, id: string) => void action.run(async (signal) => { if (!isRead) await mark([id], signal); }, "").then(() => router.push(href));
  return <section className={layout.page}>
    <div className={layout.toolbar}>
      <StatusTabs label="กรองการแจ้งเตือน" tabs={[{ key: "all", label: "ทั้งหมด", count: all.length }, { key: "unread", label: "ยังไม่อ่าน", count: unread.length, attention: true }]} current={tab} href={(key) => key === "unread" ? `${pathname}?tab=unread` : pathname} loading={resource.loading && !resource.data} unavailable={Boolean(resource.error && !resource.data)} />
      <div className={layout.toolbarEnd}>
        <Button onClick={reload} disabled={resource.loading}>อัปเดตข้อมูล</Button>
        <Button variant="primary" disabled={action.busy || !resource.data?.complete || !unread.length} onClick={() => void action.run((signal) => mark(unread.map((item) => item.id), signal), "")}>อ่านทั้งหมด</Button>
      </div>
    </div>
    {resource.loading && !resource.data && <Skeleton label="กำลังโหลดการแจ้งเตือน…" />}
    {resource.error && !resource.data && <LoadError title="โหลดการแจ้งเตือนไม่สำเร็จ" onRetry={reload} />}
    <TruncatedNotice show={resource.data?.complete === false} />
    {action.error && <ErrorText error="ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จบางรายการ กดอัปเดตข้อมูลแล้วลองอีกครั้ง" />}
    {resource.data && !items.length && <EmptyState title={tab === "unread" ? "อ่านการแจ้งเตือนครบแล้ว" : "ยังไม่มีการแจ้งเตือน"}>เมื่อมีคำขอใหม่หรือความคืบหน้าของงาน จะแสดงที่นี่</EmptyState>}
    {now !== null && [true, false].map((today) => {
      const group = items.filter((item) => isBangkokToday(item.created_at, now) === today);
      return group.length > 0 && <section key={String(today)} className={styles.group} aria-label={today ? "วันนี้" : "ก่อนหน้านี้"}>
        <h2>{today ? "วันนี้" : "ก่อนหน้านี้"}</h2>
        <ul className={styles.notices}>{group.map((item) => {
          const isRead = Boolean(item.read_at) || read.has(item.id); const notice = staffNotice(item.title);
          const href = staffNoticeHref(admin, item.request_id);
          return <li key={item.id} data-unread={isRead ? undefined : "true"}>
            <Link href={href} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(href, isRead, item.id); }}>
              <strong>{notice.text}</strong>
              <small>{notice.reference ? `คำขอ #${notice.reference}` : "เปิดคำขอที่เกี่ยวข้อง"} · <time dateTime={item.created_at} title={dateTH(item.created_at)}>{relativeTH(item.created_at, now)}</time></small>
            </Link>
            {isRead ? <ToneBadge tone="quiet">อ่านแล้ว</ToneBadge> : <ToneBadge tone="action">ยังไม่อ่าน</ToneBadge>}
            {!isRead && <Button variant="text" disabled={action.busy} onClick={() => void action.run((signal) => mark([item.id], signal), "")}>ทำเป็นอ่านแล้ว<span className={layout.visuallyHidden}> {notice.text}</span></Button>}
          </li>;
        })}</ul>
      </section>;
    })}
    {list.length > shown && <div className={layout.actions}><Button onClick={() => setShown(shown + PAGE)}>โหลดเพิ่ม ({list.length - shown} รายการ)</Button></div>}
  </section>;
}
