// Mock UC5 catalog/stock/job plans, UC6 Admin supplier orders and UC7
// receiving/claims/supplier settlement, following backend UC5–UC7.md.
import { completeUpload,conflict,downloadLink,fields,find,idempotent,instant,invalid,isUuid,notFound,page,publicFile,route,startUpload,text,uuid,version,type Json,type Route } from "../../core/mock-backend.ts";
import { fmt6,micro } from "../../core/mock-decimal.ts";
import { materialById,moveStock,ZERO } from '../inventory/helpers.ts';
import { event,type Order,type Receipt } from '../procurement/helpers.ts';
import { received,receivingOrder,receivingView } from './helpers.ts';

export const receivingRoutes: Route[] = [
// ----- UC7 receiving, claims and supplier settlement -----
route("GET", "/receiving/orders", ["worker", "admin"], (c) => ({ items: page((c.db.orders as Order[]).filter((o) => o.supplier_response === "accepted" && o.status !== "cancelled"), c.query).map((o) => ({ order_id: o.id, order_no: o.order_no, supplier_name: o.supplier.name, status: o.status, version: o.version, ...(o.full_received_at ? { full_received_at: o.full_received_at } : {}) })) })),
route("GET", "/receiving/orders/:id", ["worker", "admin"], (c) => receivingView(c, receivingOrder(c))),
route("POST", "/receiving/orders/:id/receipts", ["worker", "admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "note", "lines"]);
    return idempotent(c, `receipt:${c.p.id}`, () => {
        const o = receivingOrder(c);
        if (version(c.body.expected_version) !== o.version || o.status === "received")
            throw conflict();
        const rawLines = c.body.lines as Json[];
        if (!Array.isArray(rawLines) || rawLines.length < 1 || rawLines.length > 100)
            throw invalid("A receipt needs 1–100 lines");
        const receipt: Receipt = { id: uuid(), actor_id: c.actor.id, note: text(c.body.note, "note", { required: false }), created_at: c.now.toISOString(), lines: [] };
        const pairs = new Set<string>();
        const pendingClaim = new Map<string, bigint>();
        const effects: (() => void)[] = [];
        for (const raw of rawLines) {
            const claimId = raw.replacement_claim_id === undefined || raw.replacement_claim_id === "" ? undefined : String(raw.replacement_claim_id);
            const line = o.lines.find((l) => l.material_id === raw.material_id);
            if (!line)
                throw invalid("Material is not on this order");
            const pair = `${line.material_id}:${claimId ?? ""}`;
            if (pairs.has(pair))
                throw invalid("Each material/claim pair may appear once");
            pairs.add(pair);
            const good = micro(raw.good);
            const damaged = micro(raw.damaged);
            if (good + damaged === ZERO)
                throw invalid("Each line needs a positive good or damaged quantity");
            const m = materialById(c.db, line.material_id)!;
            if (good > ZERO && !m.is_active)
                throw conflict(`Reactivate ${m.name} before receiving good stock`);
            if (claimId) {
                const claim = o.claims.find((x) => x.id === claimId);
                if (!claim || claim.material_id !== line.material_id || claim.status !== "claimed")
                    throw invalid("Replacement must reference a claimed defect of this material");
                const owed = micro(claim.quantity) - micro(claim.replaced) - (pendingClaim.get(claimId) ?? ZERO);
                if (good + damaged > owed)
                    throw invalid("Replacement exceeds the quantity still owed for this claim");
                pendingClaim.set(claimId, (pendingClaim.get(claimId) ?? ZERO) + good);
                effects.push(() => { claim.replaced = fmt6(micro(claim.replaced) + good); if (micro(claim.replaced) === micro(claim.quantity))
                    claim.status = "resolved"; });
            }
            else {
                // Pairs are distinct, so a material has at most one original line here.
                if (received(o, line.material_id).original + good + damaged > micro(line.quantity))
                    throw invalid(`Delivery exceeds the ordered ${line.material_name} quantity`);
                if (damaged > ZERO)
                    effects.push(() => o.claims.push({ id: uuid(), receipt_id: receipt.id, material_id: line.material_id, quantity: fmt6(damaged), replaced: "0.000000", status: "pending_claim", note: "" }));
            }
            if (good > ZERO)
                effects.push(() => moveStock(c, m, "purchase_receive", good, m.on_hand + good, micro(line.unit_cost), `Receipt ${o.order_no}`));
            receipt.lines.push({ material_id: line.material_id, good: fmt6(good), damaged: fmt6(damaged), ...(claimId ? { replacement_claim_id: claimId } : {}) });
        }
        o.receipts.push(receipt);
        effects.forEach((apply) => apply());
        const full = o.lines.every((l) => received(o, l.material_id).good === micro(l.quantity));
        o.status = full ? "received" : "partially_received";
        if (full)
            o.full_received_at = c.now.toISOString();
        event(c, o, "receive");
        return receivingView(c, o);
    });
}),
route("POST", "/receiving/orders/:id/claims/:claim/submit", ["worker", "admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "note"]);
    return idempotent(c, `claim:${c.p.claim}`, () => {
        const o = receivingOrder(c);
        const claim = o.claims.find((x) => x.id === c.p.claim);
        if (!claim)
            throw notFound("Claim");
        if (version(c.body.expected_version) !== o.version || claim.status !== "pending_claim")
            throw conflict();
        Object.assign(claim, { status: "claimed", claimed_by: c.actor.id, claimed_at: c.now.toISOString(), note: text(c.body.note, "note") });
        event(c, o, "claim");
        return receivingView(c, o);
    });
}),
route("POST", "/receiving/orders/:id/credit-terms", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "credit_days"]);
    return idempotent(c, `credit:${c.p.id}`, () => {
        const o = receivingOrder(c);
        if (version(c.body.expected_version) !== o.version || o.credit_days !== null)
            throw conflict("Credit days are already set");
        const days = c.body.credit_days;
        if (typeof days !== "number" || !Number.isInteger(days) || days < 0 || days > 36500)
            throw invalid("credit_days must be an integer 0–36500");
        o.credit_days = days;
        event(c, o, "credit_terms");
        return receivingView(c, o);
    });
}),
route("POST", "/receiving/orders/:id/settlement", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "method", "paid_at", "evidence_id"]);
    return idempotent(c, `settle:${c.p.id}`, () => {
        const o = receivingOrder(c);
        if (version(c.body.expected_version) !== o.version || o.settlement || !o.full_received_at || o.credit_days === null)
            throw conflict("Settlement needs full good receipt, credit days and no prior settlement");
        const method = c.body.method;
        if (method !== "bank" && method !== "cash")
            throw invalid("method must be bank or cash");
        const paidAt = instant(c.body.paid_at, "paid_at", { now: c.now });
        if (Date.parse(paidAt) < Date.parse(o.full_received_at))
            throw invalid("paid_at cannot be before full receipt");
        const evidence = c.body.evidence_id ? c.db.files.get(String(c.body.evidence_id)) : undefined;
        if (c.body.evidence_id !== undefined && (!evidence || evidence.kind !== "order-evidence" || evidence.order_id !== o.id || evidence.state !== "ready"))
            throw invalid("evidence_id must be ready evidence for this order");
        if (method === "bank" && !evidence)
            throw invalid("Bank settlement requires ready evidence");
        o.settlement = { actor_id: c.actor.id, amount: o.total_amount, method, paid_at: paidAt, ...(evidence ? { evidence_id: evidence.id } : {}) };
        event(c, o, "settle");
        return receivingView(c, o);
    });
}),
route("POST", "/material-orders/:id/evidence/uploads", ["admin"], (c) => { const o = find(c.db.orders, c.p.id, "Order"); return startUpload(c, "order-evidence", { order_id: o.id }); }),
route("POST", "/order-evidence/:id/complete", ["admin"], (c) => publicFile(completeUpload(c, c.p.id, "order-evidence"))),
route("GET", "/order-evidence/:id/download", ["admin"], (c) => { const f = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined; return downloadLink(c, f?.kind === "order-evidence" ? f : undefined); })
];
