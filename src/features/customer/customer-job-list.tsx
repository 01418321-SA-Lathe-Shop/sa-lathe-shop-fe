"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { JobRequest } from "../../lib/api/backend-api";
import type { FulfillmentJob } from "../delivery/delivery-domain";
import { customerHref, type Collection } from "./customer-domain";
import { jobStatusCounts, matchingJobs } from "./customer-job-list-domain";
import { JobCard, JobCardSkeleton, JobStatusFilters } from "./customer-job-cards";
import { OrderTabs } from "./customer-requests";
import { Empty, Field, Limited, LocalPages, PageTitle, ResourceFeedback } from "./customer-ui";
import styles from "./customer-requests.module.css";

type Read<T> = { data?: Collection<T>; loading: boolean; error?: string; reload: () => void };
export function CustomerJobList({ jobs, requests }: { jobs: Read<FulfillmentJob>; requests: Read<JobRequest> }) {
  const router = useRouter(); const params = useSearchParams(); const q = params.get("q") ?? ""; const status = params.get("status") ?? "";
  const key = JSON.stringify([q, status]); const [paging, setPaging] = useState({ key, page: 0 });
  const items = jobs.data?.items ?? []; const requestItems = requests.data?.items ?? [];
  const lookup = new Map(requestItems.map((request) => [request.id, request]));
  const rows = matchingJobs(items, requestItems, q, status); const counts = jobStatusCounts(items, requestItems, q);
  const page = Math.min(paging.key === key ? paging.page : 0, Math.max(0, Math.ceil(rows.length / 20) - 1));
  const busy = jobs.loading || Boolean(q.trim() && requests.loading);
  const unavailable = Boolean(jobs.error && !jobs.data || q.trim() && requests.error);
  return <section className={styles.list}><OrderTabs active="jobs" /><PageTitle title="งานผลิต" description="งานที่ร้านรับเข้าคิวหลังอนุมัติหลักฐานแล้ว" />
    <form key={key} className={styles.searchForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); router.replace(customerHref("jobs", { q: String(data.get("q") ?? ""), status }), { scroll: false }); }}><Field label="ค้นหางานผลิต"><input name="q" type="search" defaultValue={q} placeholder="เลขคำขอหรือรายละเอียดงาน" /></Field><button type="submit">ค้นหา</button></form>
    <JobStatusFilters counts={counts} query={q} status={status} loading={busy} unavailable={unavailable} />
    {(q || status) && <p className="cust-filter-result">ผลจากการค้นหาและตัวกรอง <Link href="/customer/jobs">ล้างการค้นหาและตัวกรอง</Link></p>}
    <ResourceFeedback {...jobs} loading={false} /><ResourceFeedback {...requests} loading={false} />
    <Limited complete={jobs.data?.complete === false || requests.data?.complete === false ? false : undefined} />
    {requests.error && <p className="cust-alert">ยังโหลดคำขอที่เกี่ยวข้องได้ไม่ครบ การค้นหา ชื่องาน และวันที่บางรายการอาจยังไม่พร้อม</p>}
    <p className="cust-muted cust-small">เรียงตามเลขคำขอจากมากไปน้อย · ค้นหาและนับเฉพาะงานที่โหลดสำเร็จตามสิทธิ์</p>
    {jobs.loading && !jobs.data && <JobCardSkeleton />}
    <div className={styles.grid}>{rows.slice(page * 20, page * 20 + 20).map((job) => <JobCard key={job.job_id} job={job} request={lookup.get(job.request_id)} requestLoading={requests.loading} />)}</div>
    {jobs.data && !busy && !jobs.error && !rows.length && <Empty title={q && requests.error ? "ยังค้นหารายละเอียดงานได้ไม่ครบ" : q || status ? "ไม่พบงานในสถานะหรือคำค้นที่เลือก" : "ยังไม่มีงานผลิต"} action={q && requests.error ? <button onClick={requests.reload}>ลองโหลดคำขออีกครั้ง</button> : <Link href={q || status ? "/customer/jobs" : "/customer/requests"}>{q || status ? "ล้างการค้นหาและตัวกรอง" : "ดูคำขอผลิต"}</Link>}>{q || status ? "ลองเปลี่ยนคำค้นหรือสถานะ งานบางรายการอาจยังโหลดรายละเอียดไม่ได้" : "งานจะปรากฏหลังเจ้าหน้าที่อนุมัติหลักฐานมัดจำ / PO ครบ"}</Empty>}
    <LocalPages count={rows.length} page={page} setPage={(next) => setPaging({ key, page: next })} />
  </section>;
}
