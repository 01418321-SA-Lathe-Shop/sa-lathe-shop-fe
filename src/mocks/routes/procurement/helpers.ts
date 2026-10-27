// Mock UC5 catalog/stock/job plans, UC6 Admin supplier orders and UC7
// receiving/claims/supplier settlement, following backend UC5–UC7.md.
import { invalid,text,uuid,type Context,type Json } from "../../core/mock-backend.ts";
// ----- UC6/UC7 helpers -----
export type OrderLine = {
    material_id: string;
    material_name: string;
    unit_id: string;
    unit_name: string;
    quantity: string;
    unit_cost: string;
    total_amount: string;
};

export type Receipt = {
    id: string;
    actor_id: string;
    note: string;
    created_at: string;
    lines: {
        material_id: string;
        good: string;
        damaged: string;
        replacement_claim_id?: string;
    }[];
};

export type Claim = {
    id: string;
    receipt_id: string;
    material_id: string;
    quantity: string;
    replaced: string;
    status: string;
    claimed_by?: string;
    claimed_at?: string;
    note: string;
};

export type Order = Json & {
    id: string;
    order_no: string;
    supplier: Json;
    job_ids: string[];
    lines: OrderLine[];
    total_amount: string;
    status: string;
    supplier_response: string;
    version: number;
    events: Json[];
    receipts: Receipt[];
    claims: Claim[];
    credit_days: number | null;
    full_received_at?: string;
    settlement?: Json;
};

export function orderView(o: Order) {
    const { receipts: _r, claims: _c, credit_days: _d, full_received_at: _f, settlement: _s, ...view } = o;
    return view;
}

export function event(c: Context, o: Order, action: string, reason = "") {
    o.version += 1;
    o.events.push({ id: uuid(), actor_id: c.actor.id, action, reason, version: o.version, created_at: c.now.toISOString() });
}

export function supplierInput(body: Json) {
    const name = text(body.name, "name", { max: 200 });
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if ((body.email !== undefined && typeof body.email !== "string") || (body.phone !== undefined && typeof body.phone !== "string"))
        throw invalid("Contacts must be strings");
    if (email && !/^[^\s@<>()",]+@[^\s@<>()",]+\.[^\s@<>()",]+$/.test(email))
        throw invalid("Email must be a plain address");
    if (phone && !/^\+?[0-9]{7,15}$/.test(phone))
        throw invalid("Phone must be 7–15 digits with an optional leading +, without punctuation");
    return { name, email, phone };
}
