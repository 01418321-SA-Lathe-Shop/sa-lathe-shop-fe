import { publicAccount } from '../auth/helpers.ts';
// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { invalid,isUuid,notFound,text,type Context,type Json,type MockAccount } from "../../core/mock-backend.ts";
export const workerView = (a: MockAccount) => ({ ...publicAccount(a), employee_no: a.employee_no ?? "", position: a.position || undefined, email: a.email ?? null, phone: a.phone ?? null });

export function workerById(c: Context): MockAccount {
    if (!isUuid(c.p.id))
        throw invalid("Invalid worker id");
    const worker = c.db.accounts.find((a) => a.role === "worker" && a.id === c.p.id);
    if (!worker)
        throw notFound("Worker");
    return worker;
}

export function contacts(body: Json) {
    const email = text(body.email, "email", { max: 254 });
    if (!/^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/.test(email))
        throw invalid("Email address is invalid");
    const raw = text(body.phone, "phone", { max: 64 });
    const phone = raw.replace(/[ ().-]/g, "");
    if (!/^\+?[0-9]{7,15}$/.test(phone))
        throw invalid("Phone needs 7–15 digits with an optional leading +");
    return { email, phone };
}
