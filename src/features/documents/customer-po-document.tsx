import type { CustomerPo, JobRequest, Quotation, Terms } from "../../lib/api/backend-api";
import { bahtTH } from "../../components/staff-ui/staff-format";
import { Fill, qtyTH, Signature } from "./business-documents";
import { bahtText, longDateTH, type Party } from "./documents-domain";
import styles from "./documents.module.css";

const Bi = ({ th, en }: { th: string; en: string }) => <>{th} / <span className={styles.en}>{en}</span></>;
function PartyBlock({ role, party }: { role: [string, string]; party: Party }) {
  return <dl className={styles.poParty}>
    <dt><Bi th={role[0]} en={role[1]} /></dt><dd><strong><Fill value={party.name} width="70mm" /></strong></dd>
    <dt><Bi th="ที่อยู่" en="Address" /></dt><dd className={styles.preserve}><Fill value={party.address} width="80mm" /></dd>
    <dt><Bi th="เลขผู้เสียภาษี" en="Tax ID" /></dt><dd><Fill value={party.taxId} width="40mm" /></dd>
    <dt><Bi th="โทร" en="Tel" /></dt><dd><Fill value={party.phone} width="35mm" />{party.email && <> · E: {party.email}</>}</dd>
  </dl>;
}

/**
 * The customer's own PO to the shop. Payer is the customer, payee is the shop.
 * The amount is always the accepted quotation's final price, never typed.
 */
export function CustomerPurchaseOrderDocument({ po, request, quote, terms, shop, customer }: { po: CustomerPo; request: JobRequest; quote: Quotation; terms: Terms; shop: Party; customer: Party }) {
  const words = bahtText(terms.final_price);
  return <article className={`${styles.sheet} ${styles.po}`} aria-label={`ใบสั่งซื้อ ${po.po_no}`}>
    <header className={styles.poHead}><h1>ใบสั่งซื้อ</h1><p>Purchase Order <span className={styles.en}>( ต้นฉบับ / original )</span></p></header>
    <div className={styles.poTop}>
      <PartyBlock role={["ผู้สั่งซื้อ", "Issuer"]} party={customer} />
      <dl className={styles.poMeta}>
        <dt><Bi th="เลขที่" en="No." /></dt><dd>{po.po_no}</dd>
        <dt><Bi th="วันที่" en="Issue" /></dt><dd>{longDateTH(po.issued_on)}</dd>
        <dt><Bi th="อ้างอิง" en="Ref" /></dt><dd>ใบเสนอราคา #{quote.quotation_no} ฉบับที่ {quote.version}</dd>
      </dl>
    </div>
    <PartyBlock role={["ผู้รับเงิน", "Payee"]} party={shop} />
    <table className={`${styles.items} ${styles.poItems}`}><thead><tr>
      <th scope="col">ลำดับ<br /><span className={styles.en}>No.</span></th><th scope="col">คำอธิบาย<br /><span className={styles.en}>Description</span></th>
      <th scope="col" data-numeric>จำนวน<br /><span className={styles.en}>Quantity</span></th><th scope="col">หน่วย<br /><span className={styles.en}>Unit</span></th>
      <th scope="col" data-numeric>ราคาต่อหน่วย<br /><span className={styles.en}>Unit Price</span></th><th scope="col" data-numeric>จำนวนเงิน<br /><span className={styles.en}>Amount</span></th></tr></thead>
      <tbody><tr><td>1</td><td><p className={styles.preserve}>{request.description}</p><p className={styles.muted}>วัตถุดิบ: {request.material_spec || "ไม่ระบุ"} · คำขอ #{request.no_request}</p></td><td data-numeric>{qtyTH(request.qty)}</td><td>ชิ้น</td><td data-numeric>—</td><td data-numeric>{bahtTH(terms.final_price)}</td></tr></tbody></table>
    <div className={styles.poBottom}>
      <section><h2><Bi th="หมายเหตุ" en="Remarks" /></h2><p className={styles.preserve}>{po.remarks || "-"}</p><p className={styles.muted}>ราคารวมทั้งงานตามใบเสนอราคา ไม่ได้คิดภาษีมูลค่าเพิ่ม (VAT)</p></section>
      <dl className={styles.poTotal}><dt><Bi th="จำนวนเงินรวมทั้งสิ้น (บาท)" en="Grand Total" /></dt><dd>{bahtTH(terms.final_price)}</dd></dl>
    </div>
    {words && <p className={styles.poWords}><span>จำนวนเงินรวมทั้งสิ้น</span><strong>{words}</strong></p>}
    <div className={styles.signatures}><Signature role={<Bi th="อนุมัติโดย" en="Approved by" />} name={customer.name} /><Signature role={<Bi th="ผู้ขายยอมรับ" en="Accepted by" />} /></div>
  </article>;
}
