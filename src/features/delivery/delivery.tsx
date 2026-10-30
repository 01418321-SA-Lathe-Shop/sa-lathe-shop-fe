"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi, JobRequest } from "../../lib/api/backend-api";
import { bahtTH, dateTH } from "../../components/staff-ui/staff-format";
import { DELIVERY_STATE } from "../../components/staff-ui/staff-labels";
import { Button, EmptyState, LoadError, SearchForm, Skeleton, StatusBadge, StatusTabs, Toast, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { defaultDeliveryTab, deliveryCounts, deliveryTab, deliveryTabs, hasPendingPayment, inDeliveryTab, matchDelivery, type DeliveryTab, type FulfillmentJob } from "./delivery-domain";
import { DeliveryDetail } from "./delivery-detail";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./delivery.module.css";

const EMPTY: Record<DeliveryTab, [string, string]> = {
  terms: ["ไม่มีงานที่รอตั้งเครดิต", "งานที่ผลิตเสร็จและยังไม่ได้ตั้งเครดิตจะอยู่ที่นี่"],
  invoice: ["ไม่มีงานที่รอออกใบแจ้งหนี้", "งานที่ผลิตเสร็จและตั้งเครดิตแล้วจะอยู่ที่นี่"],
  ship: ["ไม่มีงานที่พร้อมส่ง", "งานที่ออกใบแจ้งหนี้แล้วและยังไม่ได้ส่ง หรือลูกค้าส่งคืนแล้วแก้เสร็จ จะอยู่ที่นี่"],
  inspect: ["ไม่มีงานที่รอลูกค้าตรวจรับ", "งานที่บันทึกส่งมอบแล้วจะรอลูกค้าตรวจรับที่นี่"],
  review: ["ไม่มีหลักฐานการชำระที่รอตรวจ", "หลักฐานการโอนที่ลูกค้าส่งมาจะอยู่ที่นี่"],
  unpaid: ["ไม่มียอดค้างชำระ", "ใบแจ้งหนี้ที่ยังชำระไม่ครบจะอยู่ที่นี่"],
  closed: ["ยังไม่มีงานที่ปิดแล้ว", "งานจะปิดเมื่อลูกค้ารับงานและชำระครบ"],
};

// UC9 ส่งมอบและใบแจ้งหนี้ (Staff) / ส่งมอบและรับชำระ (Admin). The list returns
// full fulfillment documents (payments only for Admin), so tabs need no extra reads.
export function LiveDelivery({ api, account }: { api: BackendApi; account: Account }) {
  return <Suspense fallback={<Skeleton label="กำลังเปิดส่งมอบ…" />}><DeliveryWorkspace api={api} admin={account.role === "admin"} /></Suspense>;
}

function DeliveryWorkspace({ api, admin }: { api: BackendApi; admin: boolean }) {
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter();
  const cardView = params.get("layout") !== "list" && params.get("view") !== "list";
  const q = params.get("q") ?? ""; const selected = params.get("job") ?? "";
  const jobs = useCollection<FulfillmentJob>(api, "/fulfillment/jobs");
  const requests = useCollection<JobRequest>(api, "/requests");
  const lookup = new Map((requests.data?.items ?? []).map((request) => [request.id, request]));
  const label = (job: FulfillmentJob) => { const request = lookup.get(job.request_id); return request ? `คำขอ #${request.no_request} · ${request.description}` : requests.loading ? "กำลังโหลดคำขอ…" : "คำขอผลิต"; };
  const items = jobs.data?.items ?? []; const matched = items.filter((job) => matchDelivery(job, label(job), q));
  const counts = deliveryCounts(matched, admin); const tab = deliveryTab(params.get("tab"), admin) ?? defaultDeliveryTab(counts, admin);
  const rows = matched.filter((job) => inDeliveryTab(tab, job, admin));
  const [toast, setToast] = useState(""); const clearToast = () => setToast("");
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) if (value) next.set(key, value); else next.delete(key);
    const query = next.toString(); return query ? `${pathname}?${query}` : pathname;
  };
  const saved = (message: string) => { if (message) setToast(message); jobs.reload(); };
  const listLoading = jobs.loading && !jobs.data;
  const job = items.find((item) => item.job_id === selected);
  return <section className={layout.page}>
    <div className={layout.toolbar}>
      <div className={styles.toolbarHead}>
        <StatusTabs label="สถานะการส่งมอบ" tabs={deliveryTabs(admin).map((key) => ({ key, label: DELIVERY_STATE[key][0], count: counts[key], attention: ["terms", "invoice", "ship", "review"].includes(key) }))} current={tab} href={(key) => href({ tab: key, job: undefined })} loading={listLoading} unavailable={Boolean(jobs.error && !jobs.data)} />
        <nav className={styles.viewSwitch} aria-label="รูปแบบการแสดงงานส่งมอบ">
          <Link href={href({ layout: undefined, job: undefined })} scroll={false} aria-current={cardView ? "page" : undefined}><Icon name="grid" size={17} /> การ์ด</Link>
          <Link href={href({ layout: "list", job: undefined })} scroll={false} aria-current={!cardView ? "page" : undefined}><Icon name="file" size={17} /> รายการ</Link>
        </nav>
      </div>
      <div className={layout.toolbarEnd}>
        <SearchForm label="ค้นหางาน" placeholder="เลขใบแจ้งหนี้ เลขคำขอ หรือรายละเอียด" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, job: undefined }), { scroll: false })} />
        <Button onClick={() => { jobs.reload(); requests.reload(); }} disabled={jobs.loading}>อัปเดตข้อมูล</Button>
      </div>
    </div>
    {jobs.error && !jobs.data && <LoadError title="โหลดรายการงานไม่สำเร็จ" onRetry={jobs.reload} />}
    <TruncatedNotice show={jobs.data?.complete === false} />
    {requests.error && <p className={layout.warning}>โหลดชื่อคำขอไม่ครบ บางงานจะแสดงเป็น “คำขอผลิต”</p>}
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, job: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
    {cardView ? (
      <div className={styles.cardWorkspace}>
        <div className={styles.cardGrid} role="region" aria-label="งานส่งมอบแบบการ์ด">
          {listLoading && <Skeleton label="กำลังโหลดรายการงาน…" />}
          {rows.map((item) => <DeliveryCard key={item.job_id} job={item} label={label(item)} tab={tab} admin={admin} selected={item.job_id === selected} href={href({ job: item.job_id, tab })} grid />)}
          {jobs.data && !rows.length && <EmptyState title={q ? "ไม่พบงานที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบแจ้งหนี้หรือเลขคำขออื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
      </div>
    ) : selected ? (
      <div className={`${layout.layout} ${styles.splitLayout}`} data-detail="open">
        <div className={layout.list} role="region" aria-label="รายการงานส่งมอบ">
          {listLoading && <Skeleton label="กำลังโหลดรายการงาน…" />}
          {rows.map((item) => <DeliveryCard key={item.job_id} job={item} label={label(item)} tab={tab} admin={admin} selected={item.job_id === selected} href={href({ job: item.job_id, tab })} />)}
          {jobs.data && !rows.length && <EmptyState title={q ? "ไม่พบงานที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบแจ้งหนี้หรือเลขคำขออื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
        <div className={layout.detail}>
          {selected ? <DeliveryDetail key={selected} api={api} admin={admin} id={selected} label={job ? label(job) : "งานส่งมอบ"} backHref={href({ job: undefined })} onChanged={saved} />
            : <div className={layout.placeholder}><EmptyState title="เลือกงานจากรายการ">เปิดงานเพื่อออกใบแจ้งหนี้ บันทึกส่งมอบ{admin ? " หรือตรวจการชำระ" : ""}</EmptyState></div>}
        </div>
      </div>
    ) : (
      <div className={styles.fullListWorkspace}>
        <div className={styles.fullList} role="region" aria-label="รายการงานส่งมอบ">
          {listLoading && <Skeleton label="กำลังโหลดรายการงาน…" />}
          {rows.map((item) => <DeliveryCard key={item.job_id} job={item} label={label(item)} tab={tab} admin={admin} selected={false} href={href({ job: item.job_id, tab })} row />)}
          {jobs.data && !rows.length && <EmptyState title={q ? "ไม่พบงานที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบแจ้งหนี้หรือเลขคำขออื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
      </div>
    )}
    {cardView && selected && <DeliveryModal closeHref={href({ job: undefined })} returnFocusId={`delivery-card-${selected}`} onClose={() => router.replace(href({ job: undefined }), { scroll: false })}>
      <DeliveryDetail key={selected} api={api} admin={admin} id={selected} label={job ? label(job) : "งานส่งมอบ"} backHref={href({ job: undefined })} onChanged={saved} />
    </DeliveryModal>}
    <Toast message={toast} onDone={clearToast} />
  </section>;
}

function DeliveryModal({ closeHref, returnFocusId, onClose, children }: { closeHref: string; returnFocusId: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current; if (node && !node.open) node.showModal();
    return () => document.getElementById(returnFocusId)?.focus();
  }, [returnFocusId]);
  return <dialog ref={dialog} className={styles.deliveryModal} aria-label="รายละเอียดการส่งมอบ" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.modalFrame}>
      <div className={styles.modalToolbar}><span>รายละเอียดการส่งมอบ</span><Link href={closeHref} scroll={false} aria-label="ปิดรายละเอียดการส่งมอบ"><Icon name="close" size={20} /></Link></div>
      <div className={styles.modalBody}>{children}</div>
    </div>
  </dialog>;
}

function nextStep(tab: DeliveryTab, job: FulfillmentJob, admin: boolean): [string, boolean] {
  switch (tab) {
    case "terms": return ["ตั้งเครดิต", true];
    case "invoice": return !admin && job.credit_days === undefined ? ["รอแอดมินตั้งเครดิต", false] : ["ออกใบแจ้งหนี้", true];
    case "ship": return ["บันทึกส่งมอบ", true];
    case "inspect": return ["รอลูกค้าตรวจรับ", false];
    case "review": return ["ตรวจหลักฐานการชำระ", true];
    case "unpaid": return [admin ? "ดูยอดค้าง / รับเงินสด" : "ดูยอดค้าง", false];
    case "closed": return ["ดูรายละเอียด", false];
  }
}

function DeliveryCard({ job, label, tab, admin, selected, href, grid = false, row = false }: { job: FulfillmentJob; label: string; tab: DeliveryTab; admin: boolean; selected: boolean; href: string; grid?: boolean; row?: boolean }) {
  const [next, act] = nextStep(tab, job, admin); const last = job.deliveries?.at(-1);

  if (grid) {
    return <Link id={`delivery-card-${job.job_id}`} href={href} scroll={false} className={styles.gridCard} aria-current={selected ? "true" : undefined}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.metaLabel}>ใบแจ้งหนี้</span>
          <strong>#{job.invoice?.number ?? "ยังไม่ออกเลข"}</strong>
        </div>
      </div>
      <h3 className={styles.cardTitle}>{label}</h3>
      <div className={styles.cardStatus}>
        <StatusBadge map={DELIVERY_STATE} value={tab} />
      </div>
      <dl className={styles.essentials}>
        <div>
          <dt>ยอดเงิน</dt>
          <dd>{job.invoice ? bahtTH(job.invoice.balance) : bahtTH(job.opening_balance)}</dd>
        </div>
        <div>
          <dt><Icon name="clock" size={14} /> {job.invoice ? "ครบกำหนด" : "กำหนดชำระ"}</dt>
          <dd>{job.invoice ? dateTH(job.invoice.due_at) : "ยังไม่ออกใบแจ้งหนี้"}</dd>
        </div>
      </dl>
      <div className={styles.cardStep}>
        {(job.cycle > 1 || last?.status === "returned" || (admin && hasPendingPayment(job))) && <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {job.cycle > 1 && <ToneBadge tone="progress">แก้ไขรอบ {job.cycle}</ToneBadge>}
          {last?.status === "returned" && <ToneBadge tone="problem">ลูกค้าส่งคืน</ToneBadge>}
          {admin && hasPendingPayment(job) && <ToneBadge tone="action">มีหลักฐานรอตรวจ</ToneBadge>}
        </div>}
      </div>
      <footer className={styles.cardFooter}>
        <span className={styles.openHint}>{next} <Icon name="arrow" size={14} /></span>
      </footer>
    </Link>;
  }

  return <Link id={`delivery-card-${job.job_id}`} href={href} scroll={false} className={`${layout.card} ${row ? styles.rowCard : ""}`} aria-current={selected ? "true" : undefined}>
    <div className={row ? styles.rowMain : undefined}>
      <span className={layout.cardTop}><strong>{job.invoice?.number ?? "ยังไม่มีใบแจ้งหนี้"}</strong>{!row && <StatusBadge map={DELIVERY_STATE} value={tab} />}</span>
      <span className={layout.cardTitle}>{label}</span>
      <span className={layout.cardMeta}>{job.invoice ? `คงเหลือ ${bahtTH(job.invoice.balance)} · ครบกำหนด ${dateTH(job.invoice.due_at)}` : `ยอดที่จะออกใบแจ้งหนี้ ${bahtTH(job.opening_balance)}`}</span>
    </div>
    {row && <div className={styles.rowStatus}>
      <StatusBadge map={DELIVERY_STATE} value={tab} />
      {(job.cycle > 1 || last?.status === "returned" || (admin && hasPendingPayment(job))) && <>
        {job.cycle > 1 && <ToneBadge tone="progress">แก้ไขรอบ {job.cycle}</ToneBadge>}
        {last?.status === "returned" && <ToneBadge tone="problem">ลูกค้าส่งคืน</ToneBadge>}
        {admin && hasPendingPayment(job) && <ToneBadge tone="action">มีหลักฐานรอตรวจ</ToneBadge>}
      </>}
    </div>}
    <div className={row ? styles.rowMeta : undefined}>
      {!row && (job.cycle > 1 || last?.status === "returned" || (admin && hasPendingPayment(job))) && <span className={layout.cardMeta}>
        {job.cycle > 1 && <ToneBadge tone="progress">แก้ไขรอบ {job.cycle}</ToneBadge>}
        {last?.status === "returned" && <ToneBadge tone="problem">ลูกค้าส่งคืน</ToneBadge>}
        {admin && hasPendingPayment(job) && <ToneBadge tone="action">มีหลักฐานรอตรวจ</ToneBadge>}
      </span>}
    </div>
    {row && <span className={layout.cardNext} data-quiet={act ? undefined : ""}>{next} <Icon name="arrow" size={14} /></span>}
  </Link>;
}
