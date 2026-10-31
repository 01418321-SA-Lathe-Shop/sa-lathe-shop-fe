"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi, JobRequest } from "../../lib/api/backend-api";
import { dateTH, dateTimeTH, requestedDayCountdown } from "../../components/staff-ui/staff-format";
import { JOB_STATUS } from "../../components/staff-ui/staff-labels";
import { Button, EmptyState, LoadError, SearchForm, Skeleton, StatusBadge, StatusTabs, Toast, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection, useNow } from "../customer/customer-hooks";
import type { InventoryPlan } from "../inventory/inventory-domain";
import { ProductionDetail } from "./production-detail";
import { defaultProductionTab, planReadiness, productionCounts, productionRows, productionTab, productionView, type ProductionSummary, type ProductionTab, type Readiness } from "./production-list-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
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
  const cardView = productionView(params.get("view"), params.get("layout")) === "cards";
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
  return <section className={layout.page}>
    <div className={layout.toolbar}>
      <div className={styles.toolbarHead}>
        <StatusTabs label="สถานะงานผลิต" tabs={tabs} current={tab} href={(key) => href({ tab: key, job: undefined })} loading={listLoading} unavailable={Boolean(jobs.error && !jobs.data)} />
        <nav className={styles.viewSwitch} aria-label="รูปแบบการแสดงงานผลิต">
          <Link href={href({ view: undefined, layout: undefined, job: undefined })} scroll={false} aria-current={cardView ? "page" : undefined}><Icon name="grid" size={17} /> การ์ด</Link>
          <Link href={href({ view: "list", layout: undefined, job: undefined })} scroll={false} aria-current={!cardView ? "page" : undefined}><Icon name="file" size={17} /> รายการ</Link>
        </nav>
      </div>
      <div className={layout.toolbarEnd}>
        <SearchForm label="ค้นหางานผลิต" placeholder="เลขคำขอหรือชื่องาน" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, job: undefined }), { scroll: false })} />
        <Button onClick={() => { jobs.reload(); requests.reload(); }} disabled={jobs.loading}>อัปเดตข้อมูล</Button>
      </div>
    </div>
    {jobs.error && !jobs.data && <LoadError title="โหลดงานผลิตไม่สำเร็จ" onRetry={jobs.reload} />}
    {requests.error && <p className={layout.warning}>โหลดรายละเอียดคำขอได้ไม่ครบ ชื่องานและการค้นหาบางรายการอาจยังไม่แสดง <Button variant="text" onClick={requests.reload}>ลองอีกครั้ง</Button></p>}
    <TruncatedNotice show={jobs.data?.complete === false || requests.data?.complete === false} />
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, job: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
    {cardView ? (
      <div className={styles.cardWorkspace}>
        <div className={styles.cardGrid} role="region" aria-label="งานผลิตแบบการ์ด">
          {listLoading && <Skeleton label="กำลังโหลดงานผลิต…" />}
          {rows.map(({ job, request }) => <JobCard key={job.job_id} job={job} request={request} requestLoading={requests.loading} readiness={readiness ? readiness.get(job.job_id) ?? null : undefined} now={now} worker={worker} selected={selected === job.job_id} href={href({ job: job.job_id, tab })} grid />)}
          {jobs.data && !rows.length && <EmptyState title={q ? "ไม่พบงานที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขคำขอหรือคำอื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
      </div>
    ) : selected ? (
      <div className={`${layout.layout} ${styles.splitLayout}`} data-detail="open">
        <div className={layout.list} role="region" aria-label="รายการงานผลิต">
          {listLoading && <Skeleton label="กำลังโหลดงานผลิต…" />}
          {rows.map(({ job, request }) => <JobCard key={job.job_id} job={job} request={request} requestLoading={requests.loading} readiness={readiness ? readiness.get(job.job_id) ?? null : undefined} now={now} worker={worker} selected={selected === job.job_id} href={href({ job: job.job_id, tab })} compact />)}
          {jobs.data && !rows.length && <EmptyState title={q ? "ไม่พบงานที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขคำขอหรือคำอื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
        <div className={layout.detail}>
          <ProductionDetail key={selected} api={api} account={account} id={selected} request={selectedJob ? lookup.get(selectedJob.request_id) : undefined} requestLoading={requests.loading} now={now} backHref={href({ job: undefined })} onChanged={(message) => { setToast(message); jobs.reload(); }} />
        </div>
      </div>
    ) : (
      <div className={styles.fullListWorkspace}>
        <div className={styles.fullList} role="region" aria-label="รายการงานผลิต">
          {listLoading && <Skeleton label="กำลังโหลดงานผลิต…" />}
          {rows.map(({ job, request }) => <JobCard key={job.job_id} job={job} request={request} requestLoading={requests.loading} readiness={readiness ? readiness.get(job.job_id) ?? null : undefined} now={now} worker={worker} selected={false} href={href({ job: job.job_id, tab })} row />)}
          {jobs.data && !rows.length && <EmptyState title={q ? "ไม่พบงานที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขคำขอหรือคำอื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
      </div>
    )}
    {cardView && selected && <ProductionModal closeHref={href({ job: undefined })} returnFocusId={`production-card-${selected}`} onClose={() => router.replace(href({ job: undefined }), { scroll: false })}>
      <ProductionDetail key={selected} api={api} account={account} id={selected} request={selectedJob ? lookup.get(selectedJob.request_id) : undefined} requestLoading={requests.loading} now={now} backHref={href({ job: undefined })} onChanged={(message) => { setToast(message); jobs.reload(); }} />
    </ProductionModal>}
    <Toast message={toast} onDone={clearToast} />
  </section>;
}

function ProductionModal({ closeHref, returnFocusId, onClose, children }: { closeHref: string; returnFocusId: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current; if (node && !node.open) node.showModal();
    return () => document.getElementById(returnFocusId)?.focus();
  }, [returnFocusId]);
  return <dialog ref={dialog} className={styles.productionModal} aria-label="รายละเอียดงานผลิต" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.modalFrame}>
      <div className={styles.modalToolbar}><span>รายละเอียดงานผลิต</span><Link href={closeHref} scroll={false} aria-label="ปิดรายละเอียดงานผลิต"><Icon name="close" size={20} /></Link></div>
      <div className={styles.modalBody}>{children}</div>
    </div>
  </dialog>;
}

function readinessText(readiness: Readiness | null | undefined) {
  if (readiness === undefined) return "กำลังตรวจวัตถุดิบ…";
  if (readiness === null) return "ตรวจสถานะวัตถุดิบไม่ได้";
  if (readiness.state === "ready") return "วัตถุดิบพร้อม";
  if (readiness.state === "empty") return "ยังไม่มีแผนวัตถุดิบ";
  if (readiness.state === "changed") return "แผนเปลี่ยน กรุณาอัปเดตข้อมูล";
  return "วัตถุดิบยังไม่ครบ";
}

function JobCard({ job, request, requestLoading, readiness, now, worker, selected, href, grid = false, row = false, compact = false }: { job: ProductionSummary; request?: JobRequest; requestLoading: boolean; readiness: Readiness | null | undefined; now: number | null; worker: boolean; selected: boolean; href: string; grid?: boolean; row?: boolean; compact?: boolean }) {
  const open = job.status === "queued" || job.status === "in_progress";
  const countdown = open ? requestedDayCountdown(request?.deadline, now) : null;
  const next = !worker ? (job.status === "completed" ? "ดูสรุปและต้นทุน" : "ดูงาน")
    : job.status === "queued" ? (readiness?.state === "ready" ? "เริ่มผลิต" : "เตรียมวัตถุดิบ") : job.status === "in_progress" ? "บันทึกงาน" : "ดูสรุปงาน";

  if (grid) {
    return <Link id={`production-card-${job.job_id}`} href={href} scroll={false} className={styles.gridCard} aria-current={selected ? "true" : undefined}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.metaLabel}>คำขอ</span>
          <strong>#{request ? request.no_request : requestLoading ? "…" : job.job_id}</strong>
        </div>
      </div>
      <h3 className={styles.cardTitle}>{request?.description ?? "รายละเอียดงานยังไม่พร้อม"}</h3>
      <div className={styles.cardStatus}>
        <StatusBadge map={JOB_STATUS} value={job.status} />
      </div>
      <dl className={styles.essentials}>
        <div>
          <dt>จำนวน</dt>
          <dd>{request ? `${request.qty} ชิ้น` : requestLoading ? "…" : "—"}</dd>
        </div>
        <div>
          <dt><Icon name="clock" size={14} /> วันที่ต้องการ</dt>
          <dd>{request?.deadline ? <time dateTime={request.deadline}>{dateTH(request.deadline)}</time> : request ? "ไม่ได้ระบุ" : "—"}</dd>
        </div>
      </dl>
      <div className={styles.cardStep}>
        {job.status === "queued" && <span className={styles.readiness} data-state={readiness === null ? "error" : readiness?.state}>{readinessText(readiness)}</span>}
        {job.status === "in_progress" && <span>เริ่มผลิต {dateTimeTH(job.started_at)}</span>}
        {job.status === "completed" && <span>ผลิตเสร็จ {dateTimeTH(job.completed_at)}</span>}
        {countdown && <ToneBadge tone={countdown.tone}>{countdown.text}</ToneBadge>}
        {Number(job.cycle) > 1 && <span className={styles.cycleNote}>รอบแก้ไขที่ {Number(job.cycle) - 1} (แก้ไขฟรี)</span>}
      </div>
      <footer className={styles.cardFooter}>
        <span className={styles.openHint}>{next} <Icon name="arrow" size={14} /></span>
      </footer>
    </Link>;
  }

  if (compact) {
    return <Link id={`production-card-${job.job_id}`} href={href} scroll={false} className={`${layout.card} ${styles.compactCard}`} aria-current={selected ? "true" : undefined} aria-label={`${request ? `คำขอ #${request.no_request} · ` : ""}${request?.description ?? "รายละเอียดงานยังไม่พร้อม"}`}>
      <span className={layout.cardTop}><strong>{request ? `คำขอ #${request.no_request}` : requestLoading ? "กำลังโหลดคำขอ…" : "คำขอผลิต"}</strong><StatusBadge map={JOB_STATUS} value={job.status} /></span>
      <span className={layout.cardTitle}>{request?.description ?? (requestLoading ? "กำลังโหลดชื่องาน…" : "รายละเอียดงานยังไม่พร้อม")}</span>
    </Link>;
  }

  return <Link id={`production-card-${job.job_id}`} href={href} scroll={false} className={`${layout.card} ${row ? styles.rowCard : ""}`} aria-current={selected ? "true" : undefined}>
    <div className={row ? styles.rowMain : undefined}>
      <span className={layout.cardTop}><strong>{request ? `คำขอ #${request.no_request}` : requestLoading ? "กำลังโหลดคำขอ…" : "คำขอผลิต"}</strong>{!row && <StatusBadge map={JOB_STATUS} value={job.status} />}</span>
      <span className={layout.cardTitle}>{request?.description ?? "รายละเอียดงานยังไม่พร้อม"}</span>
      {row && <span className={layout.cardMeta}>{request ? `${request.qty} ชิ้น` : ""}{Number(job.cycle) > 1 ? `${request ? " · " : ""}รอบแก้ไขที่ ${Number(job.cycle) - 1} (แก้ไขฟรี)` : ""}</span>}
    </div>
    {row && <div className={styles.rowStatus}>
      <StatusBadge map={JOB_STATUS} value={job.status} />
      {job.status === "queued" && <span className={styles.readiness} data-state={readiness === null ? "error" : readiness?.state}>{readinessText(readiness)}</span>}
    </div>}
    <div className={row ? styles.rowMeta : undefined}>
      {row && open && <span className={layout.cardMeta}>{request?.deadline ? <>ลูกค้าต้องการ {dateTH(request.deadline)}{countdown && <ToneBadge tone={countdown.tone}>{countdown.text}</ToneBadge>}</> : request ? "ลูกค้าไม่ได้ระบุวันที่ต้องการ" : ""}</span>}
      {!row && job.status === "queued" && <span className={styles.readiness} data-state={readiness === null ? "error" : readiness?.state}>{readinessText(readiness)}</span>}
      {row && job.status === "in_progress" && <span className={layout.cardMeta}>เริ่มผลิต {dateTimeTH(job.started_at)}</span>}
      {row && job.status === "completed" && <span className={layout.cardMeta}>ผลิตเสร็จ {dateTimeTH(job.completed_at)}</span>}
    </div>
    {row && <span className={layout.cardNext}>{next} <Icon name="arrow" size={14} /></span>}
  </Link>;
}
