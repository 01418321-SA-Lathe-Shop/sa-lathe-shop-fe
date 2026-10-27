// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { notFound,page,route,type Route } from "../../core/mock-backend.ts";

export const inboxRoutes: Route[] = [
// ----- Inbox -----
route("GET", "/notifications", "session", (c) => ({ items: page(c.db.notifications.filter((n) => n.account_id === c.actor.id), c.query).map(({ account_id: _, ...n }) => n), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) })),
route("PATCH", "/notifications/:id/read", "session", (c) => {
    const item = c.db.notifications.find((n) => n.id === c.p.id && n.account_id === c.actor.id);
    if (!item)
        throw notFound("Notification");
    item.read_at ??= c.now.toISOString();
    return undefined;
})
];
