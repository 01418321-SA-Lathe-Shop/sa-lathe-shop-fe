// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { activeIds,completeUpload,conflict,downloadLink,fields,instant,invalid,isUuid,next,notFound,notify,page,publicFile,route,startUpload,text,uuid,type Route } from "../../core/mock-backend.ts";
import { memberCustomers,memberIds } from '../memberships/helpers.ts';
import { requestView,visibleRequest } from './helpers.ts';

export const requestsRoutes: Route[] = [
// ----- UC1 requests and private request files -----
route("GET", "/requests", "session", (c) => {
    const scope = c.actor.role === "customer" ? new Set(memberCustomers(c.db, c.actor).map((x) => x.id)) : null;
    const items = c.db.requests.filter((r) => !scope || scope.has(String(r.customer_id))).slice().reverse();
    return { items: page(items, c.query).map(requestView), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) };
}),
route("POST", "/requests", ["customer"], (c) => {
    fields(c.body, ["customer_id", "description", "qty", "material_spec", "deadline"]);
    const customer = memberCustomers(c.db, c.actor).find((x) => x.id === c.body.customer_id);
    if (!customer)
        throw invalid("Choose one of your customer memberships");
    const qty = String(c.body.qty ?? "");
    if (!/^[1-9]\d{0,18}$/.test(qty) || BigInt(qty) > BigInt("9223372036854775807"))
        throw invalid("qty must be a positive int64");
    const deadline = c.body.deadline === undefined ? undefined : instant(c.body.deadline, "deadline", { future: true, now: c.now });
    if (deadline && Date.parse(deadline) <= c.now.getTime())
        throw invalid("deadline must be in the future");
    const request = { id: uuid(), no_request: next(c.db, "request"), customer_id: customer.id, created_by: c.actor.id, description: text(c.body.description, "description", { max: 10000 }), qty, material_spec: text(c.body.material_spec, "material_spec", { required: false }), deadline, status: "pending", created_at: c.now.toISOString() };
    c.db.requests.push(request);
    notify(c.db, [...activeIds(c.db, "worker"), ...activeIds(c.db, "admin")], request.id, `New request #${request.no_request}`);
    return requestView(request);
}),
route("GET", "/requests/:id", "session", (c) => requestView(visibleRequest(c, c.p.id))),
route("POST", "/requests/:id/reject", ["worker"], (c) => {
    fields(c.body, ["reason"]);
    const request = visibleRequest(c, c.p.id);
    if (request.status !== "pending")
        throw conflict("Only a pending request can be refused");
    request.status = "canceled";
    request.rejection = { reason: text(c.body.reason, "reason"), actor_id: c.actor.id, rejected_at: c.now.toISOString() };
    notify(c.db, memberIds(c.db, String(request.customer_id)), String(request.id), `Request #${request.no_request} was refused`);
    return requestView(request);
}),
route("GET", "/requests/:id/rejection", "session", (c) => { const r = visibleRequest(c, c.p.id); if (!r.rejection)
    throw notFound("Refusal"); return r.rejection; }),
route("POST", "/requests/:id/uploads", ["customer"], (c) => {
    const request = visibleRequest(c, c.p.id);
    if (request.status === "canceled" || request.status === "completed")
        throw conflict("Request is closed");
    return startUpload(c, "attachment", { request_id: request.id });
}),
route("POST", "/uploads/:id/complete", ["customer"], (c) => publicFile(completeUpload(c, c.p.id, "attachment"))),
route("GET", "/requests/:id/attachments", "session", (c) => {
    visibleRequest(c, c.p.id);
    return { items: [...c.db.files.values()].filter((f) => f.kind === "attachment" && f.request_id === c.p.id && f.state === "ready").map(publicFile) };
}),
route("GET", "/attachments/:id/download", "session", (c) => {
    const file = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined;
    if (!file || file.kind !== "attachment")
        throw notFound("Attachment");
    visibleRequest(c, String(file.request_id));
    return downloadLink(c, file);
})
];
