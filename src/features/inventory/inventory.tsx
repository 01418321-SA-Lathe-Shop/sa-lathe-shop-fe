"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Account, BackendApi } from "../../lib/api/backend-api";
import { quantityTH } from "../../components/staff-ui/staff-format";
import { Button, Drawer, EmptyState, LoadError, SearchForm, Skeleton, StatusTabs, Toast, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { filterStock, stockCounts, stockFilter, type InventoryMaterial, type StockFilter } from "./inventory-domain";
import { CatalogView } from "./inventory-catalog";
import { MaterialPanel, MaterialState } from "./inventory-material";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inventory.module.css";

// UC5 สต๊อกวัตถุดิบ: Staff read stock and history; Admin also adjusts stock and
// manages units/materials in the ข้อมูลหลัก view (?view=catalog, same route).
const FILTERS: [StockFilter, string][] = [["all", "ทั้งหมด"], ["available", "มีของพร้อมใช้"], ["empty", "หมด"], ["reserved", "มีการจอง"], ["inactive", "ปิดใช้งาน"]];
const EMPTY: Record<StockFilter, string> = { all: "ยังไม่มีวัตถุดิบ", available: "ไม่มีวัตถุดิบที่พร้อมใช้", empty: "ไม่มีวัตถุดิบที่หมด", reserved: "ไม่มีวัตถุดิบที่ถูกจอง", inactive: "ไม่มีวัตถุดิบที่ปิดใช้งาน" };

export function LiveInventory({ api, account }: { api: BackendApi; account: Account }) {
  return <Suspense fallback={<Skeleton label="กำลังเปิดสต๊อกวัตถุดิบ…" />}><InventoryWorkspace api={api} account={account} /></Suspense>;
}

function InventoryWorkspace({ api, account }: { api: BackendApi; account: Account }) {
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter();
  const admin = account.role === "admin";
  const view = admin && params.get("view") === "catalog" ? "catalog" : "stock";
  const q = params.get("q") ?? ""; const filter = stockFilter(params.get("filter")); const selected = params.get("material") ?? "";
  const materials = useCollection<InventoryMaterial>(api, `/materials?search=${encodeURIComponent(q)}`);
  const items = materials.data?.items; const counts = stockCounts(items ?? []); const rows = filterStock(items ?? [], filter);
  const material = view === "stock" ? items?.find((item) => item.id === selected) : undefined;
  const [toast, setToast] = useState(""); const clearToast = () => setToast("");
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) if (value) next.set(key, value); else next.delete(key);
    const query = next.toString(); return query ? `${pathname}?${query}` : pathname;
  };
  const saved = (message: string) => { setToast(message); materials.reload(); };
  const listLoading = materials.loading && !materials.data;
  return <section className={layout.page}>
    {admin && <nav className={styles.views} aria-label="มุมมอง">
      <Link href={href({ view: undefined })} scroll={false} aria-current={view === "stock" ? "page" : undefined}>สต๊อก</Link>
      <Link href={href({ view: "catalog", filter: undefined, material: undefined })} scroll={false} aria-current={view === "catalog" ? "page" : undefined}>ข้อมูลหลัก (หน่วย/วัตถุดิบ)</Link>
    </nav>}
    <div className={layout.toolbar}>
      {view === "stock" && <StatusTabs label="กรองสต๊อก" tabs={FILTERS.map(([key, label]) => ({ key, label, count: counts[key] }))} current={filter} href={(key) => href({ filter: key === "all" ? undefined : key, material: undefined })} loading={listLoading} unavailable={Boolean(materials.error && !materials.data)} />}
      <div className={layout.toolbarEnd}>
        <SearchForm label="ค้นหาวัตถุดิบ" placeholder="ชื่อวัตถุดิบ" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, material: undefined }), { scroll: false })} />
        <Button onClick={materials.reload} disabled={materials.loading}>อัปเดตข้อมูล</Button>
      </div>
    </div>
    {materials.error && !materials.data && <LoadError title="โหลดสต๊อกวัตถุดิบไม่สำเร็จ" onRetry={materials.reload} />}
    <TruncatedNotice show={materials.data?.complete === false} />
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, material: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
    {view === "catalog" ? <CatalogView api={api} materials={items} onSaved={saved} /> : <>
      {listLoading && <Skeleton label="กำลังโหลดสต๊อกวัตถุดิบ…" />}
      {materials.data && !rows.length && <EmptyState title={q ? "ไม่พบวัตถุดิบที่ค้นหา" : EMPTY[filter]}>{q ? "ลองค้นด้วยชื่ออื่น" : admin ? "เพิ่มวัตถุดิบได้ที่ข้อมูลหลัก" : "ผู้ดูแลระบบเป็นผู้เพิ่มวัตถุดิบ"}</EmptyState>}
      {rows.length > 0 && <table className={styles.stock}>
        <caption className={layout.visuallyHidden}>สต๊อกวัตถุดิบ หน่วยตามหน่วยหลักของแต่ละวัตถุดิบ</caption>
        <thead><tr><th scope="col">วัตถุดิบ</th><th scope="col">คงเหลือ</th><th scope="col">จองแล้ว</th><th scope="col">พร้อมใช้</th>{admin && <th scope="col">ต้นทุนเฉลี่ย/หน่วย</th>}<th scope="col">สถานะ</th></tr></thead>
        <tbody>{rows.map((item) => <tr key={item.id} aria-current={item.id === selected ? "true" : undefined}>
          <th scope="row"><Link href={href({ material: item.id })} scroll={false}>{item.name}</Link><small>หน่วย {item.unit_name}</small></th>
          <td data-label="คงเหลือ">{quantityTH(item.qty_on_hand)}</td>
          <td data-label="จองแล้ว">{quantityTH(item.qty_reserved)}</td>
          <td data-label="พร้อมใช้"><strong>{quantityTH(item.qty_available)}</strong></td>
          {admin && <td data-label="ต้นทุนเฉลี่ย/หน่วย">{item.avg_cost === undefined ? "—" : `${quantityTH(item.avg_cost)} บาท`}</td>}
          <td data-label="สถานะ"><MaterialState material={item} /></td>
        </tr>)}</tbody>
      </table>}
    </>}
    <Drawer open={Boolean(material)} title={material?.name ?? ""} onClose={() => router.replace(href({ material: undefined }), { scroll: false })}>
      {material && <MaterialPanel key={`${material.id}:${material.version}`} api={api} material={material} admin={admin} onSaved={saved} />}
    </Drawer>
    <Toast message={toast} onDone={clearToast} />
  </section>;
}
