"use client";

import type { BackendApi, JobRequest } from "../../lib/api/backend-api";
import { JOB_STATUS } from "../../components/staff-ui/staff-labels";
import { LoadError, Skeleton, StatusBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import type { ProductionSummary } from "../production/production-list-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./procurement.module.css";

// Job references are informational (UC6 Option A). Names come from the job's
// request, so these lists are only mounted where jobs are shown or chosen.
function useJobLabels(api: BackendApi) {
  const jobs = useCollection<ProductionSummary>(api, "/production/jobs");
  const requests = useCollection<JobRequest>(api, "/requests");
  const lookup = new Map((requests.data?.items ?? []).map((request) => [request.id, request]));
  const label = (job: ProductionSummary) => { const request = lookup.get(job.request_id); return request ? `คำขอ #${request.no_request} · ${request.description}` : requests.loading ? "กำลังโหลดคำขอ…" : "คำขอผลิต"; };
  return { jobs, requests, label, reload: () => { jobs.reload(); requests.reload(); } };
}

export function RelatedJobs({ api, ids }: { api: BackendApi; ids: string[] }) {
  const { jobs, requests, label, reload } = useJobLabels(api);
  if (jobs.loading && !jobs.data) return <Skeleton label="กำลังโหลดงานที่เกี่ยวข้อง…" rows={1} />;
  if ((jobs.error && !jobs.data) || requests.error) return <LoadError title="โหลดชื่องานที่เกี่ยวข้องไม่สำเร็จ" onRetry={reload} />;
  return <ul className={styles.lines}>{ids.map((id) => {
    const job = jobs.data?.items.find((item) => item.job_id === id);
    return <li key={id}><span>{job ? label(job) : "งานที่ไม่อยู่ในรายการงานผลิต"}</span>{job && <StatusBadge map={JOB_STATUS} value={job.status} />}</li>;
  })}</ul>;
}

export function JobChooser({ api, value, disabled, onChange }: { api: BackendApi; value: string[]; disabled: boolean; onChange: (ids: string[]) => void }) {
  const { jobs, requests, label, reload } = useJobLabels(api);
  const open = (jobs.data?.items ?? []).filter((job) => job.status !== "completed");
  if (jobs.loading && !jobs.data) return <Skeleton label="กำลังโหลดงาน…" rows={2} />;
  if (jobs.error && !jobs.data) return <LoadError title="โหลดรายการงานไม่สำเร็จ" onRetry={reload} />;
  return <>
    {requests.error && <p className={layout.warning}>โหลดชื่องานไม่ครบ เลือกได้ตามปกติ แต่บางรายการอาจแสดงเป็น “คำขอผลิต”</p>}
    <TruncatedNotice show={jobs.data?.complete === false} />
    {open.length ? <div className={styles.jobs}>{open.map((job) => <label key={job.job_id} className={layout.toggle}>
      <input type="checkbox" disabled={disabled || (!value.includes(job.job_id) && value.length >= 100)} checked={value.includes(job.job_id)} onChange={(event) => onChange(event.target.checked ? [...value, job.job_id] : value.filter((id) => id !== job.job_id))} />
      <span>{label(job)}</span><StatusBadge map={JOB_STATUS} value={job.status} />
    </label>)}</div> : <p className={layout.muted}>ไม่มีงานที่ยังเปิดอยู่</p>}
  </>;
}
