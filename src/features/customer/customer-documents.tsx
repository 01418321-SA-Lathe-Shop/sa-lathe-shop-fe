"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { BackendApi, Customer } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { useSalesIndex } from "./customer-sales-data";
import { dateTH, EVIDENCE_LABELS, moneyTH } from "./customer-domain";
import { documentDetailHref, documentFilterError, documentFilters, documentListHref, documentParams, documentRows, filterDocuments, type DocumentRow } from "./customer-documents-domain";
import { DocumentFilters } from "./customer-document-filters";
import { useDocumentNavigation, useDocumentScroll } from "./customer-document-navigation";
import { DepositChecklist } from "./customer-deposits";
import { Badge, Empty, Limited, LocalPages, PageTitle, PrivateFile, ResourceFeedback } from "./customer-ui";
import styles from "./customer-documents.module.css";

const QUOTATION_STATUSES = { sent: "รอพิจารณา", approved: "ตอบรับแล้ว", rejected: "ปฏิเสธแล้ว" };
export function DocumentList({ api, mode }: { api: BackendApi; mode: "quotes" | "deposit" }) {
  const data = useSalesIndex(api); const profiles = useResource<{ items: Customer[] | null }>(api, "/customers");
  const query = useSearchParams(); const router = useRouter(); const navigation = useDocumentNavigation();
  const params = documentParams(query); const filters = documentFilters(params);
  const view = mode === "quotes" ? "quotes" : params.get("view") === "po" ? "po" : "tasks";
  const section = mode === "quotes" ? "quotations" : "deposit-po";
  const rows = documentRows(data.records, profiles.data?.items ?? [], view);
  const error = documentFilterError(filters, view); const filtered = filterDocuments(rows, filters, view);
  const counted = filterDocuments(rows, filters, view, true); const counts: Record<string, number> = { "": counted.length };
  for (const row of counted) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const page = Math.min(filters.page, Math.max(0, Math.ceil(filtered.length / 20) - 1));
  const list = documentListHref(section, params); const hrefs = filtered.map((row) => documentDetailHref(section, params, row));
  const capture = () => navigation.capture(list, hrefs);
  const busy = data.loading || profiles.loading; const unavailable = Boolean(data.error && !data.data);
  useDocumentScroll(list, !busy);
  function changePage(next: number) { const updated = documentParams(params); updated.set("page", String(next + 1)); router.replace(documentListHref(section, updated), { scroll: false }); }
  const poView = new URLSearchParams({ view: "po" });
  return <section className={styles.scope}>
    <PageTitle title={mode === "quotes" ? "ใบเสนอราคา" : "มัดจำและ PO"} description={mode === "quotes" ? "พิจารณาราคาและเงื่อนไขก่อนตอบรับ" : "ตรวจสิ่งที่ต้องส่งและกำหนดเวลาจากเงื่อนไขที่ตอบรับ"} />
    <p className={styles.total} role="status">{busy ? "กำลังโหลดจำนวนเอกสาร…" : unavailable ? "ยังโหลดจำนวนเอกสารไม่ได้" : `${view === "tasks" ? "รายการเงื่อนไข" : "เอกสาร"} ${filtered.length} รายการที่โหลดสำเร็จ`}</p>
    {mode === "deposit" && <nav className="cust-tabs" aria-label="มุมมองมัดจำและ PO"><Link href="/customer/deposit-po" aria-current={view === "tasks" ? "page" : undefined}>สิ่งที่ต้องส่ง</Link><Link href={documentListHref(section, poView)} aria-current={view === "po" ? "page" : undefined}>เอกสาร PO</Link></nav>}
    <DocumentFilters section={section} params={params} view={view} labels={view === "po" ? EVIDENCE_LABELS : QUOTATION_STATUSES} counts={counts} loading={busy} unavailable={unavailable} />
    {error && <p role="alert" className="cust-alert danger">{error}</p>}
    <ResourceFeedback {...data} loading={false} /><ResourceFeedback {...profiles} loading={false} />
    {data.data && !data.loading && <Limited complete={data.complete} />}
    {profiles.error && <p className="cust-alert">ชื่อและประเภทลูกค้าบางรายการยังโหลดไม่ได้ การค้นหาข้อมูลผู้สั่งอาจไม่ครบ</p>}
    {view === "po" && <p className="cust-muted cust-small">เลข PO และยอดในไฟล์ไม่ได้ถูกบันทึกเป็นข้อมูลแยก · วันที่ด้านล่างคือวันที่ส่งหลักฐาน ไม่ใช่วันออก PO</p>}
    {busy && !rows.length && <div className={styles.skeletons} role="status" aria-label="กำลังโหลดรายการเอกสาร">{[0, 1, 2].map((key) => <div key={key} className={styles.skeleton} aria-hidden="true" />)}</div>}
    <div className={styles.rows}>{filtered.slice(page * 20, page * 20 + 20).map((row) => <DocumentListRow key={row.id} row={row} api={api} view={view} href={documentDetailHref(section, params, row)} capture={capture} />)}</div>
    {!busy && data.data && !data.error && !filtered.length && !error && <Empty title={!data.complete ? "ยังตรวจรายการเอกสารได้ไม่ครบ" : rows.length ? "ไม่พบเอกสารที่ตรงกับตัวกรอง" : view === "po" ? "ยังไม่มีเอกสาร PO ที่ส่งแล้ว" : view === "tasks" ? "ยังไม่มีรายการมัดจำหรือ PO" : "ยังไม่มีใบเสนอราคา"} action={<Link href={rows.length ? documentListHref(section, view === "po" ? poView : new URLSearchParams()) : view === "po" ? "/customer/deposit-po" : "/customer/requests"}>{rows.length ? "ล้างตัวกรอง" : view === "po" ? "ดูสิ่งที่ต้องส่ง" : "ดูคำขอผลิต"}</Link>}>{!data.complete ? "ข้อมูลที่โหลดได้ยังไม่ครบ จึงยังสรุปว่าไม่มีเอกสารไม่ได้" : view === "po" ? "เมื่อส่ง PO สำเร็จ เอกสารและประวัติจะปรากฏที่นี่" : "ลองเปลี่ยนตัวกรอง หรือตรวจคำขอผลิตที่เกี่ยวข้อง"}</Empty>}
    <LocalPages count={filtered.length} page={page} setPage={changePage} />
  </section>;
}
function DocumentListRow({ row, api, view, href, capture }: { row: DocumentRow; api: BackendApi; view: string; href: string; capture: () => void }) {
  const title = view === "po" ? `PO ของคำขอ #${row.request.no_request}` : `ใบเสนอราคา #${row.quote.quotation_no} · ฉบับที่ ${row.quote.version}`;
  return <article className={styles.row}>
    <div><Link className={styles.rowTitle} href={href} onClick={capture}>{title}</Link><Badge value={row.status} labels={view === "po" ? EVIDENCE_LABELS : QUOTATION_STATUSES} /></div>
    <div><strong className={styles.workName}>{row.request.description}</strong><p>{row.customer?.name ?? "ยังไม่มีข้อมูลชื่อผู้สั่ง"}{row.customerType ? ` · ${row.customerType === "company" ? "บริษัท" : "บุคคลทั่วไป"}` : ""}</p><p>คำขอ #{row.request.no_request} · จำนวน {row.request.qty} ชิ้น</p>{view === "tasks" && row.fulfillment && <DepositChecklist state={row.fulfillment} />}</div>
    <div><span className={styles.label}>{view === "po" ? "ส่ง PO เมื่อ" : view === "tasks" ? "ตอบรับเมื่อ" : "ส่งใบเสนอราคาเมื่อ"}</span><time dateTime={row.date}>{dateTH(row.date)}</time>{view === "tasks" && row.fulfillment && <p>ส่งหลักฐานภายใน {dateTH(row.fulfillment.terms.documents_due_at)}</p>}</div>
    <div className={styles.rowActions}>{row.amount && <><strong>{moneyTH(row.amount)}</strong><small>ราคารวมทั้งงาน · ไม่มี VAT</small></>}
      <Link className="cust-link" href={href} onClick={capture}>{view === "tasks" ? "ดูและส่งหลักฐาน" : view === "po" ? "ดูรายละเอียด PO" : "ดูรายละเอียดใบเสนอราคา"} →</Link>
      {view === "quotes" && <><span className={styles.desktopDownload}><Link className="cust-link" href={`${href}&print=1`} onClick={capture} aria-label={`พิมพ์หรือบันทึก PDF ใบเสนอราคา #${row.quote.quotation_no}`}>พิมพ์ / PDF</Link></span><details className={styles.mobileMore}><summary>ตัวเลือกเอกสาร</summary><Link href={`${href}&print=1`} onClick={capture}>พิมพ์ / บันทึกเป็น PDF</Link></details></>}
      {row.evidence && <div className={styles.desktopDownload}><PrivateFile api={api} path={`/attachments/${row.evidence.attachment_id}/download`} name="ดาวน์โหลดไฟล์ PO เดิม" /></div>}
      {row.evidence && <details className={styles.mobileMore}><summary>ตัวเลือกเอกสาร</summary><PrivateFile api={api} path={`/attachments/${row.evidence.attachment_id}/download`} name="ดาวน์โหลดไฟล์ PO เดิม" /></details>}
    </div>
  </article>;
}
