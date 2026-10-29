"use client";

import Link from "next/link";
import { Icon } from "../../components/appearance/icons";

import type { ApiSession } from "../auth/api-session";
import type { BackendApi, JobRequest, Notification, Page } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { LiveRequests } from "../requests/requests";
import { StaffRequests } from "../requests/staff-requests";
import { LiveWorkers } from "../workers/workers";
import { LiveInventory } from "../inventory/inventory";
import { Inbox } from "../inbox/inbox";
import { Memberships } from "../memberships/memberships";

import { LiveProcurement } from "../procurement/procurement";
import { LiveReceiving } from "../receiving/receiving";
import { LiveProduction } from "../production/production";
import { LiveDelivery } from "../delivery/delivery";
import { getWorkspaces, type Role, type WorkspaceId } from "./workspace-access";
import { PAGE_LABELS, workspacePath } from "./workspace-routes";

import { workspaceIcons as icons } from "./workspace-icons";
import { StaffOverview } from "../staff-overview/staff-overview";

export default function ConnectedWorkspace({ role, workspaceId, session }: { role: Role; workspaceId: WorkspaceId; session: ApiSession }) {
  const { api, account } = session;
  switch (workspaceId) {
    case "overview": return role === "Customer" ? <Overview role={role} api={api} /> : <StaffOverview api={api} admin={role === "Admin"} />;
    case "requests": return role === "Customer" ? <LiveRequests api={api} account={account} focus="request" /> : <StaffRequests api={api} account={account} />;
    case "quotations": return role === "Customer" ? <LiveRequests api={api} account={account} focus="quotations" /> : <StaffRequests api={api} account={account} />;
    case "deposit-po": return role === "Customer" ? <LiveRequests api={api} account={account} focus="fulfillment" /> : <StaffRequests api={api} account={account} />;
    case "materials": return <LiveInventory api={api} account={account} />;
    case "orders": return <LiveProcurement api={api} />;
    case "receiving": return <LiveReceiving api={api} account={account} />;
    case "production": return <LiveProduction api={api} account={account} />;
    case "delivery-payment": return <LiveDelivery api={api} account={account} />;
    case "workers": return <LiveWorkers api={api} />;
    case "inbox": return <Inbox api={api} />;
    case "memberships": return <Memberships api={api} />;
  }
}

// Counts come from the first 100 records of real list endpoints, never fixtures.
function Overview({ role, api }: { role: Role; api: BackendApi }) {
  const items = getWorkspaces(role);
  return <>
    <section className="workspace-stats"><CustomerStats api={api} /></section>
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
