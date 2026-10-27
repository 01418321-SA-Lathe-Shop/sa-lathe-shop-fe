// Mock UC5 catalog/stock/job plans, UC6 Admin supplier orders and UC7
// receiving/claims/supplier settlement, following backend UC5–UC7.md.
import { conflict,fields,find,idempotent,instant,invalid,isUuid,page,route,text,uuid,version,type Json,type Route } from "../../core/mock-backend.ts";
import { fmt2,fmt6,lineSatang,micro } from "../../core/mock-decimal.ts";
import { materialById,unitName,ZERO } from '../inventory/helpers.ts';
import { event,orderView,supplierInput,type Order,type OrderLine } from './helpers.ts';

export const procurementRoutes: Route[] = [
// ----- UC6 suppliers and orders (Admin only) -----
route("POST", "/suppliers", ["admin"], (c) => {
    fields(c.body, ["name", "email", "phone"]);
    const supplier = { id: uuid(), ...supplierInput(c.body), is_active: true, version: 1 };
    c.db.suppliers.push(supplier);
    return supplier;
}),
route("GET", "/suppliers", ["admin"], (c) => {
    const term = (c.query.get("search") ?? "").toLowerCase();
    return { items: page(c.db.suppliers.filter((s) => String(s.name).toLowerCase().includes(term)), c.query) };
}),
route("PUT", "/suppliers/:id", ["admin"], (c) => {
    fields(c.body, ["name", "email", "phone", "is_active", "expected_version"]);
    const supplier = find(c.db.suppliers, c.p.id, "Supplier");
    if (version(c.body.expected_version) !== supplier.version)
        throw conflict();
    if (typeof c.body.is_active !== "boolean")
        throw invalid("is_active must be boolean");
    Object.assign(supplier, supplierInput(c.body), { is_active: c.body.is_active, version: Number(supplier.version) + 1 });
    return supplier;
}),
route("POST", "/material-orders", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "supplier_id", "job_ids", "expected_at", "lines"]);
    return idempotent(c, "order", () => {
        const supplier = find(c.db.suppliers, String(c.body.supplier_id), "Supplier");
        if (!supplier.is_active)
            throw conflict("Supplier is inactive");
        const jobIds = (c.body.job_ids ?? []) as unknown[];
        if (!Array.isArray(jobIds) || jobIds.length > 100 || new Set(jobIds).size !== jobIds.length || jobIds.some((id) => !isUuid(id) || !c.db.jobs.some((j) => j.id === id)))
            throw invalid("job_ids must be up to 100 distinct existing jobs");
        const rawLines = c.body.lines as Json[];
        if (!Array.isArray(rawLines) || rawLines.length < 1 || rawLines.length > 100)
            throw invalid("An order needs 1–100 lines");
        const seen = new Set<string>();
        let total = ZERO;
        const lines: OrderLine[] = rawLines.map((raw) => {
            if (!isUuid(raw.material_id) || seen.has(raw.material_id))
                throw invalid("Each line needs a distinct material_id");
            seen.add(raw.material_id);
            const m = materialById(c.db, raw.material_id);
            if (!m)
                throw invalid("Unknown material");
            if (!m.is_active)
                throw conflict("Material is inactive");
            const quantity = micro(raw.quantity, { positive: true });
            const cost = micro(raw.unit_cost);
            const amount = lineSatang(quantity, cost);
            total += amount;
            return { material_id: m.id, material_name: m.name, unit_id: m.unit_id, unit_name: unitName(c.db, m.unit_id), quantity: fmt6(quantity), unit_cost: fmt6(cost), total_amount: fmt2(amount) };
        });
        let expected_at: string | undefined;
        if (c.body.expected_at !== undefined) {
            expected_at = instant(c.body.expected_at, "expected_at", { future: true, now: c.now });
            const year = new Date(expected_at).getUTCFullYear();
            if (year < 2000 || year > 9999)
                throw invalid("expected_at year must be 2000–9999");
        }
        const id = uuid();
        const order: Order = { id, order_no: `MO-${id}`, supplier: { ...supplier }, job_ids: jobIds as string[], lines, total_amount: fmt2(total), status: "ordered", supplier_response: "pending", version: 0, ...(expected_at ? { expected_at } : {}), created_at: c.now.toISOString(), created_by: c.actor.id, events: [], receipts: [], claims: [], credit_days: null };
        event(c, order, "place");
        c.db.orders.unshift(order);
        return orderView(order);
    });
}),
route("GET", "/material-orders", ["admin"], (c) => {
    const job = c.query.get("job_id");
    if (job && !isUuid(job))
        throw invalid("Invalid job_id");
    return { items: page((c.db.orders as Order[]).filter((o) => !job || o.job_ids.includes(job)), c.query).map(orderView) };
}),
route("GET", "/material-orders/:id", ["admin"], (c) => orderView(find(c.db.orders, c.p.id, "Order") as Order)),
route("POST", "/material-orders/:id/actions", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "action", "reason"]);
    return idempotent(c, `order-action:${c.p.id}`, () => {
        const o = find(c.db.orders, c.p.id, "Order") as Order;
        if (version(c.body.expected_version) !== o.version || o.status === "cancelled")
            throw conflict();
        const action = c.body.action;
        if (action === "accept" || action === "reject") {
            if (o.supplier_response !== "pending")
                throw conflict("A supplier response is already recorded");
            if (action === "accept") {
                o.supplier_response = "accepted";
                event(c, o, "accept", text(c.body.reason, "reason", { required: false }));
            }
            else {
                o.supplier_response = "rejected";
                o.status = "cancelled";
                event(c, o, "reject", text(c.body.reason, "reason"));
            }
        }
        else if (action === "cancel") {
            if (o.receipts.length)
                throw conflict("An order with receipts cannot be cancelled");
            o.status = "cancelled";
            event(c, o, "cancel", text(c.body.reason, "reason"));
        }
        else
            throw invalid("action must be accept, reject or cancel");
        return orderView(o);
    });
})
];
