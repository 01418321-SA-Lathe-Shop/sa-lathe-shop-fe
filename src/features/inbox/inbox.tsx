"use client";

import { useState } from "react";

import { Feedback,Paging } from "../../components/ui/backend-ui";
import { useCommand,useResource } from "../../hooks/backend-hooks";
import { BackendApi,type Notification,type Page } from "../../lib/api/backend-api";
import { formatBangkok } from "../../lib/formatting/display";




export function Inbox({ api }: { api: BackendApi }) {
  const [offset, setOffset] = useState(0); const resource = useResource<Page<Notification>>(api, `/notifications?limit=20&offset=${offset}`); const action = useCommand();
  return <section className="record-detail"><h2>Inbox</h2><button onClick={resource.reload}>Refresh inbox</button><Feedback busy={resource.loading} error={resource.error} />
    {resource.data && <>{!(resource.data.items?.length) && <p>No notifications on this page. New-request alerts arrive when the backend worker processes its outbox.</p>}{resource.data.items?.map((item) => <article className="supplier-order" key={item.id}><h3>{item.title}</h3><p>{formatBangkok(item.created_at)} · {item.read_at ? "Read" : "Unread"}</p>{!item.read_at && <button disabled={action.busy} onClick={() => void action.run(async (signal) => { await api.call(`/notifications/${item.id}/read`, "PATCH", undefined, signal); resource.reload(); }, "Marked as read.")}>Mark read</button>}</article>)}<Paging offset={offset} count={resource.data.items?.length ?? 0} busy={action.busy} setOffset={setOffset} /></>}<Feedback {...action} />
  </section>;
}
