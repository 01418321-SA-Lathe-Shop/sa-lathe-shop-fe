// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { conflict,invalid,type Db,type MockAccount } from "../../core/mock-backend.ts";
export const SESSION_MS = 12 * 3600000;

export const publicAccount = (a: MockAccount) => ({ id: a.id, person_id: a.person_id, username: a.username, name: a.name, role: a.role, is_active: a.is_active });

export function password(value: unknown): string {
    if (typeof value !== "string" || [...value].length < 12 || new TextEncoder().encode(value).length > 128)
        throw invalid("Password needs at least 12 characters and at most 128 bytes");
    return value;
}

export function username(db: Db, value: unknown, except?: string): string {
    if (typeof value !== "string" || !/^[A-Za-z0-9_.-]{3,64}$/.test(value))
        throw invalid("Username must be 3–64 letters, digits, dot, dash or underscore");
    if (db.accounts.some((a) => a.username.toLowerCase() === value.toLowerCase() && a.id !== except))
        throw conflict("Username is already used");
    return value;
}
