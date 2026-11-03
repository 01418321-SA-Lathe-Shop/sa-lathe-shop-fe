import type { ReactNode } from "react";
import type { Fulfillment, JobRequest, Quotation, Terms } from "../../lib/api/backend-api";
import type { Invoice } from "../delivery/delivery-domain";
import type { SupplierOrder } from "../procurement/procurement-domain";
import { orderTabOf } from "../procurement/procurement-domain";
import { bahtTH, quantityTH } from "../../components/staff-ui/staff-format";
import { ORDER_STATE } from "../../components/staff-ui/staff-labels";
import { quotePreview } from "../customer/customer-request-domain";
import { bahtText, jobRef, longDateTH, type Party, type ShopParty } from "./documents-domain";
import styles from "./documents.module.css";

// Printed documents show only explicit, customer-safe fields. Never spread a
// quotation DTO here: staff DTOs can carry internal_costs. Missing facts print
// as dotted fill-in lines, never as guessed values.
export const Fill = ({ value, width }: { value?: ReactNode; width?: string }) => value ? <>{value}</> : <span className={styles.blank} style={width ? { minWidth: width } : undefined} />;
export const qtyTH = (value: string | number) => new Intl.NumberFormat("th-TH").format(BigInt(value));
const typeTH = (type?: string) => type === "company" ? "นิติบุคคล (บริษัท)" : type === "individual" ? "บุคคลธรรมดา" : undefined;

function Letterhead({ shop, title, english, meta }: { shop: ShopParty; title: string; english: string; meta: [string, ReactNode][] }) {
  return <header className={styles.letterhead}>
    <div><p className={styles.shopName}><Fill value={shop.name} width="70mm" /></p>
      {shop.address && <p className={`${styles.muted} ${styles.preserve}`}>ที่อยู่ {shop.address}</p>}
      <Joined className={styles.muted} parts={[shop.phone && `โทรศัพท์ ${shop.phone}`, shop.email && `อีเมล ${shop.email}`, shop.taxId && `เลขประจำตัวผู้เสียภาษี ${shop.taxId}`]} /></div>
    <div className={styles.docTitle}><h1>{title}</h1><p>{english}</p>
      <dl className={styles.meta}>{meta.map(([label, value]) => <Row key={label} label={label} value={value} />)}</dl></div>
  </header>;
}
const Row = ({ label, value }: { label: ReactNode; value: ReactNode }) => <><dt>{label}</dt><dd>{value}</dd></>;
// Saved-detail rows are hidden when empty (owner decision 2026-11-03); contract party clauses keep fill-in lines.
const Saved = ({ label, value }: { label: ReactNode; value?: string }) => value ? <Row label={label} value={value} /> : null;
const Joined = ({ className, parts }: { className?: string; parts: (string | false | undefined)[] }) => { const text = parts.filter(Boolean).join(" · "); return text ? <p className={className}>{text}</p> : null; };
export function Signature({ role, name, date }: { role: ReactNode; name?: string; date?: string }) {
  return <div className={styles.signature}><span className={styles.signRow}>ลงชื่อ<span className={styles.signLine} /></span><span>( <Fill value={name} width="50mm" /> )</span><span>{role}</span><span>วันที่ <Fill value={longDateTH(date)} width="35mm" /></span></div>;
}

/** Quotation layout: title block, customer details, one whole-job line, totals without VAT, payment channel and shop footer. */
export function QuotationDocument({ request, quote, terms, shop, customer, customerType }: { request: JobRequest; quote: Quotation; terms?: Terms; shop: ShopParty; customer: Party; customerType?: string }) {
  const type = terms?.customer_type ?? customerType;
  const preview = !terms && type ? quotePreview(quote.final_price, type) : undefined;
  const words = bahtText(quote.final_price);
  return <article className={`${styles.sheet} ${styles.quote}`} aria-label={`ใบเสนอราคา #${quote.quotation_no}`}>
    <header className={styles.quoteHead}>
      <div><p className={styles.shopName}>{shop.name}</p>
        {shop.address && <p className={`${styles.muted} ${styles.preserve}`}>ที่อยู่ {shop.address}</p>}
        <Joined className={styles.muted} parts={[shop.phone && `โทรศัพท์ ${shop.phone}`, shop.email]} />
        {shop.taxId && <p className={styles.muted}>เลขประจำตัวผู้เสียภาษี {shop.taxId}</p>}</div>
      <div className={styles.quoteTitle}><h1>ใบเสนอราคา</h1><p className={styles.english}>Quotation</p><p>เลขที่ใบเสนอราคา : #{quote.quotation_no} ฉบับที่ {quote.version}</p></div>
    </header>
    <section aria-label="ข้อมูลลูกค้า">
      <h2>ข้อมูลลูกค้า</h2>
      <dl className={styles.colon}>
        <Row label="วันที่" value={<Fill value={longDateTH(quote.sent_at)} width="40mm" />} />
        {quote.valid_until && <Row label="ยืนราคาถึง" value={longDateTH(quote.valid_until)} />}
        <Row label="ชื่อลูกค้า" value={<><Fill value={customer.name} width="70mm" />{type && <> · {typeTH(type)}</>}</>} />
        <Saved label="เลขประจำตัวผู้เสียภาษี" value={customer.taxId} />
        {customer.address && <Row label="ที่อยู่" value={<span className={styles.preserve}>{customer.address}</span>} />}
        <Saved label="เบอร์ติดต่อ" value={customer.phone} />
        <Saved label="อีเมล" value={customer.email} />
        <Row label="อ้างอิงคำขอ" value={`#${request.no_request}${request.deadline ? ` · ลูกค้าต้องการ ${longDateTH(request.deadline)} (ไม่ใช่กำหนดส่งที่ร้านยืนยัน)` : ""}`} />
      </dl>
    </section>
    <table className={`${styles.items} ${styles.open}`}><thead><tr><th scope="col">ลำดับ</th><th scope="col">รายละเอียดงาน</th><th scope="col" data-numeric>จำนวน</th><th scope="col" data-numeric>ราคา/หน่วย</th><th scope="col" data-numeric>ราคารวม</th></tr></thead>
      <tbody><tr><td>1</td><td><p className={styles.preserve}>{request.description}</p><p className={styles.muted}>วัตถุดิบ: {request.material_spec || "ไม่ระบุ"}</p></td><td data-numeric>{qtyTH(request.qty)} ชิ้น</td><td data-numeric>—</td><td data-numeric>{bahtTH(quote.final_price)}</td></tr></tbody></table>
    <dl className={styles.totals}><dt>ราคารวม</dt><dd>{bahtTH(quote.final_price)}</dd><dt className={styles.grand}>ราคารวมทั้งหมด</dt><dd className={styles.grand}>{bahtTH(quote.final_price)}</dd></dl>
    {words && <p className={styles.words}>({words})</p>}
    <h2>หมายเหตุและเงื่อนไข</h2>
    <ol className={styles.terms}>
      {quote.notes && <li className={styles.preserve}>{quote.notes}</li>}
      <li>ราคาเป็นราคารวมทั้งงานสำหรับจำนวนข้างต้น ไม่ได้กำหนดราคาต่อหน่วย และไม่ได้คิดภาษีมูลค่าเพิ่ม (VAT)</li>
      {terms ? <>
        <li>ตอบรับในระบบเมื่อ {longDateTH(terms.accepted_at)} · {terms.deposit_required ? `มัดจำไม่น้อยกว่า ${bahtTH(terms.deposit_amount)} ยอดคงเหลือหลังมัดจำขั้นต่ำ ${bahtTH(terms.balance_after_deposit)}` : "ไม่ต้องวางมัดจำ"}{terms.po_required ? " · ต้องส่งใบสั่งซื้อ (PO)" : ""}</li>
        <li>ส่งหลักฐาน {[terms.deposit_required && "มัดจำ", terms.po_required && "PO"].filter(Boolean).join(" และ ")} ภายใน {longDateTH(terms.documents_due_at)} (14 วันหลังตอบรับ) หากไม่ครบตามกำหนด คำขอจะถูกยกเลิก</li>
      </> : <>
        {preview && <li>{preview.deposit ? `ต้องวางมัดจำไม่น้อยกว่า ${bahtTH(preview.minimum)} (50% ของราคา)` : "ไม่ต้องวางมัดจำ"}{preview.po ? " · ต้องส่งใบสั่งซื้อ (PO)" : ""}</li>}
        <li>เมื่อตอบรับแล้ว ต้องส่งหลักฐานมัดจำ/PO ที่กำหนดภายใน 14 วัน หากไม่ครบตามกำหนด คำขอจะถูกยกเลิก</li>
      </>}
      <li>ร้านเริ่มผลิตเมื่อหลักฐานที่กำหนดผ่านการตรวจครบ ยอดคงเหลือชำระตามใบแจ้งหนี้ที่ร้านออก</li>
    </ol>
    <div className={styles.payRow}>
      <section>{(shop.bankAccountName || shop.bankAccountNo || shop.bankName) && <><h2>ช่องทางการชำระเงิน</h2>
        <dl className={styles.colon}><Saved label="ชื่อบัญชี" value={shop.bankAccountName} /><Saved label="เลขที่บัญชี" value={shop.bankAccountNo} /><Saved label="ธนาคาร" value={shop.bankName} /></dl></>}</section>
      <Signature role="ผู้เสนอราคา" date={quote.sent_at} />
    </div>
  </article>;
}

export function PurchaseOrderDocument({ order, shop }: { order: SupplierOrder; shop: ShopParty }) {
  const lines = order.lines ?? []; const jobs = order.job_ids ?? []; const tab = orderTabOf(order);
  return <article className={styles.sheet} aria-label={`ใบสั่งซื้อวัสดุ ${order.order_no}`}>
    <Letterhead shop={shop} title="ใบสั่งซื้อวัสดุ" english="MATERIAL PURCHASE ORDER" meta={[["เลขที่", order.order_no], ["วันที่", longDateTH(order.created_at) ?? "—"], ["สถานะ", tab ? ORDER_STATE[tab][0] : order.status]]} />
    <div className={styles.parties}>
      <section className={styles.party}><h2>ผู้ขาย (Supplier)</h2><p><strong>{order.supplier.name}</strong></p>{order.supplier.phone && <p>โทรศัพท์ {order.supplier.phone}</p>}{order.supplier.email && <p>อีเมล {order.supplier.email}</p>}<p>ที่อยู่ <span className={styles.blank} style={{ minWidth: "65mm" }} /></p></section>
      <section className={styles.party}><h2>การส่งมอบและอ้างอิง</h2><p>กำหนดรับของ <Fill value={longDateTH(order.expected_at)} width="35mm" /></p><p>สถานที่ส่งของ <Fill value={shop.address} width="50mm" /></p><p>อ้างอิงงาน {jobs.length ? jobs.map(jobRef).join(", ") : "สั่งเติมสต๊อกทั่วไป ไม่ผูกกับงาน"}</p></section>
    </div>
    <table className={styles.items}><thead><tr><th scope="col">ลำดับ</th><th scope="col">รายการวัตถุดิบ</th><th scope="col" data-numeric>จำนวน</th><th scope="col">หน่วย</th><th scope="col" data-numeric>ราคาต่อหน่วย (บาท)</th><th scope="col" data-numeric>จำนวนเงิน</th></tr></thead>
      <tbody>{lines.map((line, index) => <tr key={line.material_id}><td>{index + 1}</td><td>{line.material_name}</td><td data-numeric>{quantityTH(line.quantity)}</td><td>{line.unit_name}</td><td data-numeric>{quantityTH(line.unit_cost)}</td><td data-numeric>{bahtTH(line.total_amount)}</td></tr>)}</tbody></table>
    <dl className={styles.totals}><dt className={styles.grand}>ยอดรวมทั้งสิ้น</dt><dd className={styles.grand}>{bahtTH(order.total_amount)}</dd></dl>
    <h2>เงื่อนไข</h2>
    <ol className={styles.terms}>
      <li>จำนวนเงินแต่ละรายการปัดครึ่งขึ้นเป็นทศนิยมสองตำแหน่งก่อนรวม ไม่ได้คิดภาษีมูลค่าเพิ่ม (VAT)</li>
      <li>รับของได้หลายครั้งจนครบจำนวน แต่ไม่รับเกินจำนวนที่สั่ง ของชำรุดให้เปลี่ยนเป็นของดีเท่านั้น</li>
      <li>ระยะเวลาเครดิตและการชำระเงินแก่ผู้ขาย: <span className={styles.blank} /></li>
    </ol>
    <div className={styles.signatures}><Signature role="ผู้มีอำนาจอนุมัติการสั่งซื้อ" date={order.created_at} /><Signature role="ผู้ขาย (ยืนยันรับคำสั่งซื้อ)" /></div>
  </article>;
}

type Job = NonNullable<Fulfillment["job"]>;
// Formal Thai hire-of-work contract assembled only from recorded data and
// confirmed business rules. Wording needs legal review before real use.
export function JobContractDocument({ request, quote, terms, job, shop, customer, invoice, creditDays }: { request: JobRequest; quote: Quotation; terms: Terms; job: Job; shop: ShopParty; customer: Party; invoice?: Invoice; creditDays?: number }) {
  const company = terms.customer_type === "company"; const ref = `JOB-${jobRef(job.id)}`;
  return <article className={styles.sheet} aria-label={`สัญญาจ้างทำของ ${ref}`}>
    <Letterhead shop={shop} title="สัญญาจ้างทำของ" english="JOB CONTRACT" meta={[["เลขที่สัญญา", ref], ["ใบเสนอราคา", `#${quote.quotation_no} ฉบับที่ ${quote.version}`], ["คำขอผลิต", `#${request.no_request}`], ["วันที่เปิดงาน", longDateTH(job.created_at) ?? "—"]]} />
    <div className={styles.contractTitle}><h1>สัญญาจ้างผลิตชิ้นงานกลึงตามสั่ง</h1><p>ทำที่ <span className={styles.blank} /> วันที่ <span className={styles.blank} style={{ minWidth: "35mm" }} /></p></div>
    <p className={styles.indent} style={{ marginTop: "4mm" }}>สัญญาฉบับนี้ทำขึ้นระหว่าง <strong><Fill value={shop.name} width="50mm" /></strong> สำนักงานตั้งอยู่เลขที่ <Fill value={shop.address} width="70mm" /> โทรศัพท์ <Fill value={shop.phone} width="30mm" /> เลขประจำตัวผู้เสียภาษี <Fill value={shop.taxId} /> ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้รับจ้าง” ฝ่ายหนึ่ง กับ</p>
    <p className={styles.indent}><strong><Fill value={customer.name} width="60mm" /></strong> {typeTH(terms.customer_type)} {company ? <>โดย <span className={styles.blank} /> ผู้มีอำนาจลงนามผูกพันนิติบุคคล สำนักงานตั้งอยู่เลขที่ <Fill value={customer.address} width="70mm" /> เลขทะเบียนนิติบุคคล/เลขประจำตัวผู้เสียภาษี <Fill value={customer.taxId} /></> : <>เลขประจำตัวประชาชน/เลขประจำตัวผู้เสียภาษี <Fill value={customer.taxId} /> อยู่บ้านเลขที่ <Fill value={customer.address} width="70mm" /></>} โทรศัพท์ <Fill value={customer.phone} width="30mm" /> ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้ว่าจ้าง” อีกฝ่ายหนึ่ง</p>
    <p className={styles.indent}>คู่สัญญาทั้งสองฝ่ายได้ตกลงกันโดยมีข้อความดังต่อไปนี้</p>
    <ol className={styles.clauses}>
      <li><h2>ขอบเขตของงาน</h2><p className={styles.indent}>ผู้ว่าจ้างตกลงจ้างและผู้รับจ้างตกลงรับจ้างผลิตชิ้นงานตามรายละเอียดด้านล่าง ตามใบเสนอราคาเลขที่ #{quote.quotation_no} ฉบับที่ {quote.version} ซึ่งผู้ว่าจ้างได้ตอบรับเมื่อวันที่ {longDateTH(terms.accepted_at)} และให้ถือว่าใบเสนอราคาดังกล่าวเป็นส่วนหนึ่งของสัญญานี้</p>
        <table className={styles.items}><thead><tr><th scope="col">รายละเอียดชิ้นงาน</th><th scope="col">ข้อกำหนดวัตถุดิบ</th><th scope="col" data-numeric>จำนวน</th></tr></thead>
          <tbody><tr><td className={styles.preserve}>{request.description}</td><td>{request.material_spec || "ไม่ระบุ"}</td><td data-numeric>{qtyTH(request.qty)} ชิ้น</td></tr></tbody></table></li>
      <li><h2>ค่าจ้าง</h2><p className={styles.indent}>ผู้ว่าจ้างตกลงชำระค่าจ้างรวมทั้งงานเป็นเงิน {bahtTH(terms.final_price)} ซึ่งเป็นราคารวมทั้งงานตามใบเสนอราคา ไม่ใช่ราคาต่อชิ้น และไม่ได้คิดภาษีมูลค่าเพิ่ม</p></li>
      <li><h2>การชำระเงิน</h2><ol>
        <li>{terms.deposit_required ? <>ผู้ว่าจ้างต้องชำระเงินมัดจำไม่น้อยกว่า {bahtTH(terms.deposit_amount)}</> : "งานนี้ไม่ต้องวางเงินมัดจำ"}{terms.po_required && " และต้องส่งใบสั่งซื้อ (PO)"} โดยส่งหลักฐานภายในวันที่ {longDateTH(terms.documents_due_at)}</li>
        <li>เงินมัดจำที่ผู้รับจ้างตรวจอนุมัติแล้วเป็นเงิน {bahtTH(job.deposit_amount)} ค่าจ้างคงเหลือเป็นเงิน {bahtTH(job.balance)}</li>
        <li>ผู้รับจ้างจะออกใบแจ้งหนี้สำหรับค่าจ้างคงเหลือหนึ่งฉบับ{invoice ? <> เลขที่ {invoice.number} ลงวันที่ {longDateTH(invoice.issued_at)} ครบกำหนดชำระวันที่ {longDateTH(invoice.due_at)}</> : <> ผู้ว่าจ้างต้องชำระภายใน <Fill value={creditDays === undefined ? undefined : String(creditDays)} width="15mm" /> วันนับจากวันที่ออกใบแจ้งหนี้</>} โดยชำระครั้งเดียวหรือแบ่งชำระหลายงวดจนครบยอด</li>
      </ol></li>
      <li><h2>การส่งมอบงาน</h2><p className={styles.indent}>ผู้รับจ้างจะส่งมอบชิ้นงานทั้งหมดในคราวเดียวภายในวันที่ <span className={styles.blank} style={{ minWidth: "35mm" }} /> ณ สถานที่ <span className={styles.blank} style={{ minWidth: "60mm" }} /> โดยผู้รับจ้างจัดส่งเอง ผู้ว่าจ้างมารับเอง หรือผ่านผู้ให้บริการขนส่งภายนอก {request.deadline && <>ทั้งนี้ ผู้ว่าจ้างแจ้งวันที่ต้องการไว้เป็นวันที่ {longDateTH(request.deadline)} ซึ่งไม่ใช่กำหนดส่งที่ผู้รับจ้างยืนยัน</>}</p></li>
      <li><h2>การตรวจรับและการแก้ไขงาน</h2><p className={styles.indent}>เมื่อได้รับมอบชิ้นงาน ผู้ว่าจ้างจะตรวจรับงาน หากชิ้นงานไม่เป็นไปตามข้อ 1 ผู้ว่าจ้างอาจส่งคืนพร้อมแจ้งเหตุผลก่อนตรวจรับ และผู้รับจ้างจะแก้ไขงานโดยไม่คิดค่าใช้จ่ายเพิ่มและไม่เปลี่ยนแปลงค่าจ้างตามข้อ 2 เมื่อผู้ว่าจ้างตรวจรับงานแล้ว ให้ถือว่าการตรวจรับนั้นเป็นที่สุด</p></li>
      <li><h2>หน้าที่ของคู่สัญญา</h2><ol>
        <li>ผู้รับจ้างมีหน้าที่ผลิตชิ้นงานตามข้อ 1 ส่งมอบตามข้อ 4 แก้ไขงานตามข้อ 5 และออกใบแจ้งหนี้ตามข้อ 3</li>
        <li>ผู้ว่าจ้างมีหน้าที่ชำระเงินตามข้อ 3 และตรวจรับงานตามข้อ 5</li>
      </ol></li>
      <li><h2>ข้อตกลงเพิ่มเติม (ถ้ามี)</h2><span className={styles.blankLine} /><span className={styles.blankLine} /><span className={styles.blankLine} /></li>
    </ol>
    <p className={styles.indent} style={{ marginTop: "5mm" }}>สัญญานี้ทำขึ้นเป็นสองฉบับมีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญานี้โดยละเอียดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน และต่างยึดถือไว้ฝ่ายละหนึ่งฉบับ</p>
    <div className={styles.signatures}>
      <Signature role="ผู้ว่าจ้าง" name={company ? undefined : customer.name} /><Signature role="ผู้รับจ้าง" />
      <Signature role="พยาน" /><Signature role="พยาน" />
    </div>
  </article>;
}
