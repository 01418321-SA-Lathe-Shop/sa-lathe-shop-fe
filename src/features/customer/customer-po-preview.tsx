"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Attachment, BackendApi, Evidence, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api";
import { canPreview } from "../../lib/api/private-preview";
import { useCollection } from "./customer-hooks";
import { Badge, Limited, PrivateFile, ResourceFeedback } from "./customer-ui";
import { customerHref, dateTH, EVIDENCE_LABELS, moneyTH } from "./customer-domain";
import { fileSize } from "./customer-documents-domain";
import styles from "./customer-documents.module.css";

const FEEDBACK = {
  pending: { title: "รอเจ้าหน้าที่ตรวจสอบ", text: "ร้านจะเทียบเอกสารนี้กับใบเสนอราคา เมื่อตรวจแล้วสถานะจะเปลี่ยนที่หน้านี้", tone: "info" },
  approved: { title: "เอกสาร PO ผ่านการตรวจแล้ว", text: "ร้านรับเอกสารนี้แล้ว งานจะเปิดเมื่อหลักฐานที่ต้องใช้ครบ", tone: "success" },
  rejected: { title: "เอกสาร PO ต้องแก้ไข", text: "", tone: "danger" },
} as const;

export function CustomerPoPreview({ api, request, quote, state, onUpload }: { api: BackendApi; request: JobRequest; quote: Quotation; state: Fulfillment; onUpload?: () => void }) {
  const files = useCollection<Attachment>(api, `/requests/${request.id}/attachments`); const params = useSearchParams(); const path = usePathname();
  const evidence = (state.evidence ?? []).filter((item) => item.kind === "po").sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at) || a.id.localeCompare(b.id));
  const selected = params.has("evidence") ? evidence.find((item) => item.id === params.get("evidence")) : evidence[0];
  const file = files.data?.items.find((item) => item.id === selected?.attachment_id);
  if (!evidence.length && !params.has("evidence")) return null;
  function href(item: Evidence) { const next = new URLSearchParams(params); next.set("evidence", item.id); return `${path}?${next}`; }
  const feedback = selected && FEEDBACK[selected.status];
  return <section className={styles.poSection} aria-label="เอกสารใบสั่งซื้อ PO">
    <header className={styles.detailHead}>
      <div><div className={styles.detailTitle}><h1 tabIndex={-1}>PO ของคำขอ #{request.no_request}</h1>{selected && <Badge value={selected.status} labels={EVIDENCE_LABELS} />}</div><p>สำหรับใบเสนอราคา #{quote.quotation_no} · {request.description}</p></div>
      {selected && <div className={styles.decisionActions}><span className={styles.fileAction}><PrivateFile api={api} path={`/attachments/${selected.attachment_id}/download`} name="ดาวน์โหลด PO ต้นฉบับ" /></span>{selected.status === "rejected" && onUpload && <button type="button" className="cust-primary" onClick={onUpload}>อัปโหลด PO ฉบับแก้ไข</button>}</div>}
    </header>
    {!selected ? <p role="alert" className="cust-alert danger">ไม่พบ PO นี้ในคำขอที่เปิดอยู่ เลือกเอกสารจากรายการอีกครั้ง</p> : <>
      <section className={styles.card2} aria-labelledby="po-progress"><h2 id="po-progress">ความคืบหน้าการตรวจ</h2>
        <ol className={styles.steps}>
          <li data-state="done"><span aria-hidden="true">✓</span><strong>ส่งเอกสารแล้ว</strong><small>{dateTH(selected.submitted_at)}</small></li>
          <li data-state={selected.status === "pending" ? "current" : "done"} aria-current={selected.status === "pending" ? "step" : undefined}><span aria-hidden="true">{selected.status === "pending" ? "•" : "✓"}</span><strong>รอตรวจสอบ</strong><small>{selected.status === "pending" ? "อยู่ในคิวของร้าน" : "ตรวจแล้ว"}</small></li>
          <li data-state={selected.status === "pending" ? "todo" : selected.status}><span aria-hidden="true">{selected.status === "rejected" ? "×" : selected.status === "approved" ? "✓" : ""}</span><strong>{selected.status === "pending" ? "ผลการตรวจ" : EVIDENCE_LABELS[selected.status]}</strong><small>{selected.reviewed_at ? dateTH(selected.reviewed_at) : "อนุมัติหรือขอให้แก้ไข"}</small></li>
        </ol>
      </section>
      <section className={styles.feedback} data-tone={feedback!.tone} aria-labelledby="po-feedback"><div><h2 id="po-feedback">{feedback!.title}</h2>{selected.reviewed_at && <small>ตรวจเมื่อ {dateTH(selected.reviewed_at)}</small>}</div>
        {selected.status === "rejected" ? <><p>เหตุผลจากร้าน: {selected.reason || "ร้านไม่ได้ระบุเหตุผล"}</p><p className={styles.nextStep}><strong>สิ่งที่ต้องทำ:</strong> แก้เอกสารในระบบจัดซื้อของบริษัท แล้วอัปโหลดฉบับใหม่ เอกสารนี้จะเก็บไว้ในประวัติ</p></> : <p>{selected.status === "approved" && state.job ? "ร้านรับเอกสารนี้แล้วและเปิดงานผลิตแล้ว" : feedback!.text}</p>}</section>
      <div className={styles.detailGrid}>
        <section className={styles.card2} aria-labelledby="po-document"><h2 id="po-document">เอกสารที่อัปโหลด</h2><ResourceFeedback {...files} /><Limited complete={files.data?.complete} />{file ? <FilePreview key={file.id} api={api} file={file} /> : !files.loading && <p className="cust-alert">ยังไม่มีข้อมูลไฟล์สำหรับแสดงตัวอย่าง คุณยังดาวน์โหลดต้นฉบับได้</p>}</section>
        <section className={styles.card2} aria-labelledby="po-details"><h2 id="po-details">รายละเอียด</h2>
          <div className={styles.factsHead}><h3>ใบเสนอราคาที่เกี่ยวข้อง</h3><Link href={customerHref("quotations", { request: request.id, quotation: quote.id })}>ดูใบเสนอราคา →</Link></div>
          <dl className={styles.facts}><div><dt>ใบเสนอราคา</dt><dd>#{quote.quotation_no} · ฉบับที่ {quote.version}</dd></div><div><dt>คำขอผลิต</dt><dd>#{request.no_request} · {request.description}</dd></div><div><dt>ตอบรับเมื่อ</dt><dd>{dateTH(state.terms.accepted_at)}</dd></div><div><dt>ราคารวมทั้งงาน</dt><dd>{moneyTH(state.terms.final_price)}</dd></div></dl>
          <div className={styles.factsHead}><h3>การส่งเอกสาร</h3><Link href={customerHref("requests", { request: request.id })}>ดูคำขอผลิต →</Link></div>
          <dl className={styles.facts}>{file && <div><dt>ไฟล์ต้นฉบับ</dt><dd>{file.file_name}<small>{fileSize(file.byte_size)}</small></dd></div>}<div><dt>ส่งเมื่อ</dt><dd>{dateTH(selected.submitted_at)}<small>วันที่ส่งหลักฐาน ไม่ใช่วันออก PO</small></dd></div>{selected.reviewed_at && <div><dt>ตรวจเมื่อ</dt><dd>{dateTH(selected.reviewed_at)}</dd></div>}<div><dt>สถานะ</dt><dd><Badge value={selected.status} labels={EVIDENCE_LABELS} /></dd></div></dl>
          <p className="cust-muted cust-small">ระบบไม่ได้แยกเลข PO หรือยอดจากไฟล์</p>
        </section>
      </div>
      <section className={styles.card2} aria-labelledby="po-activity"><h2 id="po-activity">ประวัติเอกสาร PO</h2>
        <ol className={styles.activity}>{evidence.flatMap((item) => [
          ...(item.reviewed_at ? [<li key={`${item.id}:review`}><time dateTime={item.reviewed_at}>{dateTH(item.reviewed_at)}</time><span><strong>{item.status === "approved" ? "ร้านอนุมัติเอกสาร" : "ร้านขอให้แก้ไขเอกสาร"}</strong>{item.reason && <small>{item.reason}</small>}</span></li>] : []),
          <li key={item.id}><time dateTime={item.submitted_at}>{dateTH(item.submitted_at)}</time><span><strong>คุณส่งเอกสาร PO</strong><small>{item.id === selected.id ? "กำลังเปิดดู" : <Link href={href(item)}>เปิดเอกสารนี้ →</Link>}</small></span></li>,
        ])}</ol>
      </section>
    </>}
  </section>;
}

function FilePreview({ api, file }: { api: BackendApi; file: Attachment }) {
  const [revision, setRevision] = useState(0); const [state, setState] = useState<{ revision: number; url?: string; error?: string }>({ revision: -1 });
  const supported = canPreview(file);
  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController(); let href: string | undefined;
    void api.preview(file, controller.signal).then((blob) => { if (!controller.signal.aborted) { href = URL.createObjectURL(blob); setState({ revision, url: href }); } }, () => { if (!controller.signal.aborted) setState({ revision, error: "โหลดตัวอย่างไฟล์ไม่สำเร็จ ลองอีกครั้งหรือดาวน์โหลดต้นฉบับ" }); });
    return () => { controller.abort(); if (href) URL.revokeObjectURL(href); };
  }, [api, file, revision, supported]);
  if (!supported) return <div className={styles.previewFallback}><h3>เปิดไฟล์ต้นฉบับเพื่อดูเอกสารนี้</h3><p>{file.file_name}</p><p>แสดงตัวอย่างได้เฉพาะ PDF, PNG และ JPEG · ไฟล์เอกสารชนิดอื่นดาวน์โหลดเพื่อเปิดในแอปที่รองรับ</p></div>;
  return <div className={styles.filePreview}>{state.revision !== revision ? <div className={styles.previewFallback} role="status">กำลังโหลดตัวอย่างเอกสาร…</div> : state.error ? <div className={styles.previewFallback} role="alert"><p>{state.error}</p><button onClick={() => setRevision((old) => old + 1)}>ลองโหลดตัวอย่างอีกครั้ง</button></div> : state.url && <object data={state.url} type={file.content_type} aria-label={`ตัวอย่าง ${file.file_name}`} onError={() => setState({ revision, error: "เบราว์เซอร์แสดงไฟล์นี้ไม่ได้ ดาวน์โหลดต้นฉบับเพื่อเปิดดู" })}><p>เบราว์เซอร์แสดงไฟล์นี้ไม่ได้ ใช้ปุ่มดาวน์โหลด PO ต้นฉบับด้านบน</p></object>}
    <p className="cust-muted cust-small">หากตัวอย่างไม่แสดง ใช้ “ดาวน์โหลด PO ต้นฉบับ” ด้านบน · ตัวอย่างไม่ใช่การอนุมัติหลักฐาน</p></div>;
}
