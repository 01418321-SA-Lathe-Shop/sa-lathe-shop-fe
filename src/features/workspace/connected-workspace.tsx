"use client";


import type { ApiSession } from "../auth/api-session";
import { AdminRequests } from "../requests/admin-requests";
import { StaffRequests } from "../requests/staff-requests";
import { LiveWorkers } from "../workers/workers";
import { SettingsPage } from "../settings/settings-page";
import { LiveInventory } from "../inventory/inventory";
import { SqlConsole } from "../sql-console/sql-console";
import { Inbox } from "../inbox/inbox";

import { LiveProcurement } from "../procurement/procurement";
import { LiveReceiving } from "../receiving/receiving";
import { LiveProduction } from "../production/production";
import { LiveDelivery } from "../delivery/delivery";
import type { Role, WorkspaceId } from "./workspace-access";

import { StaffOverview } from "../staff-overview/staff-overview";

export default function ConnectedWorkspace({ role, workspaceId, session }: { role: Role; workspaceId: WorkspaceId; session: ApiSession }) {
  const { api, account } = session;
  switch (workspaceId) {
    case "overview": return <StaffOverview api={api} admin={role === "Admin"} />;
    case "requests": return <AdminRequests api={api} account={account} />;
    case "quotations": return <StaffRequests api={api} account={account} />;
    case "deposit-po": return <StaffRequests api={api} account={account} />;
    case "materials": return <LiveInventory api={api} account={account} />;
    case "orders": return <LiveProcurement api={api} account={account} />;
    case "receiving": return <LiveReceiving api={api} account={account} />;
    case "production": return <LiveProduction api={api} account={account} />;
    case "delivery-payment": return <LiveDelivery api={api} />;
    case "workers": return <LiveWorkers api={api} account={account} />;
    case "sql": return account.is_super_admin ? <SqlConsole api={api} /> : null;
    case "inbox": return <Inbox api={api} admin={role === "Admin"} />;
    case "settings": return <SettingsPage />;
  }
}
