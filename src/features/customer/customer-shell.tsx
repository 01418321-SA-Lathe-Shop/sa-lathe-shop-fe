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

type NavItem = {
  href: string;
  label: string;
  icon: "grid" | "file" | "machine" | "clock" | "layers" | "wallet" | "inbox" | "sun";
};

const workspaceItems: NavItem[] = [
  { href: "/customer", label: "ภาพรวม", icon: "grid" },
];

const orderItems: NavItem[] = [
  { href: "/customer/requests", label: "คำขอผลิต", icon: "file" },
  { href: "/customer/jobs", label: "งานผลิต", icon: "machine" },
  { href: "/customer/jobs?view=history", label: "ประวัติ", icon: "clock" },
];

const documentItems: NavItem[] = [
  { href: "/customer/quotations", label: "ใบเสนอราคา", icon: "layers" },
  { href: "/customer/deposit-po", label: "มัดจำและ PO", icon: "wallet" },
  { href: "/customer/payments", label: "ใบแจ้งหนี้และการชำระเงิน", icon: "wallet" },
];

const accountItems: NavItem[] = [
  { href: "/customer/memberships", label: "บัญชีและบริษัท", icon: "inbox" },
  { href: "/customer?view=settings", label: "ตั้งค่า", icon: "sun" },
];

export default function CustomerShell({ session, mockControls, leave }: { session: ApiSession; mockControls?: ReactNode; leave: () => void }) {
  const pathname = usePathname();
  const query = useSearchParams();
  const router = useRouter();
  const menu = useRef<HTMLDialogElement>(null);
  const theme = useSyncExternalStore(subscribeAppearance, getCustomerTheme, getServerCustomerTheme);

  const isSettings = query.get("view") === "settings";
  const initials = session.account.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || session.account.name.slice(0, 1) || "??";

  function isItemActive(href: string) {
    const [baseHref, search] = href.split("?");
    const hasHistory = search?.includes("view=history");
    if (isSettings) return href.includes("view=settings");
    if (href.includes("view=settings")) return false;
    if (hasHistory) return pathname === baseHref && query.get("view") === "history";
    if (baseHref === "/customer/jobs") return pathname === "/customer/jobs" && query.get("view") !== "history";
    return pathname === baseHref;
  }

  function renderSidebarLinks(items: NavItem[]) {
    return items.map((item) => {
      const active = isItemActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          className={active ? "active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <span className="cust-nav-icon"><Icon name={item.icon} /></span>
          <span>{item.label}</span>
        </Link>
      );
    });
  }

  function renderMobileLinks(items: NavItem[]) {
    return items.map((item) => {
      const active = isItemActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          className={active ? "active" : undefined}
          aria-current={active ? "page" : undefined}
          onClick={() => menu.current?.close()}
        >
          <span className="cust-nav-icon"><Icon name={item.icon} /></span>
          <span>{item.label}</span>
        </Link>
      );
    });
  }

  const content = <CustomerContent api={session.api} account={session.account} />;

  return (
    <div className={`${styles.root} ${thai.variable}`} data-customer-theme={theme}>
      <a className="cust-skip" href="#customer-content">ข้ามไปเนื้อหา</a>

      {/* Persistent Left Sidebar Drawer for Desktop */}
      <aside className="cust-sidebar" aria-label="เมนูหลักลูกค้า">
        <div className="cust-sidebar-scroll">
          <Logo onClick={() => router.push("/customer")} />
          <div className="cust-sidebar-space">
            <span>CUSTOMER WORKSPACE</span>
            <strong>พื้นที่ลูกค้า</strong>
          </div>
          <nav className="cust-sidebar-nav" aria-label="เมนูหลัก">
            <span className="cust-sidebar-label">WORKSPACE</span>
            {renderSidebarLinks(workspaceItems)}

            <span className="cust-sidebar-label">งานของฉัน</span>
            {renderSidebarLinks(orderItems)}

            <span className="cust-sidebar-label">เอกสารและการชำระเงิน</span>
            {renderSidebarLinks(documentItems)}

            <span className="cust-sidebar-label">บัญชี</span>
            {renderSidebarLinks(accountItems)}
          </nav>
        </div>

        <div className="cust-sidebar-footer">
          <div className="cust-avatar">{initials}</div>
          <div>
            <strong>{session.account.name}</strong>
            <span>ลูกค้า · {session.account.username}</span>
          </div>
          <button aria-label="ออกจากระบบ" onClick={leave}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {/* Main Stage Offset on Desktop */}
      <div className="cust-stage">
        {/* Desktop Topbar: Mode / Switcher & Notification Bell */}
        <header className="cust-topbar">
          <div className="cust-topbar-env">
            <span className={`cust-mode ${session.mode}`}>
              {session.mode === "mock" ? "ข้อมูลตัวอย่าง · ไม่ใช่ข้อมูลจริง" : "เชื่อมต่อข้อมูลจริง · รีโหลดหน้าต้องเข้าสู่ระบบใหม่"}
            </span>
            {mockControls}
          </div>
          <div className="cust-topbar-actions">
            <NotificationBell api={session.api} />
          </div>
        </header>

        {/* Mobile Navbar: Visible only on <= 1020px */}
        <header className="cust-navbar">
          <div className="cust-nav-inner">
            <Logo onClick={() => router.push("/customer")} />
            <div className="cust-nav-actions">
              <NotificationBell api={session.api} beforeOpen={() => menu.current?.close()} />
              <button
                className="cust-menu-toggle"
                aria-label="เปิดเมนู"
                aria-haspopup="dialog"
                onClick={() => menu.current?.showModal()}
              >
                <Icon name="grid" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Menu Drawer Dialog */}
        <dialog ref={menu} className="cust-mobile-menu" aria-label="เมนูลูกค้า">
          <div className="cust-toolbar">
            <h2>เมนู</h2>
            <button aria-label="ปิดเมนู" onClick={() => menu.current?.close()}>
              <Icon name="close" />
            </button>
          </div>
          <div className="cust-mobile-user">
            <span className="cust-avatar">{initials}</span>
            <div>
              <strong>{session.account.name}</strong>
              <small>ลูกค้า · {session.account.username}</small>
            </div>
          </div>
          <nav aria-label="เมนูมือถือ">
            <span className="cust-sidebar-label">WORKSPACE</span>
            {renderMobileLinks(workspaceItems)}

            <span className="cust-sidebar-label">งานของฉัน</span>
            {renderMobileLinks(orderItems)}

            <span className="cust-sidebar-label">เอกสารและการชำระเงิน</span>
            {renderMobileLinks(documentItems)}

            <span className="cust-sidebar-label">บัญชี</span>
            {renderMobileLinks(accountItems)}

            <div className="cust-mobile-actions">
              <button className="cust-danger" onClick={leave}>
                <Icon name="logout" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </nav>
        </dialog>

        {/* Mobile Environment Notice */}
        <div className="cust-environment">
          <span className={`cust-mode ${session.mode}`}>
            {session.mode === "mock" ? "ข้อมูลตัวอย่าง · ไม่ใช่ข้อมูลจริง" : "เชื่อมต่อข้อมูลจริง · รีโหลดหน้าต้องเข้าสู่ระบบใหม่"}
          </span>
          {mockControls}
        </div>

        <main id="customer-content" className="cust-main" key={`${pathname}:${query.toString()}`}>
          {content}
        </main>

        <footer className="cust-footer">
          <strong>LATHE</strong>
          <span>งานของคุณ ตั้งแต่คำขอจนส่งมอบ</span>
          <span>เวลาไทย · เงินบาท · ไม่มี VAT</span>
        </footer>
      </div>
    </div>
  );
}
