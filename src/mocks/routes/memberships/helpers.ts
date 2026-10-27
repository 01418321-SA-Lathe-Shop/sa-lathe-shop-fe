// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { type Db,type MockAccount } from "../../core/mock-backend.ts";
export function memberCustomers(db: Db, account: MockAccount) { return db.customers.filter((c) => c.members.some((m) => m.account_id === account.id)); }

export function memberIds(db: Db, customerId: string) { return db.customers.find((c) => c.id === customerId)?.members.map((m) => m.account_id) ?? []; }
