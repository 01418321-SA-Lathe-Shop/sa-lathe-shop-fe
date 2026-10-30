"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi, Customer } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { useRequestFiles, useSalesIndex } from "./customer-sales-data";
import { customerHref, dateTH, EVIDENCE_LABELS, moneyTH } from "./customer-domain";
import { documentDetailHref, documentFilterError, documentFilters, documentListHref, documentNote, documentParams, documentRows, fileExtension, filterDocuments, poAwaiting, type DocumentRow } from "./customer-documents-domain";
import { DocumentFilters } from "./customer-document-filters";
import { useDocumentNavigation, useDocumentScroll } from "./customer-document-navigation";
import { DepositChecklist } from "./customer-deposits";
import { useNow } from "./customer-hooks";
import { Badge, Empty, Limited, LocalPages, PageTitle, PrivateFile, ResourceFeedback } from "./customer-ui";
import styles from "./customer-documents.module.css";

const QUOTATION_STATUSES = { sent: "รอพิจารณา", approved: "ตอบรับแล้ว", rejected: "ปฏิเสธแล้ว" };
type Column = { label: string; cell: (row: DocumentRow, href: string) => ReactNode; numeric?: boolean };

export function DocumentList({ api, mode }: { api: BackendApi; mode: "quotes" | "deposit" }) {
  const data = useSalesIndex(api); const profiles = useResource<{ items: Customer[] | null }>(api, "/customers");
  const query = useSearchParams(); const router = useRouter(); const navigation = useDocumentNavigation(); const now = useNow();
  const params = documentParams(query); const filters = documentFilters(params);
  const view = mode === "quotes" ? "quotes" : params.get("view") === "po" ? "po" : "tasks";
  const section = mode === "quotes" ? "quotations" : "deposit-po";
  const customers = profiles.data?.items ?? [];
  const baseRows = documentRows(data.records, customers, view);
  const files = useRequestFiles(api, view === "po" ? [...new Set(baseRows.map((row) => row.request.id))].sort() : []);
  const rows = baseRows.map((row) => row.evidence ? { ...row, fileName: files.files.get(row.evidence.attachment_id)?.file_name } : row);
  const error = documentFilterError(filters, view); const filtered = filterDocuments(rows, filters, view);
  const counted = filterDocuments(rows, filters, view, true); const counts: Record<string, number> = { "": counted.length };
  for (const row of counted) counts[row.status] = (counts[row.status] ?? 0) + 1;
  // Quotations awaiting an answer lead as cards; only the rest go in the table.
  const open = view === "quotes" ? filtered.filter((row) => row.status === "sent") : [];
  const tableRows = view === "quotes" ? filtered.filter((row) => row.status !== "sent") : filtered;
  const page = Math.min(filters.page, Math.max(0, Math.ceil(tableRows.length / 20) - 1));
  const list = documentListHref(section, params); const hrefs = filtered.map((row) => documentDetailHref(section, params, row));
  const capture = () => navigation.capture(list, hrefs);
  const busy = data.loading || profiles.loading; const unavailable = Boolean(data.error && !data.data);
  useDocumentScroll(list, !busy);
  function changePage(next: number) { const updated = documentParams(params); updated.set("page", String(next + 1)); router.replace(documentListHref(section, updated), { scroll: false }); }
  const poView = new URLSearchParams({ view: "po" });
  const awaiting = mode === "deposit" && now !== null ? poAwaiting(documentRows(data.records, customers, "tasks"), now) : [];
  const uploadHref = awaiting[0] && `${customerHref("deposit-po", { request: awaiting[0].request.id, quotation: awaiting[0].quote.id, upload: "po" })}#upload`;
  const upload = mode !== "deposit" ? undefined : uploadHref
    ? <Link className="cust-primary" href={uploadHref}><Icon name="file" size={16} /> อัปโหลด PO</Link>
    : <span className={styles.uploadIdle}><button type="button" className="cust-primary" disabled><Icon name="file" size={16} /> อัปโหลด PO</button><small>{busy ? "กำลังตรวจรายการ…" : "ยังไม่มีใบเสนอราคาที่ต้องส่ง PO"}</small></span>;
  const columns = view === "quotes" ? quoteColumns(capture) : view === "po" ? poColumns(api, capture, files.loading, files.failed) : taskColumns(capture);
  const empty = !busy && data.data && !data.error && !filtered.length && !error;
  return <section className={styles.scope}>
    <PageTitle title={mode === "quotes" ? "ใบเสนอราคา" : "มัดจำและ PO"} description={mode === "quotes" ? "พิจารณาราคาและเงื่อนไขก่อนตอบรับ" : "อัปโหลดเอกสาร PO ของบริษัทหรือหลักฐานมัดจำสำหรับใบเสนอราคาที่ตอบรับแล้ว ร้านจะตรวจก่อนเริ่มผลิต"} action={upload} />
    {awaiting[0] && <div className={styles.banner}><p><strong>มี {awaiting.length} ใบเสนอราคาที่ตอบรับแล้วแต่ยังต้องส่ง PO</strong> ใบแรกคือ #{awaiting[0].quote.quotation_no} · {awaiting[0].request.description} ส่งภายใน {dateTH(awaiting[0].fulfillment!.terms.documents_due_at)}</p><Link className={styles.outline} href={uploadHref!}>ส่ง PO ใบนี้</Link></div>}
    <ResourceFeedback {...data} loading={false} /><ResourceFeedback {...profiles} loading={false} />
    {error && <p role="alert" className="cust-alert danger">{error}</p>}
    {data.data && !data.loading && <Limited complete={data.complete} />}
    {profiles.error && <p className="cust-alert">ชื่อและประเภทลูกค้าบางรายการยังโหลดไม่ได้ การค้นหาข้อมูลผู้สั่งอาจไม่ครบ</p>}
    {view === "quotes" && !unavailable && !filters.status && <section className={styles.openSection} aria-labelledby="open-quotes">
      <h2 id="open-quotes">รอคุณตอบ {!busy && <span className={styles.openCount}>{open.length}</span>}</h2>
      {busy && !open.length ? <div className={styles.cards} role="status" aria-label="กำลังโหลดใบเสนอราคา">{[0, 1].map((key) => <div key={key} className={styles.skeletonCard} aria-hidden="true" />)}</div>
        : open.length ? <div className={styles.cards}>{open.map((row) => <QuoteCard key={row.id} row={row} href={documentDetailHref(section, params, row)} capture={capture} />)}</div>
        : <p className={styles.caughtUp}><span aria-hidden="true">✓</span> ไม่มีใบเสนอราคาที่รอคุณตอบ</p>}
    </section>}
    <section className={styles.panel} aria-label={view === "quotes" ? "รายการใบเสนอราคา" : view === "po" ? "รายการเอกสาร PO" : "รายการที่ต้องส่ง"}>
      {mode === "deposit" && <nav className={styles.views} aria-label="มุมมองมัดจำและ PO"><Link href="/customer/deposit-po" aria-current={view === "tasks" ? "page" : undefined}>สิ่งที่ต้องส่ง</Link><Link href={documentListHref(section, poView)} aria-current={view === "po" ? "page" : undefined}>เอกสาร PO</Link></nav>}
      <DocumentFilters section={section} params={params} view={view} labels={view === "po" ? EVIDENCE_LABELS : QUOTATION_STATUSES} counts={counts} loading={busy} unavailable={unavailable} />
      {view === "po" && <p className={styles.panelNote}>ระบบไม่แยกเลข PO และยอดจากไฟล์ · วันที่ในตารางคือวันที่ส่งเอกสาร ไม่ใช่วันออก PO</p>}
      {busy && !tableRows.length ? <div className={styles.skeletons} role="status" aria-label="กำลังโหลดรายการเอกสาร">{[0, 1, 2].map((key) => <div key={key} className={styles.skeleton} aria-hidden="true" />)}</div>
        : tableRows.length > 0 && <table className={styles.table}>
          <thead><tr>{columns.map((column) => <th key={column.label} scope="col" data-numeric={column.numeric}>{column.label}</th>)}<th scope="col" className={styles.openCell} aria-label="เปิด" /></tr></thead>
          <tbody>{tableRows.slice(page * 20, page * 20 + 20).map((row) => { const href = documentDetailHref(section, params, row); return <tr key={row.id}>{columns.map((column) => <td key={column.label} data-label={column.label} data-numeric={column.numeric}>{column.cell(row, href)}</td>)}<td className={styles.openCell} aria-hidden="true"><Icon name="arrow" size={16} /></td></tr>; })}</tbody>
        </table>}
      {empty && <Empty title={!data.complete ? "ยังตรวจรายการเอกสารได้ไม่ครบ" : rows.length ? "ไม่พบเอกสารที่ตรงกับตัวกรอง" : view === "po" ? "ยังไม่มีเอกสาร PO ที่ส่งแล้ว" : view === "tasks" ? "ยังไม่มีรายการมัดจำหรือ PO" : "ยังไม่มีใบเสนอราคา"} action={<Link href={rows.length ? documentListHref(section, view === "po" ? poView : new URLSearchParams()) : view === "po" ? "/customer/deposit-po" : "/customer/requests"}>{rows.length ? "ล้างตัวกรอง" : view === "po" ? "ดูสิ่งที่ต้องส่ง" : "ดูคำขอผลิต"}</Link>}>{!data.complete ? "ข้อมูลที่โหลดได้ยังไม่ครบ จึงยังสรุปว่าไม่มีเอกสารไม่ได้" : view === "po" ? "เมื่อส่ง PO สำเร็จ เอกสารและสถานะการตรวจจะปรากฏที่นี่" : "เมื่อร้านส่งราคาหรือคุณตอบรับ รายการจะปรากฏที่นี่"}</Empty>}
      {!busy && filtered.length > 0 && !tableRows.length && <p className={styles.panelNote}>ไม่มีใบเสนอราคาอื่นตามตัวกรองนี้</p>}
      <LocalPages count={tableRows.length} page={page} setPage={changePage} />
      {!busy && tableRows.length > 0 && <p className={styles.footer} role="status">แสดง {Math.min(tableRows.length, 20)} จาก {tableRows.length} รายการที่โหลดสำเร็จ</p>}
    </section>
  </section>;
}

function QuoteCard({ row, href, capture }: { row: DocumentRow; href: string; capture: () => void }) {
  return <article className={styles.card}>
    <div className={styles.cardTop}><span>#{row.quote.quotation_no} · ฉบับที่ {row.quote.version}</span><Badge value={row.status} labels={QUOTATION_STATUSES} /></div>
    <div><h3>{row.request.description}</h3><small>คำขอ #{row.request.no_request} · จำนวน {row.request.qty} ชิ้น</small></div>
    <div className={styles.cardPrice}><strong>{moneyTH(row.quote.final_price)}</strong><span>ส่งเมื่อ {dateTH(row.quote.sent_at)} · ไม่มี VAT</span></div>
    <Link className="cust-primary" href={href} onClick={capture}>ดูรายละเอียดและตอบ</Link>
  </article>;
}

const requestCell = (row: DocumentRow) => <><strong className={styles.workName}>{row.request.description}</strong><small>คำขอ #{row.request.no_request} · {row.request.qty} ชิ้น</small></>;
function quoteColumns(capture: () => void): Column[] {
  return [
    { label: "ใบเสนอราคา", cell: (row, href) => <><Link className={styles.rowTitle} href={href} onClick={capture}>#{row.quote.quotation_no}</Link><small>ฉบับที่ {row.quote.version}</small></> },
    { label: "คำขอผลิต", cell: requestCell },
    { label: "ส่งเมื่อ", cell: (row) => <time dateTime={row.date}>{dateTH(row.date)}</time> },
    { label: "ราคารวม", numeric: true, cell: (row) => row.amount && moneyTH(row.amount) },
    { label: "สถานะ", cell: (row) => <Badge value={row.status} labels={QUOTATION_STATUSES} /> },
    { label: "ขั้นถัดไป", cell: (row) => { const note = documentNote(row); return <span className={note.warn ? styles.warn : styles.quiet}>{note.text || "—"}</span>; } },
  ];
}
function taskColumns(capture: () => void): Column[] {
  return [
    { label: "ใบเสนอราคา", cell: (row, href) => <><Link className={styles.rowTitle} href={href} onClick={capture}>#{row.quote.quotation_no}</Link><small>{moneyTH(row.quote.final_price)} · ไม่มี VAT</small></> },
    { label: "คำขอผลิต", cell: requestCell },
    { label: "ตอบรับเมื่อ", cell: (row) => <time dateTime={row.date}>{dateTH(row.date)}</time> },
    { label: "ส่งหลักฐานภายใน", cell: (row) => row.fulfillment ? dateTH(row.fulfillment.terms.documents_due_at) : "—" },
    { label: "สิ่งที่ต้องส่ง", cell: (row) => row.fulfillment ? <DepositChecklist state={row.fulfillment} className={styles.evidenceLine} /> : "—" },
  ];
}
function poColumns(api: BackendApi, capture: () => void, loading: boolean, failed: boolean): Column[] {
  return [
    { label: "เอกสาร PO", cell: (row, href) => <Link className={styles.rowTitle} href={href} onClick={capture}>PO ของคำขอ #{row.request.no_request}</Link> },
    { label: "ใบเสนอราคา", cell: (row) => <><Link className={styles.plainLink} href={customerHref("quotations", { request: row.request.id, quotation: row.quote.id })}>#{row.quote.quotation_no}</Link><small>{moneyTH(row.quote.final_price)}</small></> },
    { label: "คำขอผลิต", cell: requestCell },
    { label: "ส่งเมื่อ", cell: (row) => <time dateTime={row.date}>{dateTH(row.date)}</time> },
    { label: "ไฟล์", cell: (row) => row.fileName ? <span className={styles.fileCell}><span aria-hidden="true" className={styles.fileTag}>{fileExtension(row.fileName)}</span><span className={styles.fileMeta}><span>{row.fileName}</span><PrivateFile api={api} path={`/attachments/${row.evidence!.attachment_id}/download`} name="ดาวน์โหลด" /></span></span> : <span className={styles.fileMeta}><span className={styles.quiet}>{loading ? "กำลังโหลดชื่อไฟล์…" : failed ? "ยังโหลดชื่อไฟล์ไม่ได้" : "ไม่มีข้อมูลชื่อไฟล์"}</span><PrivateFile api={api} path={`/attachments/${row.evidence!.attachment_id}/download`} name="ดาวน์โหลด" /></span> },
    { label: "สถานะ", cell: (row) => <Badge value={row.status} labels={EVIDENCE_LABELS} /> },
  ];
}
