"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi } from "../../lib/api/backend-api";
import { bahtTH, dateTH, dueDayCountdown, requestedDayCountdown } from "../../components/staff-ui/staff-format";
import { REQUEST_STATUS, statusOf, type Tone } from "../../components/staff-ui/staff-labels";
import { Button, EmptyState, LoadError, SearchForm, Skeleton, StatusTabs, Toast, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import layout from "../../components/staff-ui/staff-layout.module.css";
import { latestQuote } from "../customer/customer-domain";
import { useNow } from "../customer/customer-hooks";
import { RequestDetail } from "./request-detail";
import { useRequestIndex } from "./request-index";
import { REQUEST_STAGES, STAGE_LABELS, attentionStages, defaultStage, pendingEvidence, requestStage, stageCounts, stageOf, stageRows, unreadableRows, type RequestRecord, type RequestStage } from "./request-stage-domain";

// UC1–UC4: Staff estimate, send quotations and refuse requests; Staff and Admin
// review Deposit/PO evidence; Admin reads quotations (with internal costs) only.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMPTY: Record<RequestStage, [string, string]> = {
  quote: ["ไม่มีคำขอที่รอใบเสนอราคา", "คำขอใหม่จากลูกค้าจะเข้ามาที่นี่"],
  customer: ["ไม่มีใบเสนอราคาที่รอลูกค้าตอบ", "ใบเสนอราคาที่ส่งแล้วจะอยู่ที่นี่จนกว่าลูกค้าจะตอบ"],
  evidence: ["ไม่มีคำขอที่รอมัดจำ/PO", "เมื่อลูกค้าตอบรับราคา คำขอจะรอหลักฐานที่นี่"],
  review: ["ไม่มีหลักฐานรอตรวจ", "หลักฐานมัดจำ/PO ที่ลูกค้าส่งจะเข้ามาที่นี่"],
  opened: ["ยังไม่มีคำขอที่เปิดงานแล้ว", "เมื่ออนุมัติหลักฐานครบ ระบบจะเปิดงานผลิตให้"],
  closed: ["ยังไม่มีคำขอที่ปิดแล้ว", "คำขอที่เสร็จสิ้นหรือยกเลิกจะแสดงที่นี่"],
};

export function StaffRequests({ api, account }: { api: BackendApi; account: Account }) {
  return <Suspense fallback={<Skeleton label="กำลังเปิดคำขอ…" />}><RequestsWorkspace api={api} account={account} /></Suspense>;
}

function RequestsWorkspace({ api, account }: { api: BackendApi; account: Account }) {
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter(); const now = useNow();
  const raw = params.get("request") ?? ""; const selected = UUID.test(raw) ? raw : "";
  const q = params.get("q") ?? "";
  const index = useRequestIndex(api); const records = index.records;
  const { counts, unknown } = stageCounts(records ?? [], q);
  const linked = records?.find((record) => record.request.id === selected);
  const stage = requestStage(params.get("stage")) ?? defaultStage(counts, true, linked);
  const rows = stageRows(records ?? [], stage, q); const unreadable = unreadableRows(records ?? [], q);
  const attention = attentionStages(true);
  const [toast, setToast] = useState(""); const clearToast = () => setToast("");
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) if (value) next.set(key, value); else next.delete(key);
    const query = next.toString(); return query ? `${pathname}?${query}` : pathname;
  };
  const listLoading = !records && !index.error;
  const tabs = REQUEST_STAGES.map((key) => ({ key, label: STAGE_LABELS[key], count: counts[key], attention: attention.includes(key) }));
  return <section className={layout.page}>
    <div className={layout.toolbar}>
      <StatusTabs label="ขั้นตอนคำขอ" tabs={tabs} current={stage} href={(key) => href({ stage: key, request: undefined })} loading={listLoading} unavailable={Boolean(index.error && !records)} />
      <div className={layout.toolbarEnd}>
        <SearchForm label="ค้นหาคำขอ" placeholder="เลขคำขอหรือรายละเอียดงาน" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, request: undefined }), { scroll: false })} />
        <Button onClick={index.reload} disabled={index.loading}>อัปเดตข้อมูล</Button>
      </div>
    </div>
    {index.error && !records && <LoadError title="โหลดคำขอไม่สำเร็จ" onRetry={index.reload} />}
    {records && index.loading && <p className={layout.filterNote} role="status">กำลังตรวจสถานะคำขอ…</p>}
    <TruncatedNotice show={Boolean(records) && !index.loading && !index.complete} />
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, request: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
    <div className={layout.layout} data-detail={selected ? "open" : undefined}>
      <div className={layout.list} role="region" aria-label="รายการคำขอ">
        {listLoading && <Skeleton label="กำลังตรวจสถานะคำขอ…" />}
        {unknown > 0 && <p className={layout.warning}>ยังโหลดขั้นตอนล่าสุดไม่ได้ {unknown} คำขอ <Button variant="text" onClick={index.reload} disabled={index.loading}>ลองอีกครั้ง</Button></p>}
        {unreadable.map((record) => <RequestCard key={record.request.id} record={record} now={now} selected={selected === record.request.id} href={href({ request: record.request.id, stage })} />)}
        {rows.map((record) => <RequestCard key={record.request.id} record={record} now={now} selected={selected === record.request.id} href={href({ request: record.request.id, stage })} />)}
        {records && !rows.length && <EmptyState title={q ? "ไม่พบคำขอที่ค้นหา" : EMPTY[stage][0]}>{q ? "ลองค้นด้วยเลขคำขอหรือคำอื่น" : EMPTY[stage][1]}</EmptyState>}
      </div>
      <div className={layout.detail}>
        {selected ? <RequestDetail key={selected} api={api} account={account} id={selected} now={now} backHref={href({ request: undefined })} onChanged={(message) => { if (message) setToast(message); index.reload(); }} />
          : <div className={layout.placeholder}><EmptyState title="เลือกคำขอจากรายการ">เปิดคำขอเพื่อทำใบเสนอราคา หรือตรวจหลักฐานมัดจำ/PO</EmptyState></div>}
      </div>
    </div>
    <Toast message={toast} onDone={clearToast} />
  </section>;
}

// The card's own state inside its stage, and the next step for this role.
export function cardState(record: RequestRecord, stage: RequestStage | null, worker: boolean): { badge: string; tone: Tone; next: string; mine: boolean } {
  const quote = latestQuote(record.quotations);
  switch (stage) {
    case "quote": return quote?.status === "draft" ? { badge: "มีร่างใบเสนอราคา", tone: "action", next: worker ? "ตรวจและส่งใบเสนอราคา" : "ดูร่าง", mine: worker }
      : quote?.status === "rejected" ? { badge: "ลูกค้าปฏิเสธ · ทำฉบับใหม่", tone: "problem", next: worker ? "ทำใบเสนอราคาฉบับใหม่" : "ดูคำขอ", mine: worker }
      : { badge: "คำขอใหม่", tone: "action", next: worker ? "ทำใบเสนอราคา" : "ดูคำขอ", mine: worker };
    case "customer": return { badge: "รอลูกค้าตัดสินใจ", tone: "progress", next: "ดูใบเสนอราคา", mine: false };
    case "evidence": return { badge: "รอลูกค้าส่งหลักฐาน", tone: "waiting", next: "ดูเงื่อนไขมัดจำ/PO", mine: false };
    case "review": return { badge: `หลักฐานรอตรวจ ${pendingEvidence(record.fulfillment).length} รายการ`, tone: "action", next: "ตรวจหลักฐาน", mine: true };
    case "opened": return { badge: "เปิดงานผลิตแล้ว", tone: "done", next: "ดูงานที่เปิด", mine: false };
    case "closed": { const status = statusOf(REQUEST_STATUS, record.request.status); return { badge: status.label, tone: status.tone, next: "ดูรายละเอียด", mine: false }; }
    default: return { badge: "ตรวจสถานะไม่ได้", tone: "problem", next: "เปิดดูคำขอ", mine: false };
  }
}

function RequestCard({ record, now, selected, href }: { record: RequestRecord; now: number | null; selected: boolean; href: string }) {
  const { request, fulfillment } = record; const stage = stageOf(record); const state = cardState(record, stage, true);
  const quote = latestQuote(record.quotations);
  const deposit = stage === "evidence" || stage === "review";
  const countdown = deposit ? dueDayCountdown(fulfillment?.terms.documents_due_at, now) : stage === "closed" ? null : requestedDayCountdown(request.deadline, now);
  return <Link id={`request-card-${request.id}`} href={href} scroll={false} className={layout.card} aria-current={selected ? "true" : undefined}>
    <span className={layout.cardTop}><strong>คำขอ #{request.no_request}</strong><ToneBadge tone={state.tone}>{state.badge}</ToneBadge></span>
    <span className={layout.cardTitle}>{request.description}</span>
    <span className={layout.cardMeta}>{request.qty} ชิ้น · ส่งคำขอ {dateTH(request.created_at)}</span>
    {(stage === "customer" || (stage === "quote" && quote?.status === "draft")) && <span className={layout.cardMeta}>{stage === "customer" ? "ราคาเสนอ" : "ราคาในร่าง"} {bahtTH(quote?.final_price)}</span>}
    {deposit && fulfillment ? <span className={layout.cardMeta}>ส่งหลักฐานภายใน {dateTH(fulfillment.terms.documents_due_at)}{countdown && <ToneBadge tone={countdown.tone}>{countdown.text}</ToneBadge>}</span>
      : stage !== "closed" && stage !== null && <span className={layout.cardMeta}>{request.deadline ? <>ลูกค้าต้องการ {dateTH(request.deadline)}{countdown && <ToneBadge tone={countdown.tone}>{countdown.text}</ToneBadge>}</> : "ลูกค้าไม่ได้ระบุวันที่ต้องการ"}</span>}
    <span className={layout.cardNext} data-quiet={state.mine ? undefined : ""}>{state.next} <Icon name="arrow" size={14} /></span>
  </Link>;
}
