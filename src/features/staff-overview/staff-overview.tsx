"use client";

import { useRef, useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi, Notification } from "../../lib/api/backend-api";
import { formatBangkok } from "../../lib/formatting/display";
import { useCollection } from "../customer/customer-hooks";
import { noticesOn, RANGES, type Filter, type JobStatus, type OverviewReport, type Range } from "./overview-domain";
import { OverviewJobs } from "./overview-jobs";
import { OverviewHeatmap } from "./overview-heatmap";
import { PriorityQueue, ReportError, SummaryStrip, TodayDigest } from "./overview-panels";
import { useReport } from "./overview-resource";
import styles from "./overview.module.css";

export function StaffOverview({ api, admin }: { api: BackendApi; admin: boolean }) {
  const [filter, setFilter] = useState<Filter>({ range: "30d", status: "", day: "", offset: 0 });
  const report = useReport<OverviewReport>(api, `/dashboard/overview?range=${filter.range}`);
  const today = useReport<OverviewReport>(api, "/dashboard/overview?range=today");
  const notices = useCollection<Notification>(api, "/notifications");
  const jobsHeading = useRef<HTMLHeadingElement>(null);
  function showJobs(next: Partial<Filter>) {
    setFilter(value => ({ ...value, status: "", day: "", offset: 0, ...next }));
    requestAnimationFrame(() => { jobsHeading.current?.focus({ preventScroll: true }); jobsHeading.current?.scrollIntoView({ block: "start" }); });
  }
  const refresh = () => { report.reload(); today.reload(); notices.reload(); };
  return <div className={styles.dashboard}>
    <div className={styles.toolbar}><p className={styles.muted}>คิวร่วมของร้าน{report.data && <> · อัปเดต {formatBangkok(report.data.as_of)}</>}</p><div className={styles.controls}><label>ช่วงเวลาที่เปิดงาน<select value={filter.range} onChange={event => setFilter(value => ({ ...value, range: event.target.value as Range, day: "", offset: 0 }))}>{Object.entries(RANGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={refresh} disabled={report.loading}><Icon name="clock" size={16} />รีเฟรชสรุป</button></div><ReportError error={report.error} retry={report.reload} /><ReportError error={today.error} retry={today.reload} /><ReportError error={notices.error} retry={notices.reload} />{report.loading && report.data && <p className={styles.muted} role="status">กำลังอัปเดตสรุป ตัวเลขที่เห็นเป็นข้อมูลที่โหลดได้ก่อนหน้า</p>}</div>
    <SummaryStrip data={report.data} loading={report.loading} selected={filter.day ? "" : filter.status} choose={(status: JobStatus) => showJobs({ status })} />
    <TodayDigest admin={admin} inbox={`${admin ? "/admin" : "/staff"}/inbox`} report={today.data} notices={today.data && notices.data ? noticesOn(notices.data.items, today.data.heatmap.end_date) : undefined} choose={{ opened: () => showJobs({ range: "today" }), finished: day => showJobs({ day }), active: filter }} />
    <OverviewHeatmap api={api} data={report.data?.heatmap} loading={report.loading} selected={filter.day} choose={day => showJobs({ day })} />
    <PriorityQueue data={report.data} admin={admin} />
    <OverviewJobs api={api} admin={admin} filter={filter} setFilter={setFilter} counts={report.data?.counts} heading={jobsHeading} />
  </div>;
}
