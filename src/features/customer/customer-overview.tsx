"use client";

import Link from "next/link";
import type { BackendApi } from "../../lib/api/backend-api";
import type { FulfillmentJob } from "../delivery/delivery-domain";
import { useMemo } from "react";
import { Icon } from "../../components/appearance/icons";
import { useSalesIndex } from "./customer-sales-data";
import { useCollection, useNow } from "./customer-hooks";
import { customerHref, moneyTH } from "./customer-domain";
import { Limited, PageTitle, ResourceFeedback } from "./customer-ui";
import { invoiceTotal, overviewData } from "./customer-overview-domain";
import { OverviewActivity, OverviewAttention, OverviewPayments, OverviewReady, OverviewWork, PanelState } from "./customer-overview-panels";
import styles from "./customer-overview.module.css";

export function CustomerOverview({ api }: { api: BackendApi }) {
  const sales = useSalesIndex(api);
  const jobs = useCollection<FulfillmentJob>(api, "/fulfillment/jobs");
  const now = useNow();
  const data = useMemo(() => overviewData(sales.records, jobs.data?.items ?? [], now), [sales.records, jobs.data, now]);
  const total = jobs.data ? invoiceTotal(jobs.data.items) : undefined;
  const loading = sales.loading || jobs.loading || now === null;
  const complete = sales.complete && jobs.data?.complete === true;
  const salesKnown = Boolean(sales.data) && !sales.loading;
  const jobsKnown = Boolean(jobs.data);
  const hasError = Boolean(sales.error || jobs.error);
  const count = (known: boolean, value: number) => known ? String(value) : "—";
  const reload = () => { sales.reload(); jobs.reload(); };

  return <div className={styles.dashboard}>
    <PageTitle title="ภาพรวม" description="งานของคุณ การชำระเงิน และความคืบหน้าในที่เดียว"
      action={<Link className="cust-primary" href={customerHref("requests", { view: "new" })}><Icon name="plus" />ส่งคำขอผลิตใหม่</Link>} />
    <nav className={styles.quickActions} aria-label="ทางลัด">
      <span>ทางลัด</span>
      <Link href="/customer/jobs"><Icon name="machine" />ติดตามงานผลิต<Icon name="arrow" size={16} /></Link>
      <Link href="/customer/quotations"><Icon name="file" />ดูใบเสนอราคา<Icon name="arrow" size={16} /></Link>
      <Link href="/customer/payments"><Icon name="wallet" />ชำระเงิน<Icon name="arrow" size={16} /></Link>
      <button type="button" disabled={loading} onClick={reload}><Icon name="clock" size={16} />{loading ? "กำลังอัปเดต…" : "อัปเดตข้อมูล"}</button>
    </nav>
    <ResourceFeedback error={sales.error} reload={sales.reload} /><ResourceFeedback error={jobs.error} reload={jobs.reload} />
    {!loading && <Limited complete={complete} />}
    <dl className={styles.summary} aria-label="สรุปจากข้อมูลที่โหลดได้">
      <div><dt>งานที่ยังดำเนินการ</dt><dd>{count(jobsKnown, data.activeJobs.length)}<span>งาน</span></dd></div>
      <div><dt>ใบเสนอราคารอพิจารณา</dt><dd>{count(salesKnown, data.quotesToReview)}<span>ฉบับ</span></dd></div>
      <div><dt>งานรอตรวจรับ</dt><dd>{count(jobsKnown, data.attention.filter(item => item.action === "ตรวจรับงาน").length)}<span>งาน</span></dd></div>
      <div><dt>ยอดค้างใบแจ้งหนี้</dt><dd className={styles.money}>{total === undefined ? "—" : moneyTH(total)}</dd></div>
    </dl>
    <p className={styles.scope}>{loading ? "กำลังตรวจสอบข้อมูลล่าสุด ตัวเลขที่มีอยู่เป็นข้อมูลที่โหลดได้ก่อนหน้า" : hasError ? "บางข้อมูลยังอัปเดตไม่สำเร็จ กรุณาลองอีกครั้งก่อนตัดสินใจ" : complete ? "สรุปจากรายการที่คุณมีสิทธิ์ดู · ยอดค้างไม่รวมมัดจำที่ยังไม่ได้ส่งหลักฐาน" : "สรุปเฉพาะรายการที่โหลดได้ อาจยังมีงานหรือยอดค้างรายการอื่น"}</p>
    <section className={styles.attention} aria-labelledby="overview-attention">
      <div className={styles.sectionHead}><h2 id="overview-attention">สิ่งที่คุณต้องทำ</h2><span>{!loading ? `${data.attention.length} รายการ${!complete || hasError ? "ที่พบ" : ""}` : "กำลังตรวจสอบ"}</span></div>
      {loading && !data.attention.length ? <PanelState loading /> : !data.attention.length && hasError ? <PanelState unavailable /> : <OverviewAttention items={data.attention} complete={complete && !hasError} />}
    </section>
    <div className={styles.columns}>
      <div className={styles.column}>
        <section className={styles.panel} aria-labelledby="overview-payments">
          <div className={styles.sectionHead}><h2 id="overview-payments">การชำระเงินที่ต้องจัดการ</h2><Link href="/customer/payments">ดูทั้งหมด<Icon name="arrow" size={16} /></Link></div>
          <p className={styles.hint}>ยอดคงเหลือและกำหนดชำระตามใบแจ้งหนี้ · ชำระเป็นงวดได้</p>
          {!jobsKnown ? <PanelState loading={jobs.loading} unavailable={Boolean(jobs.error)} /> : <OverviewPayments items={data.payments} now={now} />}
        </section>
        <section className={styles.panel} aria-labelledby="overview-work">
          <div className={styles.sectionHead}><h2 id="overview-work">งานที่กำลังดำเนินการ</h2><Link href="/customer/jobs">งานผลิตทั้งหมด<Icon name="arrow" size={16} /></Link></div>
          {!jobsKnown ? <PanelState loading={jobs.loading} unavailable={Boolean(jobs.error)} /> : <OverviewWork items={data.activeJobs} />}
          {salesKnown && sales.records.some(record => !record.fulfillment?.job && !["completed", "canceled"].includes(record.request.status)) && <Link className={styles.bottomLink} href="/customer/requests">ดูคำขอที่ยังไม่เปิดงานผลิต<Icon name="arrow" size={16} /></Link>}
        </section>
      </div>
      <div className={styles.column}>
        <section className={styles.panel} aria-labelledby="overview-ready">
          <div className={styles.sectionHead}><h2 id="overview-ready">งานผลิตเสร็จ / รอรับงาน</h2><Icon name="truck" size={22} /></div>
          <p className={styles.hint}>ดูว่างานไหนจัดส่งแล้ว หรืองานไหนผลิตเสร็จ</p>
          {!jobsKnown ? <PanelState loading={jobs.loading} unavailable={Boolean(jobs.error)} /> : <OverviewReady items={data.ready} />}
          {data.ready.length > 4 && <Link className={styles.bottomLink} href="/customer/jobs">ดูงานผลิตทั้งหมด · พบงานผลิตเสร็จ / รอรับ {data.ready.length} งาน<Icon name="arrow" size={16} /></Link>}
          <p className={styles.dateNote}><Icon name="clock" size={16} />ยังไม่มีวันรับงานที่ร้านยืนยันในข้อมูลนี้ ไม่ใช้วันที่ลูกค้าต้องการแทนกำหนดส่ง</p>
        </section>
        <section className={styles.panel} aria-labelledby="overview-updates">
          <div className={styles.sectionHead}><h2 id="overview-updates">อัปเดตงานล่าสุด</h2><Icon name="layers" size={20} /></div>
          <p className={styles.hint}>ประวัติตามเวลาที่บันทึก · ไม่ใช่ฟีดแบบเรียลไทม์</p>
          {loading && !data.updates.length ? <PanelState loading /> : !data.updates.length && hasError ? <PanelState unavailable /> : <OverviewActivity items={data.updates} now={now} />}
        </section>
      </div>
    </div>
    <p className={styles.footnote}>เวลาแสดงตามประเทศไทย · เงินบาท · ไม่มี VAT</p>
  </div>;
}
