"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi, Notification } from "../../lib/api/backend-api";
import { formatBangkok } from "../../lib/formatting/display";
import { useCollection } from "../customer/customer-hooks";
import { PAGE_LABELS } from "../workspace/workspace-routes";
import type { WorkspaceId } from "../workspace/workspace-access";
import { noticesOn, RANGES, type Filter, type JobStatus, type OverviewReport, type Range } from "./overview-domain";
import { OverviewJobs } from "./overview-jobs";
import { OverviewHeatmap } from "./overview-heatmap";
import { BusinessPanels, BusinessStrip, businessTasks, JobStatusChart, OperationPanels, operationTasks, useAdminBusiness, useOperations } from "./overview-insights";
import { actionTotal, PriorityQueue, ReportError, SummaryStrip, TodayDigest, type ActionTask } from "./overview-panels";
import { useReport } from "./overview-resource";
import styles from "./overview.module.css";

const QUICK_LINKS: Record<"staff" | "admin", WorkspaceId[]> = {
  staff: ["quotations", "production", "materials", "receiving", "delivery-payment"],
  admin: ["requests", "orders", "materials", "delivery-payment", "workers"],
};

export function StaffOverview({ api, admin }: { api: BackendApi; admin: boolean }) {
  return admin ? <AdminBoard api={api} /> : <StaffBoard api={api} />;
}

function StaffBoard({ api }: { api: BackendApi }) {
  const ops = useOperations(api);
  return <Board api={api} admin={false} tasks={operationTasks(ops, "/staff")} reload={ops.reload} panels={<OperationPanels ops={ops} root="/staff" />} />;
}

function AdminBoard({ api }: { api: BackendApi }) {
  const ops = useOperations(api); const business = useAdminBusiness(api, ops.now);
  return <Board api={api} admin tasks={[...businessTasks(business), ...operationTasks(ops, "/admin")]} reload={() => { ops.reload(); business.reload(); }}
    strip={<BusinessStrip business={business} requests={ops.requests.data?.items} loading={business.fulfillment.loading} />}
    panels={<><BusinessPanels business={business} /><OperationPanels ops={ops} root="/admin" /></>} />;
}

function Board({ api, admin, tasks, reload, strip, panels }: { api: BackendApi; admin: boolean; tasks: ActionTask[]; reload: () => void; strip?: ReactNode; panels: ReactNode }) {
  const [filter, setFilter] = useState<Filter>({ range: "30d", status: "", day: "", offset: 0 });
  const report = useReport<OverviewReport>(api, `/dashboard/overview?range=${filter.range}`);
  const today = useReport<OverviewReport>(api, "/dashboard/overview?range=today");
  const notices = useCollection<Notification>(api, "/notifications");
  const jobsHeading = useRef<HTMLHeadingElement>(null);
  const root = admin ? "/admin" : "/staff";
  function showJobs(next: Partial<Filter>) {
    setFilter(value => ({ ...value, status: "", day: "", offset: 0, ...next }));
    requestAnimationFrame(() => { jobsHeading.current?.focus({ preventScroll: true }); jobsHeading.current?.scrollIntoView({ block: "start" }); });
  }
  const refresh = () => { report.reload(); today.reload(); notices.reload(); reload(); };
  return <div className={styles.dashboard}>
    <div className={styles.toolbar}><p className={styles.muted}>{admin ? "ภาพรวมทั้งร้าน" : "คิวร่วมของร้าน"}{report.data && <> · อัปเดต {formatBangkok(report.data.as_of)}</>}</p><div className={styles.controls}><label>ช่วงเวลาที่เปิดงาน<select value={filter.range} onChange={event => setFilter(value => ({ ...value, range: event.target.value as Range, day: "", offset: 0 }))}>{Object.entries(RANGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={refresh} disabled={report.loading}><Icon name="clock" size={16} />รีเฟรชสรุป</button></div><ReportError error={report.error} retry={report.reload} /><ReportError error={today.error} retry={today.reload} /><ReportError error={notices.error} retry={notices.reload} />{report.loading && report.data && <p className={styles.muted} role="status">กำลังอัปเดตสรุป ตัวเลขที่เห็นเป็นข้อมูลที่โหลดได้ก่อนหน้า</p>}</div>
    <SummaryStrip data={report.data} loading={report.loading} total={report.data ? actionTotal(report.data.queue, tasks) : undefined} selected={filter.day ? "" : filter.status} choose={(status: JobStatus) => showJobs({ status })} />
    {strip}
    <nav className={styles.quickLinks} aria-label="ไปยังงานที่ใช้บ่อย">{QUICK_LINKS[admin ? "admin" : "staff"].map(id => <Link key={id} href={`${root}/${id}`}>{PAGE_LABELS[id]}<Icon name="arrow" size={14} /></Link>)}</nav>
    <PriorityQueue data={report.data} admin={admin} extra={tasks} />
    <div className={styles.insights} data-role={admin ? "admin" : "staff"}>
      <JobStatusChart data={report.data} loading={report.loading} choose={status => showJobs({ status })} />
      {panels}
    </div>
    <TodayDigest admin={admin} inbox={`${root}/inbox`} report={today.data} notices={today.data && notices.data ? noticesOn(notices.data.items, today.data.heatmap.end_date) : undefined} choose={{ opened: () => showJobs({ range: "today" }), finished: day => showJobs({ day }), active: filter }} />
    <OverviewHeatmap api={api} data={report.data?.heatmap} loading={report.loading} selected={filter.day} choose={day => showJobs({ day })} />
    <OverviewJobs api={api} admin={admin} filter={filter} setFilter={setFilter} counts={report.data?.counts} heading={jobsHeading} />
  </div>;
}
