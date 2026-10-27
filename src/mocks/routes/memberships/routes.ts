// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { conflict,fields,forbidden,invalid,notFound,route,uuid,type Route } from "../../core/mock-backend.ts";
import { memberCustomers } from './helpers.ts';

export const membershipsRoutes: Route[] = [
// ----- Customer memberships -----
route("GET", "/customers", ["customer"], (c) => ({ items: memberCustomers(c.db, c.actor).map((x) => ({ id: x.id, customer_type: x.customer_type, name: x.name, is_owner: x.members.some((m) => m.account_id === c.actor.id && m.is_owner) })) })),
route("POST", "/customers/:id/invitations", ["customer"], (c) => {
    const customer = memberCustomers(c.db, c.actor).find((x) => x.id === c.p.id);
    if (!customer)
        throw notFound("Customer");
    if (customer.customer_type !== "company" || !customer.members.some((m) => m.account_id === c.actor.id && m.is_owner))
        throw forbidden();
    const invitation = `inv-${uuid()}`;
    c.db.invitations.set(invitation, { customer_id: customer.id, expires_at: new Date(c.now.getTime() + 86400000).toISOString(), used: false });
    return { invitation };
}),
route("POST", "/customers/join", ["customer"], (c) => {
    fields(c.body, ["invitation"]);
    const invitation = c.db.invitations.get(String(c.body.invitation));
    if (!invitation || invitation.used || Date.parse(invitation.expires_at) < c.now.getTime())
        throw invalid("Invitation is invalid or expired");
    const customer = c.db.customers.find((x) => x.id === invitation.customer_id);
    if (!customer || customer.members.some((m) => m.account_id === c.actor.id))
        throw conflict("Already a member");
    invitation.used = true;
    customer.members.push({ account_id: c.actor.id, is_owner: false });
    return { id: customer.id, customer_type: customer.customer_type, name: customer.name, is_owner: false };
})
];
