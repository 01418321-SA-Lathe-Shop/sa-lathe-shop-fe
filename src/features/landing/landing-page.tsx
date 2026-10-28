import Link from "next/link";
import { Noto_Sans_Thai } from "next/font/google";
import { SettingsToggle } from "../../components/appearance/appearance";
import { Logo } from "../../components/appearance/icons";

import { Hero } from "./landing-hero";
import styles from "./landing.module.css";

const thai = Noto_Sans_Thai({ subsets: ["thai", "latin"], display: "swap", variable: "--font-landing-thai" });

import { workflow } from './landing-content';

export default function LandingPage() {
  return <main className={`cinematic-page ${styles.scope} ${thai.variable}`} lang="th">
    <Hero />
    <section className="cinematic-process" id="workflow" aria-labelledby="process-title">
      <div className="cinematic-section-heading"><h2 id="process-title">ทุกขั้นตอน<br />เชื่อมถึงกัน</h2><p>พื้นที่เดียวสำหรับทีมงาน วัตถุดิบ และข้อมูลที่ช่วยให้งานสั่งผลิตเดินหน้าต่อได้</p></div>
      <ol className="cinematic-process-list">{workflow.map((step, index) => <li key={step.title}><span className="cinematic-step-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
    </section>
    <section className="cinematic-platform" id="capabilities" aria-labelledby="platform-title">
      <h2 id="platform-title">ทั้งโรงกลึง<br />ในระบบเดียว</h2>
      <div className="cinematic-capabilities">
        <article><h3>มองเห็นทุกความคืบหน้า</h3><p>ติดตามงานผลิต บันทึกการใช้วัตถุดิบและเวลาทำงานจริง พร้อมเก็บภาพการผลิตไว้กับแต่ละงาน</p><span>จากแผนงานสู่ชิ้นงานสำเร็จ</span></article>
        <article id="materials"><h3>จัดการวัตถุดิบได้ครบถ้วน</h3><p>ค้นหาสต็อก ดูจำนวนพร้อมใช้และยอดจอง เชื่อมใบสั่งซื้อกับการรับวัตถุดิบและการเคลม</p><span>จากคลังวัตถุดิบสู่หน้างาน</span></article>
        <article><h3>ติดตามการชำระเงินได้ชัดเจน</h3><p>รวมเงื่อนไขใบเสนอราคา เงินมัดจำ ใบแจ้งหนี้ หลักฐานการชำระ และยอดคงค้างไว้กับแต่ละงาน</p><span>จากใบเสนอราคาจนรับชำระ</span></article>
      </div>
    </section>
    <footer className="cinematic-footer"><Link href="/" aria-label="หน้าหลัก Lathe Shop Control"><Logo /></Link><p>งานสั่งผลิต เชื่อมต่อครบในระบบเดียว</p><div><SettingsToggle /><Link href="/register">เริ่มสั่งผลิต <span aria-hidden="true">↗</span></Link></div></footer>
  </main>;
}
