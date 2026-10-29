"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi, JobRequest } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { dateTH, dateTimeTH, requestedDayCountdown } from "../../components/staff-ui/staff-format";
import { JOB_STATUS } from "../../components/staff-ui/staff-labels";
import { Button, EmptyState, LoadError, SearchForm, Skeleton, StatusBadge, StatusTabs, Toast, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection, useNow } from "../customer/customer-hooks";
import type { InventoryPlan } from "../inventory/inventory-domain";
import { ProductionDetail } from "./production-detail";
import { defaultProductionTab, planReadiness, productionCounts, productionRows, productionTab, type ProductionSummary, type ProductionTab, type Readiness } from "./production-list-domain";
import styles from "./production.module.css";

// UC8: any active Staff plans, starts, records and completes any job; Admin
// monitors, reads plans and costs, and enters actual labor cost only.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMPTY: Record<ProductionTab, [string, string]> = {
  queued: ["ไม่มีงานรอเริ่ม", "งานจะเข้าคิวเมื่อมัดจำ/PO ผ่านการตรวจแล้ว"],
  in_progress: ["ไม่มีงานที่กำลังผลิต", "เริ่มงานได้จากแท็บรอเริ่มงาน"],
  completed: ["ยังไม่มีงานที่ผลิตเสร็จ", "งานที่ปิดแล้วจะแสดงที่นี่"],
  all: ["ยังไม่มีงานผลิต", "งานจะเข้าคิวเมื่อมัดจำ/PO ผ่านการตรวจแล้ว"],
};

export function LiveProduction({ api, account }: { api: BackendApi; account: Account }) {
  return <Suspense fallback={<Skeleton label="กำลังเปิดงานผลิต…" />}><ProductionWorkspace api={api} account={account} /></Suspense>;
}

// Plan readiness for every queued job, read six at a time (bounded fan-out).
function usePlanReadiness(api: BackendApi, jobs: ProductionSummary[] | undefined) {
  const [state, setState] = useState<{ source?: ProductionSummary[]; map: Map<string, Readiness | null> }>({ map: new Map() });
  useEffect(() => {
    if (!jobs) return;
    const controller = new AbortController(); const queued = jobs.filter((job) => job.status === "queued");
    void (async () => {
      const map = new Map<string, Readiness | null>();
      for (let start = 0; start < queued.length; start += 6) {
        await Promise.all(queued.slice(start, start + 6).map(async (job) => {
          try { map.set(job.job_id, planReadiness(await api.call<InventoryPlan>(`/jobs/${job.job_id}/materials`, "GET", undefined, controller.signal), job)); }
          catch { map.set(job.job_id, null); }
        }));
        if (controller.signal.aborted) return;
      }
      setState({ source: jobs, map });
    })();
    return () => controller.abort();
  }, [api, jobs]);
  return state.source === jobs ? state.map : undefined;
}

function ProductionWorkspace({ api, account }: { api: BackendApi; account: Account }) {
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter(); const now = useNow();
  const worker = account.role === "worker";
  const raw = params.get("job") ?? ""; const selected = UUID.test(raw) && !/^0{8}-/.test(raw) ? raw : "";
  const q = params.get("q") ?? "";
  const jobs = useCollection<ProductionSummary>(api, "/production/jobs");
  const requests = useCollection<JobRequest>(api, "/requests");
  const items = jobs.data?.items; const requestItems = requests.data?.items ?? [];
  const readiness = usePlanReadiness(api, items);
  const counts = productionCounts(items ?? [], requestItems, q);
  const tab = productionTab(params.get("tab")) ?? defaultProductionTab(counts);
  const rows = productionRows(items ?? [], requestItems, tab, q);
  const lookup = new Map(requestItems.map((request) => [request.id, request]));
  const selectedJob = items?.find((job) => job.job_id === selected);
  const [toast, setToast] = useState(""); const clearToast = () => setToast("");
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) if (value) next.set(key, value); else next.delete(key);
    const query = next.toString(); return query ? `${pathname}?${query}` : pathname;
  };
  const listLoading = jobs.loading && !jobs.data;
  const tabs = [
    { key: "queued", label: "รอเริ่มงาน", count: counts.queued, attention: worker },
    { key: "in_progress", label: "กำลังผลิต", count: counts.in_progress },
    { key: "completed", label: "ผลิตเสร็จ", count: counts.completed },
    { key: "all", label: "ทั้งหมด", count: counts.all },
  ];
  return <section className={styles.page}>
    <div className={styles.toolbar}>
      <StatusTabs label="สถานะงานผลิต" tabs={tabs} current={tab} href={(key) => href({ tab: key, job: undefined })} loading={listLoading} unavailable={Boolean(jobs.error && !jobs.data)} />
      <div className={styles.toolbarEnd}>
        <SearchForm label="ค้นหางานผลิต" placeholder="เลขคำขอหรือชื่องาน" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, job: undefined }), { scroll: false })} />
        <Button onClick={() => { jobs.reload(); requests.reload(); }} disabled={jobs.loading}>อัปเดตข้อมูล</Button>
      </div>
    </div>
    {jobs.error && !jobs.data && <LoadError title="โหลดงานผลิตไม่สำเร็จ" onRetry={jobs.reload} />}
    {requests.error && <p className={styles.warning}>โหลดรายละเอียดคำขอได้ไม่ครบ ชื่องานและการค้นหาบางรายการอาจยังไม่แสดง <Button variant="text" onClick={requests.reload}>ลองอีกครั้ง</Button></p>}
    <TruncatedNotice show={jobs.data?.complete === false || requests.data?.complete === false} />
    {q && <p className={styles.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, job: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
    <div className={styles.layout} data-detail={selected ? "open" : undefined}>
      <div className={styles.list} role="region" aria-label="รายการงานผลิต">
        {listLoading && <Skeleton label="กำลังโหลดงานผลิต…" />}
        {rows.map(({ job, request }) => <JobCard key={job.job_id} job={job} request={request} requestLoading={requests.loading} readiness={readiness ? readiness.get(job.job_id) ?? null : undefined} now={now} worker={worker} selected={selected === job.job_id} href={href({ job: job.job_id, tab })} />)}
        {jobs.data && !rows.length && <EmptyState title={q ? "ไม่พบงานที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขคำขอหรือคำอื่น" : EMPTY[tab][1]}</EmptyState>}
      </div>
      <div className={styles.detail}>
        {selected ? <ProductionDetail key={selected} api={api} account={account} id={selected} request={selectedJob ? lookup.get(selectedJob.request_id) : undefined} requestLoading={requests.loading} now={now} backHref={href({ job: undefined })} onChanged={(message) => { setToast(message); jobs.reload(); }} />
          : <div className={styles.placeholder}><EmptyState title="เลือกงานจากรายการ">เปิดงานเพื่อเตรียมวัตถุดิบ เริ่มผลิต หรือบันทึกงาน</EmptyState></div>}
      </div>
    </div>
    <Toast message={toast} onDone={clearToast} />
  </section>;
}

function readinessText(readiness: Readiness | null | undefined) {
  if (readiness === undefined) return "กำลังตรวจวัตถุดิบ…";
  if (readiness === null) return "ตรวจสถานะวัตถุดิบไม่ได้";
  if (readiness.state === "ready") return "วัตถุดิบพร้อม";
  if (readiness.state === "empty") return "ยังไม่มีแผนวัตถุดิบ";
  if (readiness.state === "changed") return "แผนเปลี่ยน กรุณาอัปเดตข้อมูล";
  return readiness.short ? `วัตถุดิบยังไม่ครบ ${readiness.short} รายการ` : "วัตถุดิบยังจองไม่ครบ";
}

function JobCard({ job, request, requestLoading, readiness, now, worker, selected, href }: { job: ProductionSummary; request?: JobRequest; requestLoading: boolean; readiness: Readiness | null | undefined; now: number | null; worker: boolean; selected: boolean; href: string }) {
  const open = job.status === "queued" || job.status === "in_progress";
  const countdown = open ? requestedDayCountdown(request?.deadline, now) : null;
  const next = !worker ? (job.status === "completed" ? "ดูสรุปและต้นทุน" : "ดูงาน")
    : job.status === "queued" ? (readiness?.state === "ready" ? "เริ่มผลิต" : "เตรียมวัตถุดิบ") : job.status === "in_progress" ? "บันทึกงาน" : "ดูสรุปงาน";
  return <Link href={href} scroll={false} className={styles.card} aria-current={selected ? "true" : undefined}>
    <span className={styles.cardTop}><strong>{request ? `คำขอ #${request.no_request}` : requestLoading ? "กำลังโหลดคำขอ…" : "คำขอผลิต"}</strong><StatusBadge map={JOB_STATUS} value={job.status} /></span>
    <span className={styles.cardTitle}>{request?.description ?? "รายละเอียดงานยังไม่พร้อม"}</span>
    <span className={styles.cardMeta}>{request ? `${request.qty} ชิ้น` : ""}{Number(job.cycle) > 1 ? `${request ? " · " : ""}รอบแก้ไขที่ ${Number(job.cycle) - 1} (แก้ไขฟรี)` : ""}</span>
    {open && <span className={styles.cardMeta}>{request?.deadline ? <>ลูกค้าต้องการ {dateTH(request.deadline)}{countdown && <ToneBadge tone={countdown.tone}>{countdown.text}</ToneBadge>}</> : request ? "ลูกค้าไม่ได้ระบุวันที่ต้องการ" : ""}</span>}
    {job.status === "queued" && <span className={styles.readiness} data-state={readiness === null ? "error" : readiness?.state}>{readinessText(readiness)}</span>}
    {job.status === "in_progress" && <span className={styles.cardMeta}>เริ่มผลิต {dateTimeTH(job.started_at)}</span>}
    {job.status === "completed" && <span className={styles.cardMeta}>ผลิตเสร็จ {dateTimeTH(job.completed_at)}</span>}
    <span className={styles.cardNext}>{next} <Icon name="arrow" size={14} /></span>
  </Link>;
}

// One read for the opened job only; the delivery job list stays a single request.
export function RequestLabel({ api, id }: { api: BackendApi; id: string }) {
  const request = useResource<JobRequest>(api, `/requests/${id}`);
  return <p className="live-description">{request.data ? `Request #${request.data.no_request} · ${request.data.description} · Qty ${request.data.qty}` : request.error ? "Request details unavailable" : "Loading request…"}</p>;
}
