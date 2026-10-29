"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { inventoryDisplay, type InventoryMaterial } from "./inventory-domain";
import { Field, Feedback, Paging, text } from "../../components/ui/backend-ui";

type Items<T> = { items: T[] | null };

// Literal name search used by forms that add material lines (UC6 orders, UC8 use).
export function MaterialSearch({ api, disabled, isAdded, onAdd, label = "Find material" }: { api: BackendApi; disabled: boolean; isAdded: (id: string) => boolean; onAdd: (material: InventoryMaterial) => void; label?: string }) {
  const [search, setSearch] = useState(""); const [offset, setOffset] = useState(0); const [error, setError] = useState("");
  const catalog = useResource<Items<InventoryMaterial>>(api, `/materials?search=${encodeURIComponent(search)}&limit=20&offset=${offset}`);
  return <div className="live-section">
    <form className="workflow-toolbar" onSubmit={(event) => { event.preventDefault(); const term = text(new FormData(event.currentTarget), "search").trim(); if ([...term].length > 200 || term.includes("\0")) { setError("Search needs at most 200 characters without NUL."); return; } setError(""); setSearch(term); setOffset(0); }}><Field label={label}><input name="search" type="search" disabled={disabled} /></Field><button disabled={disabled}>Search materials</button></form>
    <Feedback busy={catalog.loading} error={error || catalog.error} />
    {catalog.data && <>{!catalog.data.items?.length && <p>No matching materials on this page.</p>}{catalog.data.items?.map((item) => <div className="live-inventory-row" key={item.id}><p>{item.name} · {item.unit_name} · {item.is_active ? "Active" : "Inactive"} · Available {inventoryDisplay(item.qty_available)}</p><button type="button" disabled={disabled || !item.is_active || isAdded(item.id)} onClick={() => onAdd(item)}>Add · {item.name}</button></div>)}<Paging offset={offset} count={catalog.data.items?.length ?? 0} busy={disabled || catalog.loading} setOffset={setOffset} /></>}
  </div>;
}
