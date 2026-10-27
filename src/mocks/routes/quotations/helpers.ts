// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { invalid,type Context,type Json } from "../../core/mock-backend.ts";
import { fmt2,halfUp,minimumPrice,satang } from "../../core/mock-decimal.ts";
export function quotationView(q: Json, role: string) {
    const { internal_costs, created_at: _, ...rest } = q;
    return role === "customer" ? rest : { ...rest, internal_costs };
}

export function costs(c: Context) {
    const material = satang(c.body.material_cost);
    const labor = satang(c.body.labor_cost);
    return { material, labor, estimate: { material_cost: fmt2(material), labor_cost: fmt2(labor), total_cost: fmt2(material + labor), minimum_price: fmt2(minimumPrice(material, labor)) } };
}

export function priced(c: Context) {
    const { material, labor, estimate } = costs(c);
    const final = satang(c.body.final_price);
    if (final < minimumPrice(material, labor))
        throw invalid(`Final price must be at least the minimum ${estimate.minimum_price}`);
    return { final_price: fmt2(final), internal_costs: estimate };
}

export function termsFor(customerType: string, finalPrice: string, acceptedAt: Date) {
    const total = satang(finalPrice);
    const company = customerType === "company";
    const deposit_required = !company || total > BigInt(1000000);
    const po_required = company;
    const deposit = deposit_required ? halfUp(total) : BigInt(0);
    return { customer_type: customerType, final_price: fmt2(total), deposit_required, po_required, deposit_amount: fmt2(deposit), balance_after_deposit: fmt2(total - deposit), accepted_at: acceptedAt.toISOString(), documents_due_at: new Date(acceptedAt.getTime() + 336 * 3600000).toISOString() };
}
