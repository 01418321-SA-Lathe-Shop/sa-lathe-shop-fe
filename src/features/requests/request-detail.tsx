"use client";

import Link from "next/link";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi, Decision, JobRequest, Quotation } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { bahtTH, dateTH, dateTimeTH, requestedDayCountdown } from "../../components/staff-ui/staff-format";
import { QUOTE_STATUS, REQUEST_STATUS } from "../../components/staff-ui/staff-labels";
import { Button, Collapsible, LoadError, NextAction, Skeleton, StatusBadge, Steps, ToneBadge } from "../../components/staff-ui/staff-ui";
import layout from "../../components/staff-ui/staff-layout.module.css";
import { latestQuote } from "../customer/customer-domain";
import { useCollection } from "../customer/customer-hooks";
import { QuotationPrint } from "../documents/document-parties";
import { AcceptedStage } from "./request-evidence";
import { RequestFiles } from "./request-files";
import { QuoteForm, QuoteSummary, RefuseRequest, RequestMoreInfo } from "./request-quote";
import { CANCELLING_REJECTION, REQUEST_STEPS, isClosed, rejectionCount } from "./request-stage-domain";

const SOURCE_LABELS: Record<string, string> = { net: "เว็บไซต์ (net)", phone: "โทรศัพท์ (phone)", line: "LINE (line)" };

export function RequestDetail({ api, account, id, now, backHref, onChanged }: { api: BackendApi; account: Account; id: string; now: number | null; backHref: string; onChanged: (message: string) => void }) {
  const request = useResource<JobRequest>(api, `/requests/${id}`);
  const quotes = useCollection<Quotation>(api, `/requests/${id}/quotations`);
  const decisions = useCollection<Decision>(api, `/requests/${id}/quotation-decisions`);
  const worker = account.role === "worker"; const root = worker ? "/staff" : "/admin";
  const data = request.data; const latest = quotes.data ? latestQuote(quotes.data.items) : undefined;
  const rejections = rejectionCount(decisions.data?.items ?? []);
  const countdown = data && !isClosed(data) ? requestedDayCountdown(data.deadline, now) : null;
  function saved(message: string) { request.reload(); quotes.reload(); decisions.reload(); onChanged(message); }
  return <article className={layout.detailCard} aria-labelledby={`request-${id}`}>
    <Link className={layout.back} href={backHref} scroll={false}><Icon name="arrow" size={16} /> กลับรายการ</Link>
    {request.loading && !data && <Skeleton label="กำลังโหลดคำขอ…" rows={3} />}
    {request.error && <LoadError title="โหลดคำขอไม่สำเร็จ" onRetry={request.reload} />}
    {data && <>
      <header className={layout.detailHeader}>
        <div><h2 id={`request-${id}`}>คำขอ #{data.no_request} · {data.description}</h2>
          <p className={layout.meta}><span>{data.qty} ชิ้น</span><span>ส่งคำขอ {dateTimeTH(data.created_at)}</span>{data.deadline ? <span>ลูกค้าต้องการ {dateTH(data.deadline)} <small>(ไม่ใช่กำหนดส่งที่ร้านยืนยัน)</small></span> : <span>ลูกค้าไม่ได้ระบุวันที่ต้องการ</span>}{countdown && <ToneBadge tone={countdown.tone}>{countdown.text}</ToneBadge>}</p></div>
        <StatusBadge map={REQUEST_STATUS} value={data.status} />
      </header>
      <dl className={layout.facts}>
        <div><dt>วัสดุที่ลูกค้าระบุ</dt><dd>{data.material_spec || "ไม่ได้ระบุ"}</dd></div>
        <div><dt>จำนวน</dt><dd>{data.qty} ชิ้น</dd></div>
        {data.source && <div><dt>ช่องทางคำขอ</dt><dd>{SOURCE_LABELS[data.source] ?? data.source}</dd></div>}
        {rejections > 0 && <div><dt>ลูกค้าปฏิเสธใบเสนอราคา</dt><dd>{rejections} ครั้ง{data.status !== "canceled" && rejections < CANCELLING_REJECTION ? ` · ครั้งที่ ${CANCELLING_REJECTION} จะยกเลิกคำขอ` : ""}</dd></div>}
      </dl>
      {latest && latest.status !== "draft" && <div className={layout.actions}><QuotationPrint api={api} request={data} quote={latest} terms={decisions.data?.items.find((item) => item.quotation_id === latest.id && item.outcome === "accept")?.terms} ready={Boolean(decisions.data?.complete && !decisions.loading && !decisions.error)} label="พิมพ์ใบเสนอราคา / บันทึกเป็น PDF" hint={decisions.error ? "โหลดประวัติการตอบรับไม่สำเร็จ" : "กำลังโหลดเงื่อนไขที่บันทึก…"} button={(props) => <Button {...props} />} /></div>}
      <RequestFiles api={api} id={id} />
      {quotes.error && !quotes.data && <LoadError title="โหลดใบเสนอราคาไม่สำเร็จ" onRetry={quotes.reload} />}
      {quotes.loading && !quotes.data && <Skeleton label="กำลังโหลดใบเสนอราคา…" rows={2} />}
      {quotes.data && (isClosed(data) ? <ClosedStep api={api} request={data} worker={worker} root={root} />
        : latest?.status === "approved" ? <AcceptedStage key={`${latest.id}:${String(latest.lock_version)}`} api={api} account={account} quote={latest} now={now} root={root} onSaved={saved} />
        : latest?.status === "sent" ? <><Steps steps={REQUEST_STEPS} current={1} /><NextAction title="รอลูกค้าตัดสินใจ"><p className={layout.muted}>ลูกค้าเห็นใบเสนอราคานี้ในระบบแล้ว ถ้าลูกค้าปฏิเสธ คำขอจะกลับมาที่ “ต้องทำใบเสนอราคา”</p><QuoteSummary quote={latest} /></NextAction>
          {worker && (data.status === "pending" || data.status === "ongoing") && <RefuseRequest api={api} id={id} onSaved={saved} />}</>
        : <><Steps steps={REQUEST_STEPS} current={0} />{worker && !quotes.loading
          ? <QuoteForm key={latest?.status === "draft" ? `${latest.id}:${String(latest.lock_version)}` : "new"} api={api} request={data} draft={latest?.status === "draft" ? latest : undefined} revision={latest?.status === "rejected" || (latest?.status === "draft" && Number(latest.version) > 1)} onSaved={saved} />
          : !worker && <NextAction title="รอพนักงานทำใบเสนอราคา"><p className={layout.muted}>Admin ดูราคาและต้นทุนได้อย่างเดียว พนักงานเป็นผู้ประเมินและส่งใบเสนอราคา</p>{latest?.status === "draft" && <QuoteSummary quote={latest} />}</NextAction>}
          {worker && (data.status === "pending" || data.status === "ongoing") && <>
            <RequestMoreInfo api={api} id={id} pending={data.info_requested_at ? data.info_request_note : undefined} onSaved={saved} />
            <RefuseRequest api={api} id={id} onSaved={saved} />
          </>}</>)}
      <Collapsible title="ประวัติใบเสนอราคาและการตัดสินใจของลูกค้า"><QuoteHistory quotes={quotes.data?.items ?? []} decisions={decisions.data?.items ?? []} loading={decisions.loading && !decisions.data} failed={Boolean(decisions.error)} /></Collapsible>
      <Collapsible title="ประวัติระบบ"><p className={layout.code}>คำขอ {data.id} · ลูกค้า {data.customer_id}</p>{quotes.data?.items.map((quote) => <p key={quote.id} className={layout.code}>ใบเสนอราคา {quote.id} · ฉบับที่ {String(quote.version)} · lock {String(quote.lock_version)}</p>)}</Collapsible>
    </>}
  </article>;
}

function ClosedStep({ api, request, worker, root }: { api: BackendApi; request: JobRequest; worker: boolean; root: string }) {
  if (request.status === "completed") return <NextAction title="คำขอนี้เสร็จสิ้นแล้ว"><p className={layout.muted}>ลูกค้ารับงานและชำระครบแล้ว ดูใบแจ้งหนี้และการส่งมอบได้ที่หน้าส่งมอบ</p><Link className={layout.linkButton} href={`${root}/delivery-payment`}>ไปที่ส่งมอบและรับชำระ <Icon name="arrow" size={16} /></Link></NextAction>;
  return <NextAction title="คำขอนี้ถูกยกเลิก">{worker ? <Refusal api={api} id={request.id} /> : <p className={layout.muted}>ดูสาเหตุได้ที่ประวัติการตัดสินใจของลูกค้าด้านล่าง หรือสอบถามพนักงานที่ปฏิเสธคำขอ</p>}</NextAction>;
}

// The refusal endpoint is Worker/Customer only; a request canceled by six
// Customer rejections has no refusal record.
function Refusal({ api, id }: { api: BackendApi; id: string }) {
  const refusal = useResource<{ reason: string }>(api, `/requests/${id}/rejection`);
  if (refusal.data) return <p className={layout.muted}>ร้านปฏิเสธคำขอ: {refusal.data.reason}</p>;
  return <p className={layout.muted}>{refusal.loading ? "กำลังโหลดเหตุผล…" : "ไม่พบเหตุผลที่ร้านปฏิเสธ คำขออาจถูกยกเลิกจากการที่ลูกค้าปฏิเสธใบเสนอราคาครบ 6 ครั้ง หรือส่งมัดจำ/PO ไม่ทันกำหนด"}</p>;
}

function QuoteHistory({ quotes, decisions, loading, failed }: { quotes: Quotation[]; decisions: Decision[]; loading: boolean; failed: boolean }) {
  const ordered = [...quotes].sort((a, b) => BigInt(b.version) > BigInt(a.version) ? 1 : BigInt(b.version) < BigInt(a.version) ? -1 : 0);
  return <>
    <section className={layout.historyBlock}><h4>ใบเสนอราคา</h4>{!ordered.length ? <p className={layout.muted}>ยังไม่มีใบเสนอราคา</p> : <ul className={layout.timeline}>{ordered.map((quote) => <li key={quote.id}>
      <strong>ฉบับที่ {String(quote.version)} · เลขที่ {String(quote.quotation_no)} · {bahtTH(quote.final_price)}</strong>
      <span><StatusBadge map={QUOTE_STATUS} value={quote.status} />{quote.sent_at ? ` ส่งเมื่อ ${dateTimeTH(quote.sent_at)}` : ""}{quote.internal_costs ? ` · ต้นทุนรวม ${bahtTH(quote.internal_costs.total_cost)} · ขั้นต่ำ ${bahtTH(quote.internal_costs.minimum_price)}` : ""}</span>
    </li>)}</ul>}</section>
    <section className={layout.historyBlock}><h4>การตัดสินใจของลูกค้า</h4>
      {loading ? <p className={layout.muted}>กำลังโหลด…</p> : failed ? <p className={layout.muted}>โหลดประวัติการตัดสินใจไม่สำเร็จ</p> : !decisions.length ? <p className={layout.muted}>ลูกค้ายังไม่ได้ตัดสินใจ</p> : <ul className={layout.timeline}>{decisions.map((decision) => <li key={`${decision.quotation_id}:${decision.decided_at}`}>
        <strong>{decision.outcome === "accept" ? "ลูกค้าตอบรับ" : "ลูกค้าปฏิเสธ"} · {dateTimeTH(decision.decided_at)}</strong>
        <span>{decision.reason ? `เหตุผล: ${decision.reason} · ` : ""}ปฏิเสธสะสม {decision.rejection_count} ครั้ง{decision.terms ? ` · ราคาที่ตอบรับ ${bahtTH(decision.terms.final_price)}` : ""}</span>
      </li>)}</ul>}
    </section>
  </>;
}
