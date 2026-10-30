"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Customer, JobRequest, Quotation, Terms } from "../../lib/api/backend-api";
import { dateTH, moneyTH, QUOTE_LABELS } from "./customer-domain";
import styles from "./customer-documents.module.css";

// Explicit customer-visible fields only: never serialize or spread a quotation
// DTO into a document (staff DTOs can include internal_costs).
export function QuotationDocument({ request, quote, customer, terms }: { request: JobRequest; quote: Quotation; customer?: Customer; terms?: Terms }) {
  return <article className={styles.paper} aria-label={`เอกสารใบเสนอราคา #${quote.quotation_no}`}>
    <header className={styles.paperHeader}><h2>ใบเสนอราคา</h2><p>#{quote.quotation_no} · ฉบับที่ {quote.version}</p><p>{QUOTE_LABELS[quote.status]}</p></header>
    <dl className={styles.documentFacts}>
      <div><dt>ผู้สั่ง</dt><dd>{customer?.name ?? "ยังโหลดข้อมูลผู้สั่งไม่ได้"}</dd></div>
      <div><dt>ประเภทผู้สั่ง{terms ? "ที่ตอบรับ" : ""}</dt><dd>{(terms?.customer_type ?? customer?.customer_type) === "company" ? "บริษัท" : (terms?.customer_type ?? customer?.customer_type) === "individual" ? "บุคคลทั่วไป" : "ยังไม่มีข้อมูล"}</dd></div>
      <div><dt>คำขอผลิต</dt><dd>#{request.no_request}</dd></div><div><dt>ส่งใบเสนอราคาเมื่อ</dt><dd>{dateTH(quote.sent_at)}</dd></div>
    </dl>
    <section className={styles.paperScope}><h3>ขอบเขตงานที่เสนอ</h3><p className="cust-preserve">{request.description}</p><dl className={styles.documentFacts}>
      <div><dt>จำนวนทั้งงาน</dt><dd>{request.qty} ชิ้น</dd></div><div><dt>ข้อกำหนดวัตถุดิบ</dt><dd>{request.material_spec || "ไม่ระบุ"}</dd></div>
      <div><dt>วันที่ลูกค้าต้องการ</dt><dd>{dateTH(request.deadline)}<small>ไม่ใช่กำหนดส่งที่ร้านยืนยัน</small></dd></div>
    </dl></section>
    <div className={styles.paperTotal}><span>ราคารวมทั้งงาน</span><strong>{moneyTH(quote.final_price)}</strong><small>ไม่มี VAT</small></div>
    {terms && <section className={styles.paperScope}><h3>เงื่อนไขที่บันทึกเมื่อตอบรับ</h3><dl className={styles.documentFacts}>
      <div><dt>มัดจำขั้นต่ำ</dt><dd>{terms.deposit_required ? moneyTH(terms.deposit_amount) : "ไม่ต้องวางมัดจำ"}</dd></div><div><dt>ใบสั่งซื้อ PO</dt><dd>{terms.po_required ? "ต้องส่ง" : "ไม่ต้องส่ง"}</dd></div>
      <div><dt>ตอบรับเมื่อ</dt><dd>{dateTH(terms.accepted_at)}</dd></div><div><dt>ส่งหลักฐานภายใน</dt><dd>{dateTH(terms.documents_due_at)}</dd></div>
    </dl></section>}
    <footer className={styles.paperFooter}>เอกสารแสดงจากข้อมูลในระบบ · การพิมพ์ไม่ได้เปลี่ยนสถานะหรือเป็นหลักฐานการชำระเงิน</footer>
  </article>;
}

export function QuotationPrint({ ready, children }: { ready: boolean; children: ReactNode }) {
  const params = useSearchParams(); const path = usePathname(); const router = useRouter();
  const [requested, setRequested] = useState(() => params.get("print") === "1"); const [printing, setPrinting] = useState(false);
  const root = useRef<HTMLSpanElement>(null); const [font, setFont] = useState<string>();
  useEffect(() => {
    if (!requested || !ready) return;
    const timer = window.setTimeout(() => { setFont(root.current ? getComputedStyle(root.current).fontFamily : undefined); setPrinting(true); setRequested(false); if (params.has("print")) { const next = new URLSearchParams(params); next.delete("print"); router.replace(`${path}?${next}`, { scroll: false }); } }, 0);
    return () => clearTimeout(timer);
  }, [requested, ready, params, path, router]);
  useEffect(() => {
    if (!printing) return;
    let canceled = false; let frame = 0;
    const finish = () => setPrinting(false); window.addEventListener("afterprint", finish);
    void document.fonts.ready.then(() => { if (!canceled) frame = requestAnimationFrame(() => { if (!canceled) window.print(); }); });
    return () => { canceled = true; cancelAnimationFrame(frame); window.removeEventListener("afterprint", finish); };
  }, [printing]);
  return <><span ref={root} className={styles.fileAction}><button type="button" disabled={!ready || printing || requested} onClick={() => { setFont(root.current ? getComputedStyle(root.current).fontFamily : undefined); setPrinting(true); }}>พิมพ์ / บันทึกเป็น PDF</button></span>
    {!ready && <small>โหลดผู้สั่งและเงื่อนไขที่บันทึกให้ครบก่อนพิมพ์</small>}
    {printing && createPortal(<div className={styles.printRoot} style={{ fontFamily: font }}>{children}</div>, document.body)}
  </>;
}
