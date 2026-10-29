import type { Metadata } from "next";
import Dashboard from "../src/features/landing/landing-page";

export const metadata: Metadata = {
  title: "Bangkok Machine Shop | รับกลึงและทำชิ้นส่วนตามแบบ",
  description: "โรงกลึงรับทำชิ้นส่วนตามแบบ ทั้งงานกลึง งานกัด ทำเกลียว และทำชิ้นส่วนทดแทน ส่งแบบมาขอใบเสนอราคาได้ทางออนไลน์ เช็กสถานะงานได้ตลอด ราคาไม่บวก VAT",
  openGraph: {
    title: "Bangkok Machine Shop",
    description: "รับกลึงและทำชิ้นส่วนตามแบบ งานเนี้ยบ ส่งไว ราคาคุยกันได้",
    locale: "th_TH",
    type: "website",
  },
};

export default function Home() {
  return <Dashboard />;
}
