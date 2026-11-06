"use client";

import { useEffect, useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import type { SupplierRecommendation } from "./procurement-domain";

type WireRecommendation = Omit<SupplierRecommendation, "material_id" | "last_unit_cost"> & { last_unit_cost?: string | null; has_history: boolean };

export function useSupplierRecommendations(api: BackendApi, materialIds: string[], excludeSupplierId = "") {
  const key = [...new Set(materialIds)].sort().join(",");
  const stateKey = `${key}:${excludeSupplierId}`;
  const [state, setState] = useState<{ key: string; items: SupplierRecommendation[] }>({ key: "", items: [] });
  useEffect(() => {
    const controller = new AbortController();
    if (!key) return () => controller.abort();
    void Promise.all(key.split(",").map(async (materialId) => {
      const query = new URLSearchParams({ material_id: materialId });
      if (excludeSupplierId) query.set("exclude_supplier_id", excludeSupplierId);
      const result = await api.call<{ items: WireRecommendation[] }>(`/suppliers/recommendations?${query}`, "GET", undefined, controller.signal);
      return (result.items ?? []).filter((item) => item.has_history && item.last_unit_cost != null).map((item) => ({ ...item, material_id: materialId, last_unit_cost: item.last_unit_cost! }));
    })).then((groups) => { if (!controller.signal.aborted) setState({ key: stateKey, items: groups.flat() }); }, () => { if (!controller.signal.aborted) setState({ key: stateKey, items: [] }); });
    return () => controller.abort();
  }, [api, key, excludeSupplierId, stateKey]);
  return state.key === stateKey ? state.items : [];
}
