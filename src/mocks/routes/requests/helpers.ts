import { memberIds } from '../memberships/helpers.ts';
// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { find,notFound,type Context,type Json } from "../../core/mock-backend.ts";
export function visibleRequest(c: Context, id: string): Json {
    const request = find(c.db.requests, id, "Request");
    // Unrelated customer scope is indistinguishable from a missing record.
    if (c.actor.role === "customer" && !memberIds(c.db, String(request.customer_id)).includes(c.actor.id))
        throw notFound("Request");
    return request;
}

export const requestView = (r: Json) => ({ id: r.id, no_request: r.no_request, customer_id: r.customer_id, description: r.description, qty: r.qty, material_spec: r.material_spec, ...(r.deadline ? { deadline: r.deadline } : {}), status: r.status, created_at: r.created_at });
