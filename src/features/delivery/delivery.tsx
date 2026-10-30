"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
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
      <StatusTabs label="สถานะการส่งมอบ" tabs={deliveryTabs(admin).map((key) => ({ key, label: DELIVERY_STATE[key][0], count: counts[key], attention: ["terms", "invoice", "ship", "review"].includes(key) }))} current={tab} href={(key) => href({ tab: key, job: undefined })} loading={listLoading} unavailable={Boolean(jobs.error && !jobs.data)} />
      <div className={layout.toolbarEnd}>
        <SearchForm label="ค้นหางาน" placeholder="เลขใบแจ้งหนี้ เลขคำขอ หรือรายละเอียด" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, job: undefined }), { scroll: false })} />
        <Button onClick={() => { jobs.reload(); requests.reload(); }} disabled={jobs.loading}>อัปเดตข้อมูล</Button>
      </div>
    </div>
    {jobs.error && !jobs.data && <LoadError title="โหลดรายการงานไม่สำเร็จ" onRetry={jobs.reload} />}
    <TruncatedNotice show={jobs.data?.complete === false} />
    {requests.error && <p className={layout.warning}>โหลดชื่อคำขอไม่ครบ บางงานจะแสดงเป็น “คำขอผลิต”</p>}
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, job: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
    <div className={layout.layout} data-detail={selected ? "open" : undefined}>
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
    <Toast message={toast} onDone={clearToast} />
  </section>;
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

function DeliveryCard({ job, label, tab, admin, selected, href }: { job: FulfillmentJob; label: string; tab: DeliveryTab; admin: boolean; selected: boolean; href: string }) {
  const [next, act] = nextStep(tab, job, admin); const last = job.deliveries?.at(-1);
  return <Link href={href} scroll={false} className={layout.card} aria-current={selected ? "true" : undefined}>
    <span className={layout.cardTop}><strong>{job.invoice?.number ?? "ยังไม่มีใบแจ้งหนี้"}</strong><StatusBadge map={DELIVERY_STATE} value={tab} /></span>
    <span className={layout.cardTitle}>{label}</span>
    <span className={layout.cardMeta}>{job.invoice ? `คงเหลือ ${bahtTH(job.invoice.balance)} · ครบกำหนด ${dateTH(job.invoice.due_at)}` : `ยอดที่จะออกใบแจ้งหนี้ ${bahtTH(job.opening_balance)}`}</span>
    {(job.cycle > 1 || last?.status === "returned" || (admin && hasPendingPayment(job))) && <span className={layout.cardMeta}>
      {job.cycle > 1 && <ToneBadge tone="progress">แก้ไขรอบ {job.cycle}</ToneBadge>}
      {last?.status === "returned" && <ToneBadge tone="problem">ลูกค้าส่งคืน</ToneBadge>}
      {admin && hasPendingPayment(job) && <ToneBadge tone="action">มีหลักฐานรอตรวจ</ToneBadge>}
    </span>}
    <span className={layout.cardNext} data-quiet={act ? undefined : ""}>{next} <Icon name="arrow" size={14} /></span>
  </Link>;
}
