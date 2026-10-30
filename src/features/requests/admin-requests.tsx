"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Icon } from "../../components/appearance/icons";
import { bahtTH, dateTH } from "../../components/staff-ui/staff-format";
import { EmptyState, LoadError, Skeleton, Toast, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import layout from "../../components/staff-ui/staff-layout.module.css";
import type { Account, BackendApi } from "../../lib/api/backend-api";
import { latestQuote } from "../customer/customer-domain";
import docs from "../customer/customer-documents.module.css";
import { useNow } from "../customer/customer-hooks";
import { LocalPages } from "../customer/customer-ui";
import { RequestDetail } from "./request-detail";
import { useRequestIndex } from "./request-index";
import { REQUEST_STAGES, STAGE_LABELS, listStages, requestStage, stageCounts, stageOf, stageRows, unreadableRows, type RequestRecord } from "./request-stage-domain";
import { cardState, UUID } from "./staff-requests";
import styles from "./requests.module.css";

const PAGE = 20;

// Same list structure as the Customer quotation page (lead cards, then one panel
// with tabs, search and table), holding Admin's review work rather than the customer's.
export function AdminRequests({ api, account }: { api: BackendApi; account: Account }) {
  return <Suspense fallback={<Skeleton label="กำลังเปิดคำขอ…" />}><RequestsList api={api} account={account} /></Suspense>;
}

function RequestsList({ api, account }: { api: BackendApi; account: Account }) {
  const params = useSearchParams(); const router = useRouter(); const now = useNow();
  const index = useRequestIndex(api); const records = index.records;
  const [toast, setToast] = useState("");
  const raw = params.get("request") ?? ""; const selected = UUID.test(raw) ? raw : "";
  const q = params.get("q") ?? ""; const stage = requestStage(params.get("stage"));
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) if (value) next.set(key, value); else next.delete(key);
    const query = next.toString(); return query ? `/admin/requests?${query}` : "/admin/requests";
  };
  if (selected) return <div className={layout.fullPage}>
    <RequestDetail key={selected} api={api} account={account} id={selected} now={now} backHref={href({ request: undefined })} onChanged={(message) => { if (message) setToast(message); index.reload(); }} />
    <Toast message={toast} onDone={() => setToast("")} />
  </div>;

  const { counts, unknown } = stageCounts(records ?? [], q);
  const total = REQUEST_STAGES.reduce((sum, key) => sum + counts[key], unknown);
  const review = stage ? [] : stageRows(records ?? [], "review", q);
  const rows = stage ? stageRows(records ?? [], stage, q) : [...unreadableRows(records ?? [], q), ...listStages.flatMap((key) => stageRows(records ?? [], key, q))];
  const page = Math.min(Number(params.get("page") ?? 1) - 1 || 0, Math.max(0, Math.ceil(rows.length / PAGE) - 1));
  const loading = !records && !index.error; const unavailable = Boolean(index.error && !records);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.replace(href({ q: String(new FormData(event.currentTarget).get("q") ?? "").trim() || undefined, page: undefined }), { scroll: false });
  }
  return <section className={`${docs.scope} ${styles.adminScope}`}>
    {unavailable && <LoadError title="โหลดคำขอไม่สำเร็จ" onRetry={index.reload} />}
    <TruncatedNotice show={Boolean(records) && !index.loading && !index.complete} />
    {!stage && !unavailable && <section className={docs.openSection} aria-labelledby="review-requests">
      <h2 id="review-requests">รอคุณตรวจ {!loading && <span className={docs.openCount}>{review.length}</span>}</h2>
      {loading ? <div className={docs.cards} role="status" aria-label="กำลังโหลดคำขอ">{[0, 1].map((key) => <div key={key} className={docs.skeletonCard} aria-hidden="true" />)}</div>
        : review.length ? <div className={docs.cards}>{review.map((record) => <ReviewCard key={record.request.id} record={record} href={href({ request: record.request.id })} />)}</div>
        : <p className={docs.caughtUp}><span aria-hidden="true">✓</span> ไม่มีหลักฐานมัดจำ/PO ที่รอตรวจ</p>}
    </section>}
    <section className={docs.panel} aria-label="รายการคำขอ">
      <div className={docs.panelBar}>
        <nav className={docs.tabs} aria-label="กรองขั้นตอนคำขอ">
          <Link href={href({ stage: undefined, page: undefined })} scroll={false} aria-current={!stage ? "page" : undefined}><span>ทั้งหมด</span><span className={docs.count}>{loading ? "…" : unavailable ? "—" : total}</span></Link>
          {REQUEST_STAGES.map((key) => <Link key={key} href={href({ stage: key, page: undefined })} scroll={false} aria-current={stage === key ? "page" : undefined}><span>{STAGE_LABELS[key]}</span><span className={docs.count}>{loading ? "…" : unavailable ? "—" : counts[key]}</span></Link>)}
        </nav>
        <form key={q} className={docs.filters} onSubmit={search}>
          <label className={docs.search}><Icon name="search" size={16} /><input type="search" name="q" aria-label="ค้นหาคำขอ" defaultValue={q} placeholder="เลขคำขอหรือรายละเอียดงาน" /></label>
          <button type="button" className={docs.outline} onClick={index.reload} disabled={index.loading}>อัปเดตข้อมูล</button>
        </form>
      </div>
      {unknown > 0 && <p className={docs.panelNote}>ยังโหลดขั้นตอนล่าสุดไม่ได้ {unknown} คำขอ</p>}
      {loading ? <div className={docs.skeletons} role="status" aria-label="กำลังโหลดรายการคำขอ">{[0, 1, 2].map((key) => <div key={key} className={docs.skeleton} aria-hidden="true" />)}</div>
        : rows.length > 0 && <table className={docs.table}>
          <thead><tr><th scope="col">คำขอ</th><th scope="col">งาน</th><th scope="col">ส่งคำขอเมื่อ</th><th scope="col" data-numeric>ราคาล่าสุด</th><th scope="col">สถานะ</th><th scope="col">ขั้นถัดไป</th><th scope="col" className={docs.openCell} aria-label="เปิด" /></tr></thead>
          <tbody>{rows.slice(page * PAGE, page * PAGE + PAGE).map((record) => <RequestRow key={record.request.id} record={record} href={href({ request: record.request.id })} />)}</tbody>
        </table>}
      {records && !rows.length && <EmptyState title={q ? "ไม่พบคำขอที่ค้นหา" : "ไม่มีคำขอในขั้นตอนนี้"}>{q ? "ลองค้นด้วยเลขคำขอหรือคำอื่น" : "คำขอจะแสดงที่นี่เมื่อถึงขั้นตอนนี้"}</EmptyState>}
      <LocalPages count={rows.length} page={page} setPage={(next) => router.replace(href({ page: String(next + 1) }), { scroll: false })} />
      {!loading && rows.length > 0 && <p className={docs.footer} role="status">แสดง {Math.min(rows.length - page * PAGE, PAGE)} จาก {rows.length} รายการที่โหลดสำเร็จ</p>}
    </section>
    <Toast message={toast} onDone={() => setToast("")} />
  </section>;
}

function ReviewCard({ record, href }: { record: RequestRecord; href: string }) {
  const { request, fulfillment } = record; const state = cardState(record, "review", false);
  return <article className={docs.card}>
    <div className={docs.cardTop}><span>คำขอ #{request.no_request}</span><ToneBadge tone={state.tone}>{state.badge}</ToneBadge></div>
    <div><h3>{request.description}</h3><small>จำนวน {request.qty} ชิ้น</small></div>
    <div className={docs.cardPrice}><strong>{bahtTH(fulfillment?.terms.final_price)}</strong><span>ส่งหลักฐานภายใน {dateTH(fulfillment?.terms.documents_due_at)}</span></div>
    <Link className={styles.adminPrimary} href={href}>{state.next}</Link>
  </article>;
}

function RequestRow({ record, href }: { record: RequestRecord; href: string }) {
  const { request } = record; const state = cardState(record, stageOf(record), false); const quote = latestQuote(record.quotations);
  return <tr>
    <td data-label="คำขอ"><Link className={docs.rowTitle} href={href}>#{request.no_request}</Link><small>{request.qty} ชิ้น</small></td>
    <td data-label="งาน"><strong className={docs.workName}>{request.description}</strong></td>
    <td data-label="ส่งคำขอเมื่อ"><time dateTime={request.created_at}>{dateTH(request.created_at)}</time></td>
    <td data-label="ราคาล่าสุด" data-numeric>{quote ? bahtTH(quote.final_price) : "—"}</td>
    <td data-label="สถานะ"><ToneBadge tone={state.tone}>{state.badge}</ToneBadge></td>
    <td data-label="ขั้นถัดไป"><span className={state.mine ? docs.warn : docs.quiet}>{state.next}</span></td>
    <td className={docs.openCell} aria-hidden="true"><Icon name="arrow" size={16} /></td>
  </tr>;
}
