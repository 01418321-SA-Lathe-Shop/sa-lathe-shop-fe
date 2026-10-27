// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { conflict,fields,invalid,page,route,text,uuid,type MockAccount,type Route } from "../../core/mock-backend.ts";
import { password,username } from '../auth/helpers.ts';
import { contacts,workerById,workerView } from './helpers.ts';

export const workersRoutes: Route[] = [
// ----- Admin Worker management -----
route("GET", "/admin/workers", ["admin"], (c) => ({ items: page(c.db.accounts.filter((a) => a.role === "worker"), c.query).map(workerView), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) })),
route("GET", "/admin/workers/:id", ["admin"], (c) => { const w = workerById(c); return workerView(w); }),
route("POST", "/admin/workers", ["admin"], (c) => {
    fields(c.body, ["name", "username", "employee_no", "position", "email", "phone", "password"]);
    const employee_no = text(c.body.employee_no, "employee_no", { max: 30 });
    if (c.db.accounts.some((a) => a.employee_no === employee_no))
        throw conflict("Employee number is already used");
    const worker: MockAccount = { id: uuid(), person_id: uuid(), username: username(c.db, c.body.username), password: password(c.body.password), name: text(c.body.name, "name", { max: 200 }), role: "worker", is_active: true, employee_no, position: text(c.body.position, "position", { max: 100, required: false }), ...contacts(c.body) };
    c.db.accounts.push(worker);
    return workerView(worker);
}),
route("PATCH", "/admin/workers/:id", ["admin"], (c) => {
    fields(c.body, ["name", "username", "employee_no", "position", "email", "phone", "password", "is_active"]);
    const worker = workerById(c);
    const revoke = () => { for (const [token, s] of c.db.sessions)
        if (s.account_id === worker.id)
            c.db.sessions.delete(token); };
    if (c.body.password !== undefined) {
        worker.password = password(c.body.password);
        revoke();
    }
    if (c.body.is_active !== undefined) {
        if (typeof c.body.is_active !== "boolean")
            throw invalid("is_active must be boolean");
        worker.is_active = c.body.is_active;
        if (!worker.is_active)
            revoke();
    }
    if (c.body.name !== undefined) {
        const changedUsername = username(c.db, c.body.username, worker.id);
        if (changedUsername !== worker.username)
            revoke();
        Object.assign(worker, { name: text(c.body.name, "name", { max: 200 }), username: changedUsername, employee_no: text(c.body.employee_no, "employee_no", { max: 30 }), position: text(c.body.position, "position", { max: 100, required: false }), ...contacts(c.body) });
    }
    return workerView(worker);
})
];
