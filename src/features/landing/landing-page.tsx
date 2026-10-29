import Link from "next/link";
import { Noto_Sans_Thai } from "next/font/google";
import { SettingsToggle } from "../../components/appearance/appearance";
import { Logo } from "../../components/appearance/icons";

import { Hero } from "./landing-hero";
import { sectionLinks } from "./landing-nav";
import { LandingMotion } from "./landing-motion";
import { Contact, Faq, FaqJsonLd, Gallery, Materials, Process, Reasons, Services } from "./landing-sections";
import { shop } from "./landing-content";
import styles from "./landing.module.css";

const thai = Noto_Sans_Thai({ subsets: ["thai", "latin"], display: "swap", variable: "--font-landing-thai" });

export default function LandingPage() {
  return <main className={`cinematic-page ${styles.scope} ${thai.variable}`} lang="th">
    <div className="landing-progress" aria-hidden="true" />
    {/* Compact bar shown after the hero; hidden from keyboard and AT until it appears. */}
    <header className="landing-sticky">
      <Link href="/" className="cinematic-brand" aria-label="หน้าหลัก Lathe Shop Control"><Logo /></Link>
      <nav aria-label="ไปยังหัวข้อ">{sectionLinks.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
      <Link href="/register" className="landing-sticky-cta">ขอใบเสนอราคา <span aria-hidden="true">↗</span></Link>
    </header>
    <Hero />
    <Services />
    <Materials />
    <Gallery />
    <Reasons />
    <Process />
    <Faq />
    <Contact />
    <footer className="cinematic-footer">
      <Link href="/" aria-label="หน้าหลัก Lathe Shop Control"><Logo /></Link>
      <p>{shop.name} · {shop.address}</p>
      <div><SettingsToggle /><Link href="/register">ขอใบเสนอราคา <span aria-hidden="true">↗</span></Link></div>
    </footer>
    <FaqJsonLd />
    <LandingMotion />
  </main>;
}
