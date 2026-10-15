"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LoginRole = "staff" | "customer";
type Screen = "landing" | "login" | "register" | "staff" | "customer";
type Theme = "dark" | "light";
type UiSize = "small" | "medium" | "large";
const ThemeContext = createContext<{ theme: Theme; onTheme: (theme: Theme) => void; uiSize: UiSize; onUiSize: (size: UiSize) => void }>({ theme: "dark", onTheme: () => {}, uiSize: "medium", onUiSize: () => {} });
type View = "overview" | "requests" | "production" | "delivery" | "quotations" | "materials" | "payments" | "debtors";
type CustomerView = "overview" | "jobs" | "quotations" | "documents" | "payments";
const staffPath = (view: View) => view === "overview" ? "/staff" : `/staff/${view}`;
const customerPath = (view: CustomerView) => view === "overview" ? "/customer" : `/customer/${view}`;
const screenPaths: Record<Screen, string> = { landing: "/", login: "/login", register: "/register", staff: "/staff", customer: "/customer" };

type IconName = "grid" | "inbox" | "machine" | "truck" | "file" | "layers" | "wallet" | "clock" | "search" | "plus" | "arrow" | "bell" | "logout" | "close" | "sun" | "moon";

const nav: { key: View; label: string; icon: IconName }[] = [
  { key: "overview", label: "ภาพรวม", icon: "grid" },
  { key: "requests", label: "คำขอใหม่", icon: "inbox" },
  { key: "production", label: "งานผลิต", icon: "machine" },
  { key: "delivery", label: "งานพร้อมส่ง", icon: "truck" },
  { key: "quotations", label: "ใบเสนอราคา", icon: "file" },
  { key: "materials", label: "สต๊อกวัตถุดิบ", icon: "layers" },
  { key: "payments", label: "รับชำระ", icon: "wallet" },
  { key: "debtors", label: "ลูกหนี้", icon: "clock" },
];

const pages: Record<Exclude<View, "overview">, { eyebrow: string; title: string; description: string; action: string; stats: string[][]; headers: string[]; rows: string[][] }> = {
  requests: { eyebrow: "INTAKE QUEUE", title: "คำขอผลิตใหม่", description: "ตรวจแบบ ประเมินความพร้อม และส่งงานเข้าสู่ขั้นตอนเสนอราคา", action: "เพิ่มคำขอใหม่", stats: [["รอตรวจสอบ", "06", "+2 วันนี้"], ["รอข้อมูลเพิ่ม", "03", "ต้องติดตาม"], ["ส่งประเมินแล้ว", "18", "เดือนนี้"]], headers: ["เลขคำขอ", "ลูกค้า", "ชิ้นงาน", "วันที่ต้องการ", "สถานะ"], rows: [["REQ-261015-042", "สยามแมชชีน", "เพลาขับ Ø45 × 320", "29 ต.ค. 69", "รอตรวจแบบ"], ["REQ-261015-041", "คุณกิตติ", "บูชทองเหลือง 12 ชิ้น", "31 ต.ค. 69", "ข้อมูลครบ"], ["REQ-261014-039", "อัลฟ่า ออโต้พาร์ต", "หน้าแปลน SS304", "4 พ.ย. 69", "รอข้อมูล"], ["REQ-261013-036", "โรงงานวิชัย", "แกนลูกกลิ้ง 4 ชิ้น", "12 พ.ย. 69", "รอตรวจแบบ"]] },
  production: { eyebrow: "SHOP FLOOR", title: "งานผลิต", description: "ติดตามความคืบหน้าการผลิต วัตถุดิบ และกำหนดส่งของแต่ละงาน", action: "บันทึกความคืบหน้า", stats: [["กำลังผลิต", "12", "4 สถานีงาน"], ["เสี่ยงล่าช้า", "02", "ต้องดำเนินการ"], ["เสร็จวันนี้", "05", "พร้อมตรวจ QC"]], headers: ["เลขงาน", "ชิ้นงาน", "สถานี", "กำหนดส่ง", "ความคืบหน้า"], rows: [["JOB-2609-118", "เพลาขับ Ø45", "CNC-02", "วันนี้ 16:00", "78%"], ["JOB-2609-121", "บูชทองเหลือง", "LATHE-01", "พรุ่งนี้", "62%"], ["JOB-2609-115", "หน้าแปลน SS304", "CNC-01", "18 ต.ค.", "44%"], ["JOB-2609-124", "แกนลูกกลิ้ง", "QC", "18 ต.ค.", "92%"]] },
  delivery: { eyebrow: "DISPATCH", title: "งานพร้อมส่ง", description: "จัดการกำหนดส่งมอบ นัดรับสินค้า และหลักฐานการส่งมอบ", action: "จัดรอบส่ง", stats: [["พร้อมส่ง", "08", "ตรวจครบแล้ว"], ["นัดรับวันนี้", "03", "ช่วงบ่าย"], ["รอเอกสาร", "02", "ใบส่งของ"]], headers: ["เลขงาน", "ลูกค้า", "วิธีส่ง", "กำหนด", "สถานะ"], rows: [["JOB-2609-104", "สยามแมชชีน", "รถร้าน", "วันนี้ 13:30", "จัดของแล้ว"], ["JOB-2609-107", "คุณกิตติ", "รับที่ร้าน", "วันนี้ 15:00", "รอลูกค้า"], ["JOB-2609-109", "อัลฟ่า ออโต้พาร์ต", "ขนส่งภายนอก", "16 ต.ค.", "รอใบส่งของ"], ["JOB-2609-110", "โรงงานวิชัย", "รถร้าน", "17 ต.ค.", "พร้อมส่ง"]] },
  quotations: { eyebrow: "PRICING DESK", title: "ใบเสนอราคา", description: "ควบคุมต้นทุน ราคาขายขั้นต่ำ และประวัติการแก้ไขทุกเวอร์ชัน", action: "สร้างใบเสนอราคา", stats: [["ฉบับร่าง", "07", "รอประเมิน"], ["รอลูกค้าตอบ", "05", "2 ใกล้ครบกำหนด"], ["อนุมัติเดือนนี้", "21", "฿486K"]], headers: ["เลขใบเสนอราคา", "ลูกค้า", "งาน", "ยอดเสนอ", "สถานะ"], rows: [["QT-261015-037", "สยามแมชชีน", "เพลาขับ Ø45", "฿28,400", "รอตอบรับ"], ["QT-261014-035", "คุณกิตติ", "บูชทองเหลือง", "฿16,700", "ฉบับร่าง"], ["QT-261013-032", "อัลฟ่า ออโต้พาร์ต", "หน้าแปลน SS304", "฿42,900", "อนุมัติ"], ["QT-261011-029", "โรงงานวิชัย", "แกนลูกกลิ้ง", "฿78,500", "แก้ไขครั้งที่ 2"]] },
  materials: { eyebrow: "MATERIAL CONTROL", title: "สต๊อกวัตถุดิบ", description: "ตรวจสอบวัตถุดิบคงเหลือ ยอดจอง และรายการที่ต้องสั่งซื้อ", action: "สร้างใบสั่งวัสดุ", stats: [["รายการทั้งหมด", "148", "12 หมวด"], ["ต่ำกว่าจุดสั่ง", "09", "ต้องตรวจสอบ"], ["กำลังรับเข้า", "06", "3 ซัพพลายเออร์"]], headers: ["วัสดุ", "เกรด / ขนาด", "คงเหลือ", "ถูกจอง", "พร้อมใช้"], rows: [["เหล็กเพลากลม", "S45C Ø45", "84.0 kg", "46.5 kg", "37.5 kg"], ["สแตนเลสเพลา", "SS304 Ø60", "31.2 kg", "28.0 kg", "3.2 kg"], ["ทองเหลือง", "C3604 Ø32", "18.6 kg", "6.4 kg", "12.2 kg"], ["อะลูมิเนียม", "6061 Ø80", "42.0 kg", "12.5 kg", "29.5 kg"]] },
  payments: { eyebrow: "CASH FLOW", title: "วางบิลและรับชำระ", description: "ติดตามเงินมัดจำ ยอดคงเหลือ และการแบ่งชำระต่อใบแจ้งหนี้", action: "บันทึกรับชำระ", stats: [["รับแล้วเดือนนี้", "฿284K", "+12.8%"], ["รอรับชำระ", "฿96K", "8 ใบแจ้งหนี้"], ["มัดจำรอตรวจ", "04", "฿62K"]], headers: ["ใบแจ้งหนี้", "ลูกค้า", "ยอดเต็ม", "ชำระแล้ว", "สถานะ"], rows: [["INV-2610-084", "สยามแมชชีน", "฿56,800", "฿28,400", "ชำระบางส่วน"], ["INV-2610-081", "คุณกิตติ", "฿16,700", "฿16,700", "ชำระแล้ว"], ["INV-2610-078", "อัลฟ่า ออโต้พาร์ต", "฿42,900", "฿0", "ยังไม่ชำระ"], ["INV-2609-073", "โรงงานวิชัย", "฿78,500", "฿45,000", "ชำระบางส่วน"]] },
  debtors: { eyebrow: "RECEIVABLES", title: "ติดตามลูกหนี้", description: "ตรวจสอบยอดค้างชำระ อายุหนี้ และประวัติการติดตาม", action: "บันทึกการติดตาม", stats: [["ยอดค้างรวม", "฿96K", "8 รายการ"], ["เกินกำหนด", "฿31K", "3 รายการ"], ["ครบกำหนดสัปดาห์นี้", "฿42K", "4 รายการ"]], headers: ["ลูกค้า", "ใบแจ้งหนี้", "ยอดค้าง", "อายุหนี้", "การติดตามล่าสุด"], rows: [["โรงงานวิชัย", "INV-2609-073", "฿33,500", "18 วัน", "โทรติดตาม 14 ต.ค."], ["อัลฟ่า ออโต้พาร์ต", "INV-2610-078", "฿42,900", "7 วัน", "ส่งอีเมล 13 ต.ค."], ["คุณณัฐ", "INV-2610-080", "฿12,600", "3 วัน", "รอติดต่อ"], ["ธนกิจแมชชีน", "INV-2610-082", "฿7,000", "ครบกำหนดวันนี้", "แจ้งเตือนแล้ว"]] },
};

const jobs = [["JOB-2609-118", "สยามแมชชีน", "เพลาขับ Ø45 × 320", "วันนี้ 16:00", "78"], ["JOB-2609-121", "คุณกิตติ", "บูชทองเหลือง 12 ชิ้น", "พรุ่งนี้", "62"], ["JOB-2609-115", "อัลฟ่า ออโต้พาร์ต", "หน้าแปลน SS304", "18 ต.ค.", "44"], ["JOB-2609-124", "โรงงานวิชัย", "แกนลูกกลิ้ง 4 ชิ้น", "18 ต.ค.", "92"]];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const p: Record<IconName, React.ReactNode> = { grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>, inbox: <><path d="M4 4h16v13H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></>, machine: <path d="M5 20V8h14v12M8 8V4h8v4M9 13h6M12 10v6"/>, truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>, file: <path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4"/>, layers: <path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>, wallet: <path d="M4 6h15v13H4zM4 9V5h12M15 13h6v4h-6z"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, search: <><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>, plus: <path d="M12 5v14M5 12h14"/>, arrow: <path d="m9 18 6-6-6-6"/>, bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>, logout: <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/>, close: <path d="M6 6l12 12M18 6 6 18"/>, sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>, moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/> };
  return <svg aria-hidden="true" className="icon" width={`${size / 16}rem`} height={`${size / 16}rem`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>;
}

function Logo({ onClick }: { onClick?: () => void }) {
  const mark = <><span className="brand-mark"><span/></span><span><b>LATHE</b><small>SHOP CONTROL</small></span></>;
  return onClick ? <button className="brand brand-button" onClick={onClick} aria-label="กลับหน้าแรก">{mark}</button> : <div className="brand">{mark}</div>;
}

function ThemeToggle() {
  const { theme, onTheme, uiSize, onUiSize } = useContext(ThemeContext);
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className="theme-toggle settings-trigger" type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog"><Icon name="grid"/><span>ตั้งค่า</span></button>
    <dialog ref={dialog} className="appearance-settings" aria-label="ตั้งค่าการแสดงผล">
      <div className="settings-heading"><div><span className="eyebrow">PREFERENCES</span><h2>ตั้งค่าการแสดงผล</h2></div><button type="button" aria-label="ปิดการตั้งค่า" onClick={() => dialog.current?.close()}><Icon name="close"/></button></div>
      <p>ปรับการแสดงผลให้เหมาะกับการใช้งานของคุณ</p>
      <fieldset><legend>ขนาดการแสดงผล</legend><div className="settings-options">{([['small', 'เล็ก'], ['medium', 'กลาง'], ['large', 'ใหญ่']] as const).map(([value, label]) => <label key={value}><input type="radio" name="ui-size" value={value} checked={uiSize === value} onChange={() => onUiSize(value)}/><span>{label}</span></label>)}</div></fieldset>
      <fieldset><legend>ธีม</legend><div className="settings-options">{([['light', 'สว่าง', 'sun'], ['dark', 'มืด', 'moon']] as const).map(([value, label, icon]) => <label key={value}><input type="radio" name="appearance-theme" value={value} checked={theme === value} onChange={() => onTheme(value)}/><span><Icon name={icon}/>{label}</span></label>)}</div></fieldset>
      <div className="settings-preview"><strong>ตัวอย่างการแสดงผล</strong><p>ติดตามงานผลิตและจัดการเอกสารได้ในที่เดียว</p></div>
      <small>ใช้กับทุกหน้า และจดจำไว้ในเบราว์เซอร์นี้</small>
      <button className="primary-button settings-done" type="button" onClick={() => dialog.current?.close()}>เสร็จสิ้น</button>
    </dialog>
  </>;
}

function Sidebar({ view, onHome, onLogout }: { view: View; onHome: () => void; onLogout: () => void }) {
  return <aside className="sidebar"><Logo onClick={onHome}/><div className="staff-space"><span>STAFF WORKSPACE</span><strong>จัดการงานโรงกลึง</strong></div><nav className="nav-list"><span className="nav-label">WORKSPACE</span>{nav.map((item, index) => <Link key={item.key} href={staffPath(item.key)} className={view === item.key ? "active" : ""} aria-current={view === item.key ? "page" : undefined}><span className="nav-icon"><Icon name={item.icon}/></span><span>{item.label}</span>{index === 1 ? <em>6</em> : null}</Link>)}</nav><div className="sidebar-theme"><ThemeToggle/></div><div className="sidebar-footer"><div className="avatar">PS</div><div><strong>ปรีดิพัทธ์</strong><span>ผู้ดูแลระบบ</span></div><button aria-label="ออกจากระบบ" onClick={onLogout}><Icon name="logout"/></button></div></aside>;
}

function Header({ openModal }: { openModal: () => void }) { return <header className="topbar staff-topbar"><div className="topbar-actions"><label className="search"><Icon name="search"/><input aria-label="ค้นหา" placeholder="ค้นหาเลขงาน ลูกค้า หรือเอกสาร"/></label><button className="icon-button" aria-label="การแจ้งเตือน"><Icon name="bell"/><span/></button><button className="primary-button" onClick={openModal}><Icon name="plus"/>เพิ่มคำขอ</button></div></header>; }

function Metric({ label, value, detail, bars, accent }: { label: string; value: string; detail: string; bars: number[]; accent?: boolean }) { return <article className={`metric-card ${accent ? "accent" : ""}`}><div className="metric-top"><span>{label}</span><button aria-label={`ดู ${label}`}><Icon name="arrow" size={15}/></button></div><strong>{value}</strong><div className="mini-chart">{bars.map((height, index) => <i key={index} style={{ height: `${height}%` }}/>)}</div><small>{detail}</small></article>; }
function PanelHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: boolean }) { return <div className="panel-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action ? <button className="text-button">ดูทั้งหมด <Icon name="arrow" size={14}/></button> : null}</div>; }

function StaffOverview() { return <><section className="page-heading"><div><span className="eyebrow">OPERATIONS / OVERVIEW</span><h1>ศูนย์ควบคุมงานผลิต</h1><p>ติดตามคำขอผลิต ความคืบหน้างาน และยอดรอรับชำระ</p></div><div className="heading-meta"><span>วันพฤหัสบดี</span><strong>15 ตุลาคม 2569</strong></div></section><section className="quick-strip"><span>สถานะโรงงาน</span>{[["ทั้งหมด",28],["รอประเมิน",6],["กำลังผลิต",12],["พร้อมส่ง",8],["มีความเสี่ยง",2]].map(([label,count], index) => <button className={index === 0 ? "selected" : ""} key={label}>{label} <b>{count}</b></button>)}</section><section className="metrics-grid"><Metric label="คำขอรอประเมิน" value="06" detail="เพิ่ม 2 รายการจากเมื่อวาน" bars={[28,44,38,65,52,78,62]}/><Metric label="งานกำลังผลิต" value="12" detail="4 สถานีงานกำลังทำงาน" bars={[38,52,68,60,81,74,92]} accent/><Metric label="งานพร้อมส่ง" value="08" detail="3 งานนัดรับวันนี้" bars={[20,35,30,46,62,70,82]}/><Metric label="ยอดรอรับชำระ" value="฿96.4K" detail="8 ใบแจ้งหนี้คงค้าง" bars={[76,62,84,72,58,42,36]}/></section><section className="dashboard-grid"><article className="panel production-panel"><PanelHead eyebrow="LIVE PRODUCTION" title="คิวงานผลิตวันนี้" action/><div className="job-list">{jobs.map((job,index) => <div className="job-row" key={job[0]}><div className={`job-indicator tone-${index}`}/><div className="job-id"><strong>{job[0]}</strong><span>{job[1]}</span></div><div className="job-work"><strong>{job[2]}</strong><span>กำหนดส่ง {job[3]}</span></div><div className="progress"><div><i style={{width:`${job[4]}%`}}/></div><span>{job[4]}%</span></div><button><Icon name="arrow"/></button></div>)}</div></article><article className="panel revenue-panel"><div className="panel-head"><div><span className="eyebrow">REVENUE</span><h2>ยอดขายเดือนนี้</h2></div><span className="trend">↗ 12.8%</span></div><strong className="money">฿456,000</strong><span className="muted">เป้าหมาย ฿520,000</span><div className="bar-chart">{[35,52,46,68,58,81,72,92,76,65,84,70].map((height,index) => <div key={index}><i className={index===7?"hot":""} style={{height:`${height}%`}}/><span>{index+1}</span></div>)}</div></article><article className="panel alert-panel"><PanelHead eyebrow="MATERIAL ALERTS" title="รายการวัตถุดิบที่ต้องติดตาม"/><span className="count-badge">3</span>{[["S45C","เพลากลม Ø45","เหลือพร้อมใช้ 37.5 kg","ต่ำ"],["304","สแตนเลส Ø60","เหลือพร้อมใช้ 3.2 kg","วิกฤต"],["C36","ทองเหลือง Ø32","รับเข้า 18 ต.ค.","สั่งแล้ว"]].map((m,index) => <div className="material-item" key={m[0]}><span className={`material-code color-${index}`}>{m[0]}</span><div><strong>{m[1]}</strong><small>{m[2]}</small></div><em className={index===2?"neutral":""}>{m[3]}</em></div>)}</article><article className="panel activity-panel"><PanelHead eyebrow="ACTIVITY" title="ความเคลื่อนไหวล่าสุด"/>{["JOB-2609-124 ผ่านการตรวจ QC","รับชำระ INV-2610-081 ครบแล้ว","QT-261015-037 ถูกส่งให้ลูกค้า","รับวัสดุ SS304 จำนวน 28 kg"].map((text,index) => <div className="activity" key={text}><i className={index===0?"active":""}/><div><strong>{text}</strong><span>{[8,19,32,48][index]} นาทีที่แล้ว · {index%2?"การเงิน":"ทีมผลิต"}</span></div></div>)}</article></section></>; }

function CustomerPortal({ view, onHome, onLogout, openModal }: { view: CustomerView; onHome: () => void; onLogout: () => void; openModal: () => void }) {
  const customerNavigation: { id: CustomerView; label: string; icon: IconName }[] = [
    { id: "overview", label: "ภาพรวม", icon: "grid" },
    { id: "jobs", label: "งานของฉัน", icon: "machine" },
    { id: "quotations", label: "ใบเสนอราคา", icon: "file" },
    { id: "documents", label: "เอกสาร", icon: "layers" },
    { id: "payments", label: "การชำระเงิน", icon: "wallet" },
  ];
  const currentPage = customerNavigation.find(item => item.id === view)!;
  return <main className="customer-portal">
    <aside className="sidebar customer-sidebar">
      <Logo onClick={onHome}/>
      <div className="staff-space"><span>CUSTOMER WORKSPACE</span><strong>พื้นที่ลูกค้า</strong></div>
      <nav className="nav-list" aria-label="เมนูลูกค้า"><span className="nav-label">บัญชีของฉัน</span>{customerNavigation.map(item => <Link key={item.id} href={customerPath(item.id)} className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined}><span className="nav-icon"><Icon name={item.icon}/></span><span>{item.label}</span></Link>)}</nav>
      <div className="sidebar-theme"><ThemeToggle/></div><div className="sidebar-footer"><div className="avatar">SM</div><div><strong>สยามแมชชีน</strong><span>ลูกค้านิติบุคคล</span></div><button onClick={onLogout} aria-label="ออกจากระบบ" title="ออกจากระบบ"><Icon name="logout"/></button></div>
    </aside>
    <div className="app-stage customer-stage">
    <header className="topbar customer-topbar"><span className="eyebrow">บัญชีลูกค้า / {currentPage.label}</span><button className="customer-alert" aria-label="การแจ้งเตือน"><Icon name="bell"/><i/></button></header>
    <div className="customer-content">
      <section className="customer-welcome" id="customer-overview"><div><span className="eyebrow">CUSTOMER SPACE</span><h1>{view === "overview" ? <>งานของคุณ<br/><em>ติดตามได้ในที่เดียว</em></> : currentPage.label}</h1><p>ตรวจสอบสถานะงาน ตอบรับใบเสนอราคา และดูเอกสารการชำระเงิน</p></div><button className="hero-primary" onClick={openModal}><Icon name="plus"/> ส่งคำขอผลิต</button></section>
      {view === "overview" && <section className="customer-summary"><article><span>งานกำลังดำเนินการ</span><strong>02</strong><small><i className="live-dot"/> อัปเดตล่าสุด 8 นาทีที่แล้ว</small></article><article><span>รอตอบรับใบเสนอราคา</span><strong>01</strong><small>ครบกำหนดใน 3 วัน</small></article><article id="customer-payments"><span>ยอดคงเหลือ</span><strong>฿28.4K</strong><small>INV-2610-084 · ไม่มี VAT</small></article></section>}
      <section className={view === "overview" ? "customer-portal-grid" : "customer-route-content"}>{(view === "overview" || view === "jobs") && <article className="customer-focus-card" id="customer-jobs"><div className="customer-card-head"><div><span className="eyebrow">ACTIVE JOB</span><h2>เพลาขับ Ø45 × 320</h2></div><span className="status-pill">กำลังผลิต</span></div><div className="customer-focus-meta"><span>JOB-2609-118</span><span>4 ชิ้น</span><span>ส่ง 18 ต.ค. 69</span></div><div className="customer-progress"><div className="customer-progress-label"><span>ความคืบหน้าล่าสุด</span><strong>78%</strong></div><div className="customer-progress-track"><i/></div><p>กำลังกลึงผิวละเอียด · สถานี CNC-02 · อัปเดต 09:34 น.</p></div><div className="customer-steps">{["รับคำขอ","อนุมัติราคา","กำลังผลิต","ส่งมอบ"].map((label,index)=><div className={index<3?"done":""} key={label}><i>{index<2?"✓":index+1}</i><span>{label}</span></div>)}</div><button className="customer-link">ดูรายละเอียดงาน <Icon name="arrow"/></button></article>}
      {(view === "overview" || view === "quotations" || view === "documents") && <div className="customer-side-stack">{(view === "overview" || view === "quotations") && <article className="customer-action-card" id="customer-quotes"><span className="eyebrow">ACTION REQUIRED</span><h2>ใบเสนอราคารอตอบรับ</h2><p>QT-261015-037 · เพลาขับชุดใหม่</p><strong>฿28,400</strong><small>รวมค่าวัสดุและค่าแรง · ไม่มี VAT</small><button className="primary-button">ตรวจสอบใบเสนอราคา <Icon name="arrow"/></button></article>}{(view === "overview" || view === "documents") && <article className="customer-documents" id="customer-documents"><div className="customer-card-head"><div><span className="eyebrow">DOCUMENTS</span><h2>เอกสารล่าสุด</h2></div><button className="customer-link">ดูทั้งหมด</button></div>{["ใบเสนอราคา QT-261015-037","ใบแจ้งหนี้ INV-2610-084","หลักฐานส่งมอบ JOB-2609-104"].map((doc,index)=><button className="customer-doc-row" key={doc}><span><Icon name="file"/></span><div><strong>{doc}</strong><small>{15-index} ต.ค. 69</small></div><Icon name="arrow"/></button>)}</article>}</div>}
      {view === "payments" && <article className="customer-action-card"><span className="eyebrow">PAYMENTS</span><h2>ยอดคงเหลือที่ต้องชำระ</h2><p>ใบแจ้งหนี้ INV-2610-084</p><strong>฿28,400</strong><small>ยอดใบแจ้งหนี้ ฿56,800 · ชำระแล้ว ฿28,400 · ไม่มี VAT</small><span className="status-pill">ชำระบางส่วน</span></article>}
      </section>
    </div>
    </div>
  </main>;
}

function Workspace({ view, openModal }: { view: Exclude<View,"overview">; openModal: () => void }) { const page=pages[view]; return <><section className="page-heading"><div><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.description}</p></div><button className="primary-button" onClick={openModal}><Icon name="plus"/>{page.action}</button></section><section className="workspace-stats">{page.stats.map(([label,value,detail],index) => <article className={index===1?"featured":""} key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</section><section className="panel data-panel"><div className="table-tools"><div className="segmented"><button className="active">ทั้งหมด</button><button>กำลังดำเนินการ</button><button>ต้องดำเนินการ</button></div><label className="table-search"><Icon name="search"/><input aria-label="ค้นหาในตาราง" placeholder="ค้นหาในรายการ"/></label></div><div className="data-table"><div className="data-row data-head">{page.headers.map((header,index)=><span key={`${header}-${index}`}>{header}</span>)}</div>{page.rows.map((row,rowIndex)=><button className="data-row" key={row[0]}>{row.map((cell,index)=><span className={index===row.length-1?"cell-status":""} key={`${row[0]}-${index}`}>{index===0?<><i>{String(rowIndex+1).padStart(2,"0")}</i>{cell}</>:cell}</span>)}<b><Icon name="arrow"/></b></button>)}</div><div className="table-footer"><span>แสดง {page.rows.length} จาก {page.rows.length+18} รายการ</span><div><button>ก่อนหน้า</button><button className="active">1</button><button>2</button><button>3</button><button>ถัดไป</button></div></div></section></>; }

function Login({ onBack, onLogin, onRegister }: { onBack: () => void; onLogin: (role: LoginRole) => void; onRegister: () => void }) {
  return <main className="login-page">
    <section className="login-showcase"><button className="login-home" onClick={onBack} aria-label="กลับหน้าแรก"><Logo/></button><div className="login-showcase-copy"><span className="hero-kicker"><i className="live-dot"/> LATHE SHOP CONTROL</span><h1>ทุกงานสำคัญ<br/>อยู่ในที่เดียว</h1><p>จัดการงานผลิต ติดตามความคืบหน้า และตรวจสอบเอกสารได้จากบัญชีของคุณ</p></div><div className="login-machine"><div className="machine-orbit orbit-one"/><div className="machine-orbit orbit-two"/><div className="machine-core"><span/><i/></div></div><div className="login-showcase-footer"><span>LATHE SHOP CONTROL</span><small>Bangkok · Thailand</small></div></section>
    <section className="login-panel"><div className="auth-toolbar"><button className="login-back" onClick={onBack}>← กลับหน้าแรก</button><ThemeToggle/></div><form className="login-card" onSubmit={(event)=>{event.preventDefault();onLogin("staff");}}><span className="eyebrow">WELCOME BACK</span><h2>เข้าสู่ระบบ</h2><p>เข้าสู่ระบบเพื่อจัดการและติดตามงานของคุณ</p><label className="login-field"><span>อีเมล</span><div><Icon name="inbox"/><input type="email" required placeholder="name@example.com" /></div></label><label className="login-field"><span>รหัสผ่าน</span><div><Icon name="clock"/><input type="password" required placeholder="กรอกรหัสผ่าน" /></div></label><div className="login-options"><label><input type="checkbox" defaultChecked/> จดจำการเข้าสู่ระบบ</label><button type="button">ลืมรหัสผ่าน?</button></div><button className="login-submit" type="submit">เข้าสู่ระบบ <Icon name="arrow"/></button><button className="login-register-link" type="button" onClick={onRegister}>ยังไม่มีบัญชี? <strong>สมัครบัญชี</strong></button><div className="login-divider"><span>บัญชีทดสอบ</span></div><div className="bypass-actions"><button type="button" onClick={()=>onLogin("staff")}><Icon name="machine"/><span><strong>ทดสอบทีมงาน</strong><small>ดูงานผลิตและเอกสาร</small></span><Icon name="arrow"/></button><button type="button" onClick={()=>onLogin("customer")}><Icon name="file"/><span><strong>ทดสอบลูกค้า</strong><small>ดูสถานะงานและใบเสนอราคา</small></span><Icon name="arrow"/></button></div></form></section>
  </main>;
}

function Register({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  return <main className="login-page register-page">
    <section className="login-showcase"><button className="login-home" onClick={onBack} aria-label="กลับหน้าแรก"><Logo/></button><div className="login-showcase-copy"><span className="hero-kicker"><i className="live-dot"/> START IN ONE PLACE</span><h1>เริ่มต้นงานใหม่<br/>ให้เป็นระบบ</h1><p>สร้างบัญชีเดียวสำหรับส่งรายละเอียดงาน ติดตามสถานะ เอกสาร และการชำระเงินในที่เดียว</p></div><div className="login-machine"><div className="machine-orbit orbit-one"/><div className="machine-orbit orbit-two"/><div className="machine-core"><span/><i/></div></div><div className="login-showcase-footer"><span>LATHE SHOP CONTROL</span><small>Bangkok · Thailand</small></div></section>
    <section className="login-panel register-panel"><div className="auth-toolbar"><button className="login-back" onClick={onBack}>← กลับหน้าแรก</button><ThemeToggle/></div><form className="login-card register-card" onSubmit={(event)=>{event.preventDefault();onLogin();}}><span className="eyebrow">CREATE ACCOUNT</span><h2>สมัครบัญชี</h2><p>สมัครบัญชีเพื่อส่งคำขอผลิต ติดตามงาน และจัดการเอกสาร</p><div className="register-grid"><label className="login-field"><span>ประเภทลูกค้า</span><div><select aria-label="ประเภทลูกค้า" defaultValue="individual"><option value="individual">บุคคลทั่วไป</option><option value="company">นิติบุคคล / บริษัท</option></select></div></label><label className="login-field"><span>ชื่อผู้ติดต่อหรือชื่อกิจการ</span><div><input required placeholder="กรอกชื่อผู้ติดต่อหรือชื่อกิจการ" /></div></label><label className="login-field full"><span>อีเมล</span><div><Icon name="inbox"/><input type="email" required placeholder="name@example.com" /></div></label><label className="login-field"><span>รหัสผ่าน</span><div><Icon name="clock"/><input type="password" minLength={8} required placeholder="อย่างน้อย 8 ตัวอักษร" /></div></label><label className="login-field"><span>ยืนยันรหัสผ่าน</span><div><Icon name="clock"/><input type="password" minLength={8} required placeholder="กรอกรหัสผ่านอีกครั้ง" /></div></label></div><button className="login-submit register-submit" type="submit">สร้างบัญชี <Icon name="arrow"/></button><button className="login-register-link" type="button" onClick={onLogin}>มีบัญชีอยู่แล้ว? <strong>เข้าสู่ระบบ</strong></button></form></section>
  </main>;
}

function Landing({ enter, register }: { enter: () => void; register: () => void }) {
  const workflow = ["ส่งแบบและรายละเอียด", "ประเมินราคา", "วางแผนและผลิต", "ส่งมอบและรับชำระ"];
  return <main className="landing">
    <nav className="landing-nav">
      <Logo />
      <div className="landing-links"><a href="#workflow">ขั้นตอนงาน</a><a href="#capabilities">ความสามารถ</a></div>
      <div className="landing-nav-actions"><ThemeToggle/><button className="landing-register" onClick={register}>สมัครบัญชี</button><button className="primary-button landing-nav-cta" onClick={enter}>เข้าสู่ระบบ <Icon name="arrow"/></button></div>
    </nav>
    <section className="landing-hero" id="platform">
      <div className="hero-copy">
        <div className="hero-kicker"><i className="live-dot"/> ONE WORKFLOW. EVERY JOB.</div>
        <h1>จัดการงานกลึง<br/><span>ครบทุกขั้นตอน</span><br/>ในที่เดียว</h1>
        <p>เชื่อมต่อคำขอผลิต ใบเสนอราคา วัตถุดิบ และการชำระเงิน ให้ทีมงานและลูกค้าติดตามทุกงานได้อย่างชัดเจน</p>
        <div className="hero-actions"><button className="hero-primary" onClick={enter}>เข้าสู่ระบบ <Icon name="arrow" size={20}/></button><a className="hero-secondary" href="#workflow">ดูขั้นตอนการทำงาน</a></div>
        <div className="hero-proof"><div><strong>01</strong><span>ส่งรายละเอียด<br/>ในจุดเดียว</span></div><div><strong>02</strong><span>ติดตามสถานะ<br/>ได้ตลอดงาน</span></div><div><strong>03</strong><span>เอกสารและการชำระเงิน<br/>ครบในแต่ละงาน</span></div></div>
      </div>
      <div className="hero-visual" aria-label="ภาพรวมการติดตามงานผลิต">
        <div className="machine-orbit orbit-one"/><div className="machine-orbit orbit-two"/><div className="machine-core"><span/><i/></div>
        <div className="visual-label top-label"><i className="live-dot"/> LIVE SHOP FLOOR</div>
        <div className="mock-dashboard">
          <div className="mock-top"><div><span>ACTIVE JOB</span><strong>งานที่กำลังผลิต</strong></div><em>อัปเดตเมื่อสักครู่</em></div>
          <div className="mock-job-focus"><div><span>JOB-2609-118</span><strong>เพลาขับ Ø45 × 320</strong><small>สยามแมชชีน · CNC-02</small></div><em>78%</em></div>
          <div className="mock-progress"><i/></div>
          <div className="mock-flow">{["รับคำขอ","เสนอราคา","ผลิต","ส่งมอบ"].map((step,index)=><div className={index<3?"done":""} key={step}><i>{index<3?"✓":index+1}</i><span>{step}</span></div>)}</div>
        </div>
      </div>
    </section>
    <section className="landing-workflow" id="workflow"><div className="section-heading"><span>FROM REQUEST TO REVENUE</span><h2>หนึ่งระบบ<br/>ตลอดทั้งงาน</h2><p>เชื่อมต่อข้อมูลตั้งแต่รับคำขอจนถึงส่งมอบ เพื่อให้ทุกฝ่ายติดตามขั้นตอนของงานได้อย่างต่อเนื่อง</p></div><div className="workflow-steps">{workflow.map((item,index)=><article key={item}><span>{String(index+1).padStart(2,"0")}</span><i/><h3>{item}</h3><p>{["ระบุรายละเอียดชิ้นงาน พร้อมแนบแบบและเอกสารประกอบ","ประเมินค่าวัสดุและค่าแรง พร้อมจัดทำใบเสนอราคา","ตรวจสอบวัตถุดิบ วางแผนการผลิต และบันทึกความคืบหน้า","จัดการส่งมอบ ออกใบแจ้งหนี้ และบันทึกการรับชำระ"][index]}</p></article>)}</div></section>
    <section className="landing-capabilities" id="capabilities"><div className="capability-lead"><span className="eyebrow">BUILT FOR CUSTOM MANUFACTURING</span><h2>ดูแลงานผลิต<br/>ได้ครบทุกด้าน</h2></div><div className="capability-grid"><article><Icon name="machine" size={25}/><strong>ติดตามการผลิต</strong><p>ตรวจสอบคิวงาน สถานีผลิต กำหนดส่ง และความคืบหน้าของแต่ละงาน</p></article><article><Icon name="layers" size={25}/><strong>จัดการวัตถุดิบ</strong><p>ตรวจสอบยอดคงเหลือ ยอดจอง และปริมาณพร้อมใช้สำหรับวางแผนการผลิต</p></article><article><Icon name="wallet" size={25}/><strong>ติดตามการชำระเงิน</strong><p>ตรวจสอบเงินมัดจำ ใบแจ้งหนี้ ประวัติการชำระ และยอดคงเหลือของแต่ละงาน</p></article></div></section>
    <footer className="landing-footer"><Logo/><p>LATHE SHOP CONTROL · ระบบจัดการงานผลิตตามสั่ง</p><button onClick={register}>เริ่มต้นใช้งาน <Icon name="arrow"/></button></footer>
  </main>;
}

function RequestModal({ close }: { close: () => void }) { return <div className="modal-backdrop" onMouseDown={close}><section className="modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">NEW REQUEST</span><h2>ส่งคำขอผลิตใหม่</h2><p>ระบุรายละเอียดชิ้นงานและแนบแบบสำหรับประเมินราคา</p></div><button className="icon-button" onClick={close} aria-label="ปิดฟอร์ม"><Icon name="close"/></button></div><div className="form-grid"><label><span>ชื่องาน</span><input placeholder="เช่น เพลาขับเครื่องจักร"/></label><label><span>จำนวน</span><input placeholder="ระบุจำนวนชิ้น"/></label><label className="full"><span>รายละเอียดงาน</span><textarea placeholder="วัสดุ ขนาด ความคลาดเคลื่อน หรือเงื่อนไขสำคัญ"/></label><label><span>วันที่ต้องการ</span><input type="date"/></label><label><span>เอกสารอ้างอิง</span><div className="upload">เลือกแบบหรือเอกสารประกอบ<small>เอกสาร/รูปภาพ ไม่เกิน 100 MB</small></div></label></div><div className="modal-actions"><button className="secondary-button" onClick={close}>ยกเลิก</button><button className="primary-button" onClick={close}>บันทึกฉบับร่าง <Icon name="arrow"/></button></div></section></div>; }

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,setTheme]=useState<Theme>("dark");
  const [uiSize,setUiSize]=useState<UiSize>("medium");
  useEffect(()=>{
    let saved: string | null = null;
    let savedSize: string | null = null;
    try { saved=window.localStorage.getItem("lathe-theme"); savedSize=window.localStorage.getItem("lathe-ui-size") ?? window.localStorage.getItem("lathe-text-size"); } catch { /* Preferences still work when storage is unavailable. */ }
    const next: Theme=saved==="light"||saved==="dark"?saved:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");
    setTheme(next);
    document.documentElement.dataset.theme=next;
    const size = savedSize === "small" || savedSize === "large" ? savedSize : "medium";
    setUiSize(size);
    document.documentElement.dataset.uiSize=size;
  },[]); // eslint-disable-line react-hooks/exhaustive-deps
  const changeTheme = (next: Theme) => {
    if (next === theme) return;
    const update = () => {
      flushSync(() => setTheme(next));
      document.documentElement.dataset.theme = next;
      try { window.localStorage.setItem("lathe-theme", next); } catch { /* Keep the in-memory preference. */ }
    };
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(update);
    } else {
      update();
    }
  };
  const changeUiSize = (size: UiSize) => {
    setUiSize(size);
    document.documentElement.dataset.uiSize=size;
    try { window.localStorage.setItem("lathe-ui-size", size); } catch { /* Keep the in-memory preference. */ }
  };
  return <ThemeContext.Provider value={{ theme, onTheme: changeTheme, uiSize, onUiSize: changeUiSize }}><div className="theme-root" data-theme={theme}>{children}</div></ThemeContext.Provider>;
}

export default function Dashboard({ screen = "landing", view = "overview", customerView = "overview" }: { screen?: Screen; view?: View; customerView?: CustomerView }) {
  const router = useRouter();
  const [modal,setModal]=useState(false);
  const go = (next: Screen) => { setModal(false); router.push(screenPaths[next]); };
  const openLogin = () => go("login");
  if (screen === "landing") return <Landing enter={openLogin} register={()=>go("register")}/>;
  if (screen === "login") return <Login onBack={()=>go("landing")} onLogin={(role)=>go(role)} onRegister={()=>go("register")}/>;
  if (screen === "register") return <Register onBack={()=>go("landing")} onLogin={openLogin}/>;
  if (screen === "customer") return <><CustomerPortal view={customerView} onHome={()=>go("landing")} onLogout={openLogin} openModal={()=>setModal(true)}/>{modal?<RequestModal close={()=>setModal(false)}/>:null}</>;
  return <main className="app-shell"><Sidebar view={view} onHome={()=>go("landing")} onLogout={openLogin}/><div className="app-stage"><Header openModal={()=>setModal(true)}/><div className="page-content">{view==="overview"?<StaffOverview/>:<Workspace view={view} openModal={()=>setModal(true)}/>}</div></div>{modal?<RequestModal close={()=>setModal(false)}/>:null}</main>;
}
