"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Attachment, BackendApi, Evidence, Fulfillment, JobRequest } from "../../lib/api/backend-api";
import { canPreview } from "../../lib/api/private-preview";
import { useCollection } from "./customer-hooks";
import { Badge, Limited, PrivateFile, ResourceFeedback } from "./customer-ui";
import { customerHref, dateTH, EVIDENCE_LABELS } from "./customer-domain";
import styles from "./customer-documents.module.css";

export function CustomerPoPreview({ api, request, state }: { api: BackendApi; request: JobRequest; state: Fulfillment }) {
  const files = useCollection<Attachment>(api, `/requests/${request.id}/attachments`); const params = useSearchParams(); const path = usePathname();
  const evidence = (state.evidence ?? []).filter((item) => item.kind === "po").sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at) || a.id.localeCompare(b.id));
  const selected = params.has("evidence") ? evidence.find((item) => item.id === params.get("evidence")) : evidence[0];
  const file = files.data?.items.find((item) => item.id === selected?.attachment_id);
  if (!evidence.length && !params.has("evidence")) return null;
  function href(item: Evidence) { const next = new URLSearchParams(params); next.set("evidence", item.id); return `${path}?${next}`; }
  return <section className={styles.poSection} aria-label="เอกสารใบสั่งซื้อ PO"><header className={styles.documentToolbar}><div><h2>PO ของคำขอ #{request.no_request}</h2>{selected && <Badge value={selected.status} labels={EVIDENCE_LABELS} />}</div>{selected && <PrivateFile api={api} path={`/attachments/${selected.attachment_id}/download`} name="ดาวน์โหลด PO ต้นฉบับ" />}</header>
    {evidence.length > 1 && <nav className={styles.tabs} aria-label="ประวัติเอกสาร PO">{evidence.map((item) => <Link key={item.id} href={href(item)} aria-current={selected?.id === item.id ? "page" : undefined}>ส่งเมื่อ {dateTH(item.submitted_at)} · {EVIDENCE_LABELS[item.status]}</Link>)}</nav>}
    {!selected ? <p role="alert" className="cust-alert danger">ไม่พบ PO นี้ในคำขอที่เปิดอยู่ เลือกเอกสารจากรายการอีกครั้ง</p> : <div className={styles.previewLayout}><div><ResourceFeedback {...files} /><Limited complete={files.data?.complete} />{file ? <FilePreview key={file.id} api={api} file={file} /> : !files.loading && <p className="cust-alert">ยังไม่มีข้อมูลไฟล์สำหรับแสดงตัวอย่าง คุณยังดาวน์โหลดต้นฉบับได้</p>}</div>
      <aside className={styles.previewInfo}><h3>ข้อมูลหลักฐาน PO</h3><dl className="cust-definition"><div><dt>คำขอผลิต</dt><dd>#{request.no_request} · {request.description}</dd></div><div><dt>ส่งหลักฐานเมื่อ</dt><dd>{dateTH(selected.submitted_at)}</dd></div>{selected.reviewed_at && <div><dt>ตรวจหลักฐานเมื่อ</dt><dd>{dateTH(selected.reviewed_at)}</dd></div>}{file && <div><dt>ไฟล์ต้นฉบับ</dt><dd>{file.file_name}</dd></div>}</dl>
        {selected.reason && <p className="cust-alert danger">เหตุผลที่ต้องแก้ไข: {selected.reason}</p>}<p className="cust-muted">วันที่นี้คือวันที่ส่งหลักฐาน ไม่ใช่วันออก PO · ระบบไม่ได้แยกเลข PO หรือยอดจากไฟล์</p><Link href={customerHref("requests", { request: request.id })}>ดูคำขอผลิต →</Link>
      </aside></div>}
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
