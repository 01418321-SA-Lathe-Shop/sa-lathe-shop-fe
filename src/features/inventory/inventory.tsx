"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Account, BackendApi } from "../../lib/api/backend-api";
import { quantityTH } from "../../components/staff-ui/staff-format";
import { Button, Drawer, EmptyState, LoadError, SearchForm, Skeleton, StatusTabs, Toast, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { filterStock, fullyReserved, reservedPercent, stockCounts, stockFilter, unitsInUse, type InventoryMaterial, type StockFilter } from "./inventory-domain";
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
  const listLoading = materials.loading && !materials.data; const loaded = Boolean(materials.data);
  const count = (n: number) => loaded ? n.toLocaleString("th-TH") : "—";
  const units = unitsInUse(items ?? []); const empty = filterStock(items ?? [], "empty").filter((item) => item.is_active);
  const search = <SearchForm label="ค้นหาวัตถุดิบ" placeholder="ชื่อวัตถุดิบ" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, material: undefined }), { scroll: false })} />;
  const searchNote = q && <p className={view === "stock" ? styles.note : layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, material: undefined })} scroll={false}>ล้างการค้นหา</Link></p>;
  return <section className={layout.page}>
    {admin && <nav className={layout.views} aria-label="มุมมอง">
      <Link href={href({ view: undefined })} scroll={false} aria-current={view === "stock" ? "page" : undefined}>สต๊อก</Link>
      <Link href={href({ view: "catalog", filter: undefined, material: undefined })} scroll={false} aria-current={view === "catalog" ? "page" : undefined}>ข้อมูลหลัก (หน่วย/วัตถุดิบ)</Link>
    </nav>}
    <div className={styles.head}><Button onClick={materials.reload} disabled={materials.loading}>อัปเดตข้อมูล</Button></div>
    <TruncatedNotice show={materials.data?.complete === false} />
    {view === "catalog" ? <>
      <div className={layout.toolbarEnd}>{search}</div>
      {materials.error && !materials.data && <LoadError title="โหลดสต๊อกวัตถุดิบไม่สำเร็จ" onRetry={materials.reload} />}
      {searchNote}
      <CatalogView api={api} materials={items} onSaved={saved} />
    </> : <>
      {/* Counts only: each material has its own base unit, so quantities are never totalled here. */}
      <dl className={styles.summary}>
        <div><dt>วัตถุดิบทั้งหมด</dt><dd>{count(items?.length ?? 0)}</dd></div>
        <div><dt>หมด (พร้อมใช้ 0)</dt><dd data-tone="danger">{count(counts.empty)}</dd></div>
        <div><dt>มีของแต่ถูกจองหมด</dt><dd data-tone="warning">{count((items ?? []).filter(fullyReserved).length)}</dd><small>คงเหลือทั้งหมดถูกจองให้งานแล้ว</small></div>
        <div><dt>หน่วยวัดที่ใช้</dt><dd>{count(units.length)}</dd>{units.length > 0 && <small>{units.join(" · ")}</small>}</div>
      </dl>
      {empty.length > 0 && filter !== "empty" && <div className={styles.alert} role="status">
        <p><strong>วัตถุดิบหมด {empty.length.toLocaleString("th-TH")} รายการ</strong> — {empty.slice(0, 5).map((item) => item.name).join(", ")}{empty.length > 5 ? ` และอีก ${(empty.length - 5).toLocaleString("th-TH")} รายการ` : ""}</p>
        <Link href={href({ filter: "empty", material: undefined })} scroll={false}>แสดงเฉพาะรายการนี้</Link>
      </div>}
      <section className={styles.panel} aria-label="สต๊อกวัตถุดิบ">
        <div className={styles.panelBar}>
          <StatusTabs label="กรองสต๊อก" tabs={FILTERS.map(([key, label]) => ({ key, label, count: counts[key] }))} current={filter} href={(key) => href({ filter: key === "all" ? undefined : key, material: undefined })} loading={listLoading} unavailable={Boolean(materials.error && !materials.data)} />
          {search}
        </div>
        {searchNote}
        {listLoading && <div className={styles.note}><Skeleton label="กำลังโหลดสต๊อกวัตถุดิบ…" /></div>}
        {materials.error && !materials.data && <div className={styles.note}><LoadError title="โหลดสต๊อกวัตถุดิบไม่สำเร็จ" onRetry={materials.reload} /></div>}
        {materials.data && !rows.length && <EmptyState title={q ? "ไม่พบวัตถุดิบที่ค้นหา" : EMPTY[filter]}>{q ? "ลองค้นด้วยชื่ออื่น" : admin ? "เพิ่มวัตถุดิบได้ที่ข้อมูลหลัก" : "ผู้ดูแลระบบเป็นผู้เพิ่มวัตถุดิบ"}</EmptyState>}
        {rows.length > 0 && <table className={styles.stock}>
          <caption className={layout.visuallyHidden}>สต๊อกวัตถุดิบ แต่ละจำนวนแสดงในหน่วยหลักของวัตถุดิบนั้น</caption>
          <thead><tr><th scope="col">วัตถุดิบ</th><th scope="col">คงเหลือ</th><th scope="col">จองแล้ว</th><th scope="col">พร้อมใช้</th>{admin && <th scope="col">ต้นทุนเฉลี่ย</th>}<th scope="col">สถานะ</th></tr></thead>
          <tbody>{rows.map((item) => { const unit = item.unit_name; const reserved = reservedPercent(item); return <tr key={item.id} aria-current={item.id === selected ? "true" : undefined}>
            <th scope="row"><Link href={href({ material: item.id })} scroll={false}>{item.name}</Link><span className={styles.unit}>หน่วย {unit}</span></th>
            <td data-label="คงเหลือ"><span className={styles.qty}>{quantityTH(item.qty_on_hand)} <small>{unit}</small></span>
              <span className={styles.bar} role="img" aria-label={`จองแล้ว ${reserved}% ของคงเหลือ`}><span style={{ width: `${reserved}%` }} /></span></td>
            <td data-label="จองแล้ว"><span className={styles.qty}>{quantityTH(item.qty_reserved)} <small>{unit}</small></span></td>
            <td data-label="พร้อมใช้"><strong className={styles.qty}>{quantityTH(item.qty_available)} <small>{unit}</small></strong></td>
            {admin && <td data-label="ต้นทุนเฉลี่ย">{item.avg_cost === undefined ? "—" : <span className={styles.qty}>{quantityTH(item.avg_cost)} <small>บาท/{unit}</small></span>}</td>}
            <td data-label="สถานะ"><MaterialState material={item} /></td>
          </tr>; })}</tbody>
        </table>}
        {loaded && <p className={styles.footer} aria-live="polite">แสดง {rows.length.toLocaleString("th-TH")} จาก {(items?.length ?? 0).toLocaleString("th-TH")} รายการ</p>}
      </section>
    </>}
    <Drawer open={Boolean(material)} title={material?.name ?? ""} onClose={() => router.replace(href({ material: undefined }), { scroll: false })}>
      {material && <MaterialPanel key={`${material.id}:${material.version}`} api={api} material={material} admin={admin} onSaved={saved} />}
    </Drawer>
    <Toast message={toast} onDone={clearToast} />
  </section>;
}
