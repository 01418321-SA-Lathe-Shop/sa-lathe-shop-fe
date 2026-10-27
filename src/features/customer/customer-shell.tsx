"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Noto_Sans_Thai } from "next/font/google";
import { useRef, useSyncExternalStore, type ReactNode } from "react";
import type { ApiSession } from "../auth/api-session";
import { Icon, Logo } from "../../components/appearance/icons";
import { subscribeAppearance } from "../../components/appearance/appearance-preferences";
import { getCustomerTheme, getServerCustomerTheme } from "./customer-preferences";
import { NotificationBell } from "./customer-notifications";
import { CustomerContent } from "./customer-content";
import styles from "./customer.module.css";

const thai = Noto_Sans_Thai({ subsets: ["thai", "latin"], display: "swap", variable: "--font-customer-thai" });
const orders = [["/customer/requests", "คำขอผลิต"], ["/customer/jobs", "งานผลิต"], ["/customer/jobs?view=history", "ประวัติ"]];
const documents = [["/customer/quotations", "ใบเสนอราคา"], ["/customer/deposit-po", "มัดจำและ PO"], ["/customer/payments", "ใบแจ้งหนี้และการชำระเงิน"]];

export default function CustomerShell({ session, mockControls, leave }: { session: ApiSession; mockControls?: ReactNode; leave: () => void }) {
  const pathname = usePathname(); const query = useSearchParams(); const router = useRouter();
  const menu = useRef<HTMLDialogElement>(null); const theme = useSyncExternalStore(subscribeAppearance, getCustomerTheme, getServerCustomerTheme);
  const settings = query.get("view") === "settings";
  function links(items: string[][]) { return items.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href.split("?")[0] && !settings && (href.includes("history") ? query.get("view") === "history" : query.get("view") !== "history") ? "page" : undefined} onClick={(event) => { menu.current?.close(); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{label}</Link>); }
  const content = <CustomerContent api={session.api} account={session.account} />;
  return <div className={`${styles.root} ${thai.variable}`} data-customer-theme={theme}>
    <a className="cust-skip" href="#customer-content">ข้ามไปเนื้อหา</a>
    <header className="cust-navbar"><div className="cust-nav-inner"><Logo onClick={() => router.push("/customer")} /><nav className="cust-desktop-nav" aria-label="เมนูหลัก"><Link href="/customer" aria-current={pathname === "/customer" && !settings ? "page" : undefined}>ภาพรวม</Link><details><summary>งานของฉัน</summary><div>{links(orders)}</div></details><details><summary>เอกสารและการชำระเงิน</summary><div>{links(documents)}</div></details></nav>
      <div className="cust-nav-actions"><NotificationBell api={session.api} beforeOpen={() => menu.current?.close()} /><details className="cust-account-menu"><summary><span className="cust-avatar">{session.account.name.slice(0, 1)}</span><span>{session.account.name}</span></summary><div><Link href="/customer/memberships">บัญชีและบริษัท</Link><Link href="/customer?view=settings">ตั้งค่า</Link><button onClick={leave}>ออกจากระบบ</button></div></details><button className="cust-menu-toggle" aria-label="เปิดเมนู" aria-haspopup="dialog" onClick={() => menu.current?.showModal()}><Icon name="grid" /></button></div>
    </div></header>
    <dialog ref={menu} className="cust-mobile-menu" aria-label="เมนูลูกค้า"><div className="cust-toolbar"><h2>เมนู</h2><button aria-label="ปิดเมนู" onClick={() => menu.current?.close()}><Icon name="close" /></button></div><p>{session.account.name}</p><nav aria-label="เมนูมือถือ">{links([["/customer", "ภาพรวม"]])}<h3>งานของฉัน</h3>{links(orders)}<h3>เอกสารและการชำระเงิน</h3>{links(documents)}<h3>บัญชี</h3>{links([["/customer/memberships", "บัญชีและบริษัท"], ["/customer?view=settings", "ตั้งค่า"]])}<button onClick={leave}>ออกจากระบบ</button></nav></dialog>
    <div className="cust-environment"><span className={`cust-mode ${session.mode}`}>{session.mode === "mock" ? "ข้อมูลตัวอย่าง · ไม่ใช่ข้อมูลจริง" : "เชื่อมต่อข้อมูลจริง · รีโหลดหน้าต้องเข้าสู่ระบบใหม่"}</span>{mockControls}</div>
    <main id="customer-content" className="cust-main" key={`${pathname}:${query.toString()}`}>{content}</main>
    <footer className="cust-footer"><strong>LATHE</strong><span>งานของคุณ ตั้งแต่คำขอจนส่งมอบ</span><span>เวลาไทย · เงินบาท · ไม่มี VAT</span></footer>
  </div>;
}
