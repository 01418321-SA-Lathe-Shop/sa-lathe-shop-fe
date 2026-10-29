import Link from "next/link";
import { Logo } from "../../components/appearance/icons";
import { ThemeToggle } from "../../components/appearance/appearance";

/** In-page section anchors shared by the hero navigation and the sticky bar. */
export const sectionLinks = [
  { href: "#services", label: "บริการ" },
  { href: "#materials", label: "วัสดุ" },
  { href: "#process", label: "ขั้นตอน" },
  { href: "#faq", label: "คำถาม" },
  { href: "#contact", label: "ติดต่อ" },
];

export function Nav() {
  return <nav className="cinematic-nav" aria-label="เมนูหลัก">
    <Link href="/" className="cinematic-brand" aria-label="หน้าหลัก Lathe Shop Control"><Logo /></Link>
    <div className="cinematic-nav-pills">
      {sectionLinks.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
    </div>
    <div className="cinematic-nav-actions"><ThemeToggle /><Link href="/login" className="cinematic-workspace">เข้าสู่ระบบ <span aria-hidden="true">↗</span></Link></div>
  </nav>;
}
