"use client";
import { useRouter } from "next/navigation";
import { Logo, Icon, ThemeToggle } from "./appearance";
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


export default function Dashboard() {
  const router = useRouter();
  return <Landing enter={() => router.push("/login")} register={() => router.push("/register")} />;
}
