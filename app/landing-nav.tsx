import Link from "next/link";
import { Logo } from "./appearance";

export function Nav() {
  return <nav className="cinematic-nav" aria-label="เมนูหลัก">
    <Link href="/" className="cinematic-brand" aria-label="หน้าหลัก Lathe Shop Control"><Logo /></Link>
    <div className="cinematic-nav-pills">
      <a href="#workflow">ขั้นตอน</a>
      <a href="#materials">วัตถุดิบ</a>
      <a href="#capabilities">ระบบงาน</a>
    </div>
    <Link href="/login" className="cinematic-workspace">เข้าสู่ระบบ <span aria-hidden="true">↗</span></Link>
  </nav>;
}
