"use client";

import { useRef, useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi } from "../../lib/api/backend-api";
import { formatBangkok } from "../../lib/formatting/display";
import { RANGES, type Filter, type JobStatus, type OverviewReport, type Range } from "./overview-domain";
import { OverviewJobs } from "./overview-jobs";
import { PriorityQueue, QuickActions, ReportError, Skeleton, SummaryCards } from "./overview-panels";
import { useReport } from "./overview-resource";
import styles from "./overview.module.css";

export function StaffOverview({ api, admin }: { api: BackendApi; admin: boolean }) {
  const [filter, setFilter] = useState<Filter>({ range: "30d", status: "", day: "", offset: 0 });
  const report = useReport<OverviewReport>(api, `/dashboard/overview?range=${filter.range}`);
  const jobsHeading = useRef<HTMLHeadingElement>(null);
  function chooseStatus(status: JobStatus) {
    setFilter(value => ({ ...value, status, day: "", offset: 0 }));
    requestAnimationFrame(() => { jobsHeading.current?.focus({ preventScroll: true }); jobsHeading.current?.scrollIntoView({ block: "start" }); });
  }
  return <div className={styles.dashboard}>
    <div className={styles.toolbar}><p className={styles.muted}>คิวร่วมของร้าน{report.data && <> · อัปเดต {formatBangkok(report.data.as_of)}</>}</p><div className={styles.controls}><label>ช่วงเวลาที่เปิดงาน<select value={filter.range} onChange={event => setFilter(value => ({ ...value, range: event.target.value as Range, day: "", offset: 0 }))}>{Object.entries(RANGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={report.reload} disabled={report.loading}><Icon name="clock" size={16} />รีเฟรชสรุป</button></div><ReportError error={report.error} retry={report.reload} />{report.loading && report.data && <p className={styles.muted} role="status">กำลังอัปเดตสรุป ตัวเลขที่เห็นเป็นข้อมูลที่โหลดได้ก่อนหน้า</p>}</div>
    <SummaryCards data={report.data} loading={report.loading} selected={filter.day ? "" : filter.status} choose={chooseStatus} />
    <aside className={styles.rail}><PriorityQueue data={report.data} admin={admin} /><QuickActions admin={admin} /></aside>
    <section className={`${styles.panel} ${styles.activity}`} aria-labelledby="staff-activity"><h2 id="staff-activity">ประวัติผลิตเสร็จ</h2><p className={styles.muted}>ย้อนหลัง 12 เดือน · หนึ่ง Job นับครั้งแรกเพียงครั้งเดียว</p>{report.loading && !report.data ? <Skeleton /> : <p className={styles.muted}>ส่วนแสดง heatmap อยู่ระหว่างการเชื่อมต่อในชุดงานถัดไป</p>}</section>
    <OverviewJobs api={api} admin={admin} filter={filter} setFilter={setFilter} counts={report.data?.counts} heading={jobsHeading} />
  </div>;
}
