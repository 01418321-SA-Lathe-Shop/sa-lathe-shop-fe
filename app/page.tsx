import type { Metadata } from "next";
import Dashboard from "../src/features/landing/landing-page";

export const metadata: Metadata = {
  title: "Bangkok Machine Shop | รับกลึงและผลิตชิ้นส่วนตามแบบ",
  description: "โรงกลึงรับผลิตชิ้นส่วนตามแบบ งานกลึง งานกัด ทำเกลียว ซ่อมและทำชิ้นส่วนทดแทน ส่งแบบงานขอใบเสนอราคาและติดตามงานได้ออนไลน์ ราคาไม่บวก VAT",
  openGraph: {
    title: "Bangkok Machine Shop",
    description: "รับกลึงและผลิตชิ้นส่วนตามแบบ งานละเอียด ส่งมอบรวดเร็ว ราคาเป็นมิตร",
    locale: "th_TH",
    type: "website",
  },
};

export default function Home() {
  return <Dashboard />;
}
