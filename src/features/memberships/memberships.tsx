"use client";

import { useState } from "react";

import { Feedback,Field,text } from "../../components/ui/backend-ui";
import { useCommand,useResource } from "../../hooks/backend-hooks";
import { BackendApi,type Customer } from "../../lib/api/backend-api";




export function Memberships({ api }: { api: BackendApi }) {
  const resource = useResource<{ items: Customer[] | null }>(api, "/customers"); const action = useCommand(); const [invitation, setInvitation] = useState("");
  return <section className="record-detail"><h2>Customer memberships</h2><button onClick={resource.reload}>Refresh memberships</button><Feedback busy={resource.loading} error={resource.error} />
    {resource.data?.items?.map((item) => <article className="supplier-order" key={item.id}><h3>{item.name}</h3><p>{item.customer_type} · {item.is_owner ? "Owner" : "Member"}</p><p className="record-id">{item.id}</p>{item.customer_type === "company" && item.is_owner && <button disabled={action.busy} onClick={() => { setInvitation(""); void action.run(async (signal) => { const result = await api.call<{ invitation: string }>(`/customers/${item.id}/invitations`, "POST", undefined, signal); setInvitation(result.invitation); }, "Invitation created. Share privately; one use, expires after 24 hours."); }}>Create private invitation</button>}</article>)}
    {invitation && <div className="workflow-success"><p>Shown only in this page; share privately. It will disappear when you leave.</p><output className="private-invitation">{invitation}</output><button onClick={() => setInvitation("")}>Hide invitation</button></div>}
    <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const token = text(new FormData(form), "invitation"); form.reset(); void action.run(async (signal) => { await api.call("/customers/join", "POST", { invitation: token }, signal); resource.reload(); }, "Company joined."); }}><Field label="Join company with private invitation"><input name="invitation" type="password" required autoComplete="off" /></Field><button disabled={action.busy} type="submit">Join company</button></form><Feedback {...action} />
  </section>;
}
