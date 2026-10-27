// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { fields,invalid,MockError,route,text,uuid,type MockAccount,type Route } from "../../core/mock-backend.ts";
import { password,publicAccount,SESSION_MS,username } from './helpers.ts';

export const authRoutes: Route[] = [
// ----- AUTH -----
route("POST", "/auth/login", "public", (c) => {
    fields(c.body, ["username", "password"]);
    const account = c.db.accounts.find((a) => a.username === c.body.username && a.password === c.body.password && a.is_active);
    if (!account)
        throw new MockError(401, "invalid_credentials", "Invalid username or password");
    const access_token = `mock-${uuid()}`;
    const expires_at = new Date(c.now.getTime() + SESSION_MS).toISOString();
    c.db.sessions.set(access_token, { account_id: account.id, expires_at });
    return { access_token, token_type: "Bearer", expires_at, account: publicAccount(account) };
}),
route("GET", "/auth/me", "session", (c) => publicAccount(c.actor)),
route("POST", "/auth/logout", "session", (c) => { for (const [token, s] of c.db.sessions)
    if (s.account_id === c.actor.id)
        c.db.sessions.delete(token); return undefined; }),
route("POST", "/auth/register", "public", (c) => {
    fields(c.body, ["username", "password", "name", "customer_type", "company_name", "invitation"]);
    const account: MockAccount = { id: uuid(), person_id: uuid(), username: username(c.db, c.body.username), password: password(c.body.password), name: text(c.body.name, "name", { max: 200 }), role: "customer", is_active: true };
    if (c.body.customer_type === "individual") {
        if (c.body.company_name !== undefined || c.body.invitation !== undefined)
            throw invalid("Individuals do not join companies");
        c.db.accounts.push(account);
        c.db.customers.push({ id: uuid(), customer_type: "individual", name: account.name, members: [{ account_id: account.id, is_owner: true }] });
    }
    else if (c.body.customer_type === "company") {
        if (c.body.invitation !== undefined) {
            const invitation = c.db.invitations.get(String(c.body.invitation));
            if (!invitation || invitation.used || Date.parse(invitation.expires_at) < c.now.getTime())
                throw invalid("Invitation is invalid or expired");
            invitation.used = true;
            c.db.accounts.push(account);
            c.db.customers.find((x) => x.id === invitation.customer_id)?.members.push({ account_id: account.id, is_owner: false });
        }
        else {
            const name = text(c.body.company_name, "company_name", { max: 200 });
            c.db.accounts.push(account);
            c.db.customers.push({ id: uuid(), customer_type: "company", name, members: [{ account_id: account.id, is_owner: true }] });
        }
    }
    else
        throw invalid("customer_type must be individual or company");
    return publicAccount(account);
})
];
