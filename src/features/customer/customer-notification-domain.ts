import type { BackendApi } from "../../lib/api/backend-api.ts";

/** Reconcile even an uncertain first response; never retry a write automatically. */
export async function markNotifications(api: Pick<BackendApi, "call">, ids: string[], signal: AbortSignal, confirmed: (id: string) => void, reconcile: () => void) {
  try {
    for (const id of ids) {
      await api.call(`/notifications/${id}/read`, "PATCH", undefined, signal);
      confirmed(id);
    }
  } finally {
    if (ids.length) reconcile();
  }
}
