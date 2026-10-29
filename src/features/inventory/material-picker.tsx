"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { quantityTH } from "../../components/staff-ui/staff-format";
import { Button, LoadError, SearchForm } from "../../components/staff-ui/staff-ui";
import type { InventoryMaterial } from "./inventory-domain";
import styles from "./material-picker.module.css";

// Literal server name search for forms that add material lines. Shows names,
// units and available stock only; costs stay Admin-only elsewhere (UC5).
export function MaterialPicker({ api, disabled, isAdded, onAdd, label = "ค้นหาวัตถุดิบ" }: { api: BackendApi; disabled: boolean; isAdded: (id: string) => boolean; onAdd: (material: InventoryMaterial) => void; label?: string }) {
  const [search, setSearch] = useState(""); const [offset, setOffset] = useState(0);
  const catalog = useResource<{ items: InventoryMaterial[] | null }>(api, `/materials?search=${encodeURIComponent(search)}&limit=20&offset=${offset}`);
  const items = catalog.data?.items ?? [];
  return <div className={styles.picker}>
    <SearchForm label={label} placeholder="พิมพ์ชื่อวัตถุดิบ" value={search} onSearch={(value) => { setSearch(value); setOffset(0); }} />
    {catalog.loading && <p role="status" className={styles.note}>กำลังค้นหาวัตถุดิบ…</p>}
    {catalog.error && <LoadError title="ค้นหาวัตถุดิบไม่สำเร็จ" onRetry={catalog.reload} />}
    {catalog.data && !items.length && <p className={styles.note}>ไม่พบวัตถุดิบชื่อนี้</p>}
    {Boolean(items.length) && <ul>{items.map((item) => {
      const added = isAdded(item.id);
      return <li key={item.id}><div><strong>{item.name}</strong><span>{item.unit_name} · พร้อมใช้ {quantityTH(item.qty_available)}{item.is_active ? "" : " · ปิดใช้งาน"}</span></div>
        <Button disabled={disabled || added || !item.is_active} onClick={() => onAdd(item)} aria-label={`เพิ่ม ${item.name}`}>{added ? "เพิ่มแล้ว" : "เพิ่ม"}</Button></li>;
    })}</ul>}
    {(offset > 0 || items.length === 20) && <div className={styles.paging}><Button disabled={offset === 0 || catalog.loading} onClick={() => setOffset(Math.max(0, offset - 20))}>ก่อนหน้า</Button><Button disabled={items.length < 20 || catalog.loading} onClick={() => setOffset(offset + 20)}>ถัดไป</Button></div>}
  </div>;
}
