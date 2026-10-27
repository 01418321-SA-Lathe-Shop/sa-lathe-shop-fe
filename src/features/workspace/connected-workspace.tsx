"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";

import type { ApiSession } from "../auth/api-session";
import type { BackendApi, JobRequest, Notification, Page } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { Feedback, Paging } from "../../components/ui/backend-ui";
import { LiveRequests } from "../requests/requests";
import { LiveWorkers } from "../workers/workers";
import { LiveInventory } from "../inventory/inventory";
import { LiveMaterialPlan } from "../inventory/material-plan";
import { Inbox } from "../inbox/inbox";
import { Memberships } from "../memberships/memberships";

import { LiveProcurement } from "../procurement/procurement";
import { LiveReceiving } from "../receiving/receiving";
import { LiveProduction } from "../production/production";
import { LiveDelivery } from "../delivery/delivery";
import { formatBangkok } from "../../lib/formatting/display";
import { getWorkspaces, type Role, type WorkspaceId } from "./workspace-access";
import { PAGE_LABELS, workspacePath } from "./workspace-routes";

import { workspaceIcons as icons } from "./workspace-icons";
export type ProductionSummary = { job_id: string; request_id: string; status: string; version: number | string; material_plan_version: number | string; cycle: number | string; started_at?: string; completed_at?: string };

export default function ConnectedWorkspace({ role, workspaceId, session }: { role: Role; workspaceId: WorkspaceId; session: ApiSession }) {
  const { api, account } = session;
  switch (workspaceId) {
    case "overview": return <Overview role={role} api={api} />;
    case "requests": return <LiveRequests api={api} account={account} focus={role === "Customer" ? "request" : "all"} />;
    case "quotations": return <LiveRequests api={api} account={account} focus={role === "Customer" ? "quotations" : "all"} />;
    case "deposit-po": return <LiveRequests api={api} account={account} focus="fulfillment" />;
    case "materials": return <><LiveInventory api={api} account={account} /><JobPlans api={api} session={session} /></>;
    case "orders": return <LiveProcurement api={api} />;
    case "receiving": return <LiveReceiving api={api} account={account} />;
    case "production": return <LiveProduction api={api} account={account} />;
    case "delivery-payment": return <LiveDelivery api={api} account={account} />;
    case "workers": return <LiveWorkers api={api} />;
    case "inbox": return <Inbox api={api} />;
    case "memberships": return <Memberships api={api} />;
  }
}

// Plans belong to real UC4-opened jobs; the production job list is the backend's
// own job index (UC8), so no general job endpoint is invented here.
function JobPlans({ api, session }: { api: BackendApi; session: ApiSession }) {
  const [offset, setOffset] = useState(0); const [selected, setSelected] = useState("");
  const jobs = useResource<{ items: ProductionSummary[] | null }>(api, `/production/jobs?limit=20&offset=${offset}`);
  const admin = session.account.role === "admin";
  return <section className="record-detail live-section" aria-label="Job material plans">
    <div className="workflow-toolbar"><h2>Job material plans</h2><button onClick={jobs.reload}>Refresh jobs</button></div>
    <p>{admin ? "Read-only view of each job's saved plan and reservations. Staff edit plans for queued jobs." : "Plan and reserve materials for queued jobs. Production locks the plan once started."}</p>
    <Feedback busy={jobs.loading} error={jobs.error} />
    {jobs.data && <>{!jobs.data.items?.length && <p>No jobs yet. A job opens after the required Deposit/PO approvals.</p>}
      {jobs.data.items?.map((job) => <article className="live-inventory-row" key={job.job_id}>
        <h3>Job <span className="record-id">{job.job_id.slice(0, 8)}</span> · <span className={`record-status status-${job.status}`}>{job.status}</span></h3>
        <p>Plan version {String(job.material_plan_version)} · Cycle {String(job.cycle)}{job.started_at ? ` · Started ${formatBangkok(job.started_at)}` : ""}</p>
        <button aria-expanded={selected === job.job_id} onClick={() => setSelected(selected === job.job_id ? "" : job.job_id)}>{selected === job.job_id ? "Close plan" : "Open plan"}</button>
        {selected === job.job_id && <LiveMaterialPlan api={api} account={session.account} jobId={job.job_id} writable={job.status === "queued"} />}
      </article>)}
      <Paging offset={offset} count={jobs.data.items?.length ?? 0} busy={jobs.loading} setOffset={setOffset} /></>}
  </section>;
}

// Counts come from the first 100 records of real list endpoints, never fixtures.
function Overview({ role, api }: { role: Role; api: BackendApi }) {
  const items = getWorkspaces(role);
  return <>
    <section className="workspace-stats">{role === "Customer" ? <CustomerStats api={api} /> : <StaffStats api={api} admin={role === "Admin"} />}</section>
    <section className="workspace-links">{items.map(item => <Link key={item.id} className="panel workspace-link-card" href={workspacePath(role, item.id)}><span className="workspace-card-icon"><Icon name={icons[item.id]} size={25}/></span><span className="eyebrow">{item.useCase}</span><h2>{PAGE_LABELS[item.id]}</h2><p>{item.description}</p><span className="workspace-card-action">เปิดพื้นที่ทำงาน <Icon name="arrow"/></span></Link>)}</section>
  </>;
}
function Stat({ label, value, loading, error }: { label: string; value?: number; loading: boolean; error?: string }) {
  return <article><span>{label}</span><strong>{error ? "—" : loading ? "…" : value}</strong><small>{error ? "โหลดไม่สำเร็จ" : "จากรายการล่าสุดสูงสุด 100 รายการ"}</small></article>;
}
function CustomerStats({ api }: { api: BackendApi }) {
  const requests = useResource<Page<JobRequest>>(api, "/requests?limit=100");
  const jobs = useResource<{ items: { deliveries: { status: string }[]; invoice?: { status: string } }[] | null }>(api, "/fulfillment/jobs?limit=100");
  const inbox = useResource<Page<Notification>>(api, "/notifications?limit=100");
  const list = requests.data?.items ?? [];
  return <>
    <Stat label="คำขอที่กำลังดำเนินการ" value={list.filter((r) => r.status === "pending" || r.status === "ongoing").length} loading={requests.loading} error={requests.error} />
    <Stat label="งานที่รอตรวจรับ / ค้างชำระ" value={(jobs.data?.items ?? []).filter((j) => j.deliveries.at(-1)?.status === "shipping" || (j.invoice && j.invoice.status !== "paid")).length} loading={jobs.loading} error={jobs.error} />
    <Stat label="การแจ้งเตือนที่ยังไม่อ่าน" value={(inbox.data?.items ?? []).filter((n) => !n.read_at).length} loading={inbox.loading} error={inbox.error} />
  </>;
}
function StaffStats({ api, admin }: { api: BackendApi; admin: boolean }) {
  const requests = useResource<Page<JobRequest>>(api, "/requests?limit=100");
  const jobs = useResource<{ items: ProductionSummary[] | null }>(api, "/production/jobs?limit=100");
  const receiving = useResource<{ items: { status: string }[] | null }>(api, "/receiving/orders?limit=100");
  const list = jobs.data?.items ?? [];
  return <>
    <Stat label="คำขอใหม่รอประเมินราคา" value={(requests.data?.items ?? []).filter((r) => r.status === "pending").length} loading={requests.loading} error={requests.error} />
    <Stat label={admin ? "งานที่กำลังผลิต" : "งานรอผลิต / กำลังผลิต"} value={list.filter((j) => (admin ? ["in_progress"] : ["queued", "in_progress"]).includes(j.status)).length} loading={jobs.loading} error={jobs.error} />
    <Stat label="คำสั่งซื้อรอรับของ" value={(receiving.data?.items ?? []).filter((o) => o.status !== "received").length} loading={receiving.loading} error={receiving.error} />
  </>;
}
