import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { depositRules, faqs, gallery, materials, orderFacts, reasons, services, shop, steps } from "./landing-content";
import { ServiceIcon } from "./landing-icons";
import { MapFacade } from "./landing-map";

/** Stagger index for scroll reveals; landing-motion.tsx adds the visible state. */
const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

function Heading({ id, eyebrow, title, text }: { id: string; eyebrow: string; title: React.ReactNode; text?: string }) {
  return <div className="landing-heading" data-reveal>
    <p className="landing-eyebrow">{eyebrow}</p>
    <h2 id={id}>{title}</h2>
    {text && <p className="landing-lead">{text}</p>}
  </div>;
}

export function Services() {
  return <section className="landing-section" id="services" aria-labelledby="services-title">
    <Heading id="services-title" eyebrow="บริการ" title="เรารับงานอะไรบ้าง" text="งานโลหะและพลาสติกวิศวกรรมตามแบบของคุณ จะสั่งไม่กี่ชิ้นหรือทำเป็นล็อตก็ได้" />
    <ul className="landing-services">
      {services.map((service, i) => <li key={service.title} data-reveal style={stagger(i)}>
        <span className="landing-service-icon"><ServiceIcon name={service.icon} /></span>
        <h3>{service.title}</h3><p>{service.text}</p>
      </li>)}
    </ul>
  </section>;
}

export function Materials() {
  return <section className="landing-section landing-materials" id="materials" aria-labelledby="materials-title">
    <Heading id="materials-title" eyebrow="วัสดุ" title="วัสดุที่เรารับงาน" text="บอกวัสดุที่ต้องการมาในคำขอได้เลย ถ้ายังไม่แน่ใจ ให้เราช่วยแนะนำตามลักษณะการใช้งานก็ได้" />
    <div className="landing-table-wrap" data-reveal style={stagger(1)}>
      <table className="landing-table">
        <caption className="cinematic-sr-only">กลุ่มวัสดุที่รับงาน</caption>
        <thead><tr><th scope="col">กลุ่มวัสดุ</th><th scope="col">ตัวอย่างเกรด</th><th scope="col">หมายเหตุ</th></tr></thead>
        <tbody>{materials.map(m => <tr key={m.group}><th scope="row">{m.group}</th><td>{m.examples}</td><td>{m.note}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export function Gallery() {
  return <section className="landing-section" id="work" aria-labelledby="work-title">
    <Heading id="work-title" eyebrow="ผลงาน" title="ตัวอย่างงานที่เคยทำ" />
    <ul className="landing-gallery">
      {gallery.map((item, i) => <li key={item.title} data-reveal style={stagger(i)}>
        <figure>
          <div className="landing-gallery-media">
            {item.image
              ? <Image src={item.image} alt={item.alt ?? item.title} fill sizes={i === 0 ? "(max-width: 767px) 100vw, 50vw" : "(max-width: 767px) 100vw, 25vw"} />
              : <span className="landing-gallery-placeholder" aria-hidden="true">รูปผลงาน {i + 1}</span>}
          </div>
          <figcaption><strong>{item.title}</strong><span>{item.detail}</span></figcaption>
        </figure>
      </li>)}
    </ul>
  </section>;
}

export function Reasons() {
  return <section className="landing-section landing-why" id="why" aria-labelledby="why-title">
    <div className="landing-why-statement" data-reveal>
      <p className="landing-eyebrow">ทำไมต้องเรา</p>
      <h2 id="why-title">งานเนี้ยบ ส่งตรงเวลา<br />คุยกันง่าย</h2>
      <Link href="/register" className="landing-text-link">ส่งแบบมาให้เราดู <span aria-hidden="true">↗</span></Link>
    </div>
    <ol className="landing-reasons">
      {reasons.map((reason, i) => <li key={reason.title} data-reveal style={stagger(i)}>
        <span className="landing-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
        <div><h3>{reason.title}</h3><p>{reason.text}</p></div>
      </li>)}
    </ol>
  </section>;
}

export function Process() {
  return <section className="landing-section" id="process" aria-labelledby="process-title">
    <Heading id="process-title" eyebrow="ขั้นตอน" title="สั่งงานง่าย ๆ ใน 5 ขั้นตอน" text="ทุกอย่างทำผ่านระบบออนไลน์ คุณเห็นสถานะงานเดียวกับที่ร้านเห็น" />
    <ol className="landing-steps" data-reveal>
      {steps.map((step, i) => <li key={step.title} style={stagger(i)}>
        <span className="landing-step-dot" aria-hidden="true">{i + 1}</span>
        <h3>{step.title}</h3><p>{step.text}</p>
      </li>)}
    </ol>
    <div className="landing-terms">
      <div className="landing-rules" data-reveal>
        <h3>ต้องวางมัดจำหรือส่ง PO ไหม?</h3>
        <table className="landing-table">
          <caption className="cinematic-sr-only">เงื่อนไขมัดจำและใบสั่งซื้อตามประเภทลูกค้า</caption>
          <thead><tr><th scope="col">ลูกค้า</th><th scope="col">สิ่งที่ต้องส่ง</th></tr></thead>
          <tbody>{depositRules.map(r => <tr key={r.customer}><th scope="row">{r.customer}</th><td>{r.rule}</td></tr>)}</tbody>
        </table>
        <p>อยากวางมัดจำมากกว่า 50% ก็ได้ สูงสุดเต็มจำนวน</p>
      </div>
      <div className="landing-facts" data-reveal style={stagger(1)}>
        <h3>เรื่องที่ควรรู้ก่อนสั่งงาน</h3>
        <dl>{orderFacts.map(fact => <div key={fact.figure}><dt>{fact.figure}</dt><dd>{fact.text}</dd></div>)}</dl>
      </div>
    </div>
  </section>;
}

export function Faq() {
  return <section className="landing-section landing-faq" id="faq" aria-labelledby="faq-title">
    <Heading id="faq-title" eyebrow="คำถามที่พบบ่อย" title={<>สงสัยตรงไหน<br />ถามได้เลย</>} text="หาคำตอบไม่เจอ ทักมาคุยกับเราได้ตามช่องทางด้านล่าง" />
    <div className="landing-faq-list">
      {faqs.map((faq, i) => <details key={faq.q} name="landing-faq" data-reveal style={stagger(i % 4)}>
        <summary><span>{faq.q}</span><span className="landing-faq-mark" aria-hidden="true" /></summary>
        <p>{faq.a}</p>
      </details>)}
    </div>
  </section>;
}

export function Contact() {
  const channels = [
    { label: "โทร", value: shop.phone.label, href: shop.phone.href },
    { label: "LINE", value: shop.line.label, href: shop.line.href },
    { label: "อีเมล", value: shop.email.label, href: shop.email.href },
  ];
  return <section className="landing-section landing-contact" id="contact" aria-labelledby="contact-title">
    <div className="landing-cta" data-reveal>
      <p className="landing-eyebrow">เริ่มงานกับเรา</p>
      <h2 id="contact-title">ส่งแบบมา<br />เดี๋ยวเราตีราคาให้</h2>
      <p>สมัครสมาชิกแล้วส่งคำขอพร้อมแบบงานได้เลย เราจะดูรายละเอียดแล้วออกใบเสนอราคาให้ในระบบ</p>
      <div className="landing-cta-actions">
        <Link href="/register" className="cinematic-primary">ขอใบเสนอราคา <span aria-hidden="true">↗</span></Link>
        <Link href="/login" className="landing-text-link">มีบัญชีแล้ว? เข้าสู่ระบบ</Link>
      </div>
    </div>
    <div className="landing-contact-card" data-reveal style={stagger(1)}>
      <h3>{shop.name}</h3>
      <dl>
        {channels.map(c => <div key={c.label}><dt>{c.label}</dt><dd>{c.href ? <a href={c.href}>{c.value}</a> : c.value}</dd></div>)}
        <div><dt>ที่อยู่</dt><dd>{shop.address}</dd></div>
        <div><dt>เวลาเปิดทำการ</dt><dd>{shop.hours.map(h => <span key={h.days}>{h.days} {h.time}</span>)}</dd></div>
      </dl>
      <MapFacade embedUrl={shop.mapEmbedUrl} address={shop.address} />
      {shop.mapLink && <a className="landing-text-link" href={shop.mapLink} target="_blank" rel="noopener noreferrer">เปิดใน Google Maps <span aria-hidden="true">↗</span></a>}
    </div>
  </section>;
}

/** FAQPage structured data from the same array; answers still holding [placeholders] are withheld from search engines. */
export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.filter(f => !f.a.includes("[")).map(f =>({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
