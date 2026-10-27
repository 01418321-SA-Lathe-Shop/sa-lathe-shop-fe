import { ZERO } from '../inventory/helpers.ts';
import { type Order } from '../procurement/helpers.ts';
// Mock UC5 catalog/stock/job plans, UC6 Admin supplier orders and UC7
// receiving/claims/supplier settlement, following backend UC5–UC7.md.
import { find,notFound,type Context } from "../../core/mock-backend.ts";
import { fmt6,micro } from "../../core/mock-decimal.ts";
export function received(o: Order, materialId: string) {
    let good = ZERO;
    let damaged = ZERO;
    let originalGood = ZERO;
    let originalDamaged = ZERO;
    for (const r of o.receipts)
        for (const l of r.lines)
            if (l.material_id === materialId) {
                good += micro(l.good);
                damaged += micro(l.damaged);
                if (!l.replacement_claim_id) {
                    originalGood += micro(l.good);
                    originalDamaged += micro(l.damaged);
                }
            }
    return { good, damaged, original: originalGood + originalDamaged };
}

export function receivingView(c: Context, o: Order) {
    const lines = o.lines.map((l) => { const r = received(o, l.material_id); const ordered = micro(l.quantity); return { material_id: l.material_id, material_name: l.material_name, unit_name: l.unit_name, ordered: l.quantity, good: fmt6(r.good), damaged: fmt6(r.damaged), outstanding: fmt6(ordered - r.good) }; });
    const due = o.full_received_at && o.credit_days !== null ? new Date(Date.parse(o.full_received_at) + o.credit_days * 86400000).toISOString() : undefined;
    const finance = { total_amount: o.total_amount, credit_days: o.credit_days, ...(due ? { payment_due_at: due } : {}), payment_status: o.settlement ? "paid" : o.full_received_at && o.credit_days !== null ? "pending" : "unpaid", ...(o.settlement ? { settlement: o.settlement } : {}) };
    return { order_id: o.id, order_no: o.order_no, supplier_name: o.supplier.name, status: o.status, version: o.version, ...(o.full_received_at ? { full_received_at: o.full_received_at } : {}), lines, receipts: o.receipts, claims: o.claims, ...(c.actor.role === "admin" ? { finance } : {}) };
}

export function receivingOrder(c: Context): Order {
    const o = find(c.db.orders, c.p.id, "Order") as Order;
    if (o.supplier_response !== "accepted" || o.status === "cancelled")
        throw notFound("Receiving order");
    return o;
}
