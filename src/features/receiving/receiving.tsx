"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi } from "../../lib/api/backend-api";
import { dateTH } from "../../components/staff-ui/staff-format";
import { RECEIVING_STATE } from "../../components/staff-ui/staff-labels";
import { Button, EmptyState, LoadError, SearchForm, Skeleton, StatusBadge, StatusTabs, Toast, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { defaultReceivingTab, hasOpenClaim, inReceivingTab, matchReceiving, owesSupplier, RECEIVING_TABS, receivingCounts, receivingTab, statusTab, type ReceivingState, type ReceivingSummary, type ReceivingTab } from "./receiving-domain";
import { ReceivingDetail } from "./receiving-detail";
import layout from "../../components/staff-ui/staff-layout.module.css";

const EMPTY: Record<ReceivingTab, [string, string]> = {
  waiting: ["ไม่มีใบสั่งซื้อที่รอรับของ", "ใบสั่งซื้อที่ผู้ขายรับแล้วจะมาอยู่ที่นี่"],
  partial: ["ไม่มีใบสั่งซื้อที่รับของบางส่วน", "ใบสั่งซื้อที่ยังรับของไม่ครบจะอยู่ที่นี่"],
  received: ["ยังไม่มีใบสั่งซื้อที่รับครบ", "ใบสั่งซื้อที่รับของดีครบแล้วจะอยู่ที่นี่"],
  damaged: ["ไม่มีของเสียหายที่ค้างอยู่", "ของเสียหายที่ยังรอแจ้งผู้ขายหรือรอของแทนจะอยู่ที่นี่"],
  unpaid: ["ไม่มียอดค้างจ่ายผู้ขาย", "ใบสั่งซื้อที่รับครบแต่ยังไม่ได้จ่ายผู้ขายจะอยู่ที่นี่"],
};
const NEXT: Record<ReceivingTab, string> = { waiting: "บันทึกรับของ", partial: "รับของที่เหลือ", received: "ดูการรับของ", damaged: "จัดการของเสียหาย", unpaid: "จ่ายผู้ขาย" };
// shortcut: details are fetched for the first 100 listed orders only, move claim/payment flags into the list API when orders grow.
const DETAIL_LIMIT = 100;

// UC7 รับเข้าวัตถุดิบ: Staff and Admin receive accepted supplier orders and
// handle damaged goods; supplier credit days and payment are Admin-only.
export function LiveReceiving({ api, account }: { api: BackendApi; account: Account }) {
  return <Suspense fallback={<Skeleton label="กำลังเปิดรับเข้าวัตถุดิบ…" />}><ReceivingWorkspace api={api} admin={account.role === "admin"} /></Suspense>;
}

// The list summary has no claim or payment data, so each listed order's detail
// is read once per list load to place it in มีของเสียหาย / ค้างจ่ายผู้ขาย.
function useReceivingStates(api: BackendApi, rows: ReceivingSummary[] | undefined) {
  const [result, setResult] = useState<{ rows?: ReceivingSummary[]; states: Record<string, ReceivingState>; failed: boolean }>({ states: {}, failed: false });
  useEffect(() => {
    if (!rows) return;
    const controller = new AbortController();
    void Promise.allSettled(rows.slice(0, DETAIL_LIMIT).map((row) => api.call<ReceivingState>(`/receiving/orders/${row.order_id}`, "GET", undefined, controller.signal))).then((settled) => {
      if (controller.signal.aborted) return;
      const states: Record<string, ReceivingState> = {};
      for (const item of settled) if (item.status === "fulfilled") states[item.value.order_id] = item.value;
      setResult({ rows, states, failed: settled.some((item) => item.status === "rejected") || rows.length > DETAIL_LIMIT });
    });
    return () => controller.abort();
  }, [api, rows]);
  return { states: result.states, loading: Boolean(rows) && result.rows !== rows, failed: result.failed };
}

function ReceivingWorkspace({ api, admin }: { api: BackendApi; admin: boolean }) {
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter();
  const q = params.get("q") ?? ""; const selected = params.get("order") ?? "";
  const orders = useCollection<ReceivingSummary>(api, "/receiving/orders");
  const details = useReceivingStates(api, orders.data?.items);
  const items = orders.data?.items ?? []; const matched = items.filter((row) => matchReceiving(row, q));
  const counts = receivingCounts(matched, details.states); const tab = receivingTab(params.get("tab"), admin) ?? defaultReceivingTab(counts);
  const rows = matched.filter((row) => inReceivingTab(tab, row, details.states[row.order_id]));
  const tabs = RECEIVING_TABS.filter((key) => admin || key !== "unpaid");
  const [toast, setToast] = useState(""); const clearToast = () => setToast("");
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) if (value) next.set(key, value); else next.delete(key);
    const query = next.toString(); return query ? `${pathname}?${query}` : pathname;
  };
  const saved = (message: string) => { if (message) setToast(message); orders.reload(); };
  const listLoading = orders.loading && !orders.data;
  const detailTab = tab === "damaged" || tab === "unpaid";
  return <section className={layout.page}>
    <div className={layout.toolbar}>
      <StatusTabs label="สถานะการรับของ" tabs={tabs.map((key) => ({ key, label: RECEIVING_STATE[key][0], count: (key === "damaged" || key === "unpaid") && details.loading ? undefined : counts[key], attention: key === "waiting" || key === "damaged" }))} current={tab} href={(key) => href({ tab: key, order: undefined })} loading={listLoading} unavailable={Boolean(orders.error && !orders.data)} />
      <div className={layout.toolbarEnd}>
        <SearchForm label="ค้นหาการรับของ" placeholder="เลขใบสั่งซื้อหรือชื่อผู้ขาย" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, order: undefined }), { scroll: false })} />
        <Button onClick={orders.reload} disabled={orders.loading}>อัปเดตข้อมูล</Button>
      </div>
    </div>
    {orders.error && !orders.data && <LoadError title="โหลดรายการรับของไม่สำเร็จ" onRetry={orders.reload} />}
    <TruncatedNotice show={orders.data?.complete === false} />
    {details.failed && !details.loading && <p className={layout.warning}>โหลดรายละเอียดบางใบสั่งซื้อไม่ได้ จำนวนในแท็บมีของเสียหาย{admin ? "และค้างจ่ายผู้ขาย" : ""}อาจไม่ครบ กดอัปเดตข้อมูลเพื่อโหลดใหม่</p>}
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, order: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
    <div className={layout.layout} data-detail={selected ? "open" : undefined}>
      <div className={layout.list} role="region" aria-label="รายการใบสั่งซื้อที่รับของ">
        {(listLoading || (detailTab && details.loading)) && <Skeleton label="กำลังโหลดรายการรับของ…" />}
        {!(detailTab && details.loading) && rows.map((row) => <ReceivingCard key={row.order_id} row={row} state={details.states[row.order_id]} tab={tab} admin={admin} selected={row.order_id === selected} href={href({ order: row.order_id, tab })} />)}
        {orders.data && !(detailTab && details.loading) && !rows.length && <EmptyState title={q ? "ไม่พบใบสั่งซื้อที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบสั่งซื้อหรือชื่อผู้ขายอื่น" : EMPTY[tab][1]}</EmptyState>}
      </div>
      <div className={layout.detail}>
        {selected ? <ReceivingDetail key={selected} api={api} admin={admin} id={selected} backHref={href({ order: undefined })} onChanged={saved} />
          : <div className={layout.placeholder}><EmptyState title="เลือกใบสั่งซื้อจากรายการ">เปิดใบสั่งซื้อเพื่อบันทึกรับของหรือจัดการของเสียหาย</EmptyState></div>}
      </div>
    </div>
    <Toast message={toast} onDone={clearToast} />
  </section>;
}

function ReceivingCard({ row, state, tab, admin, selected, href }: { row: ReceivingSummary; state?: ReceivingState; tab: ReceivingTab; admin: boolean; selected: boolean; href: string }) {
  const lines = state?.lines ?? []; const left = lines.filter((line) => line.outstanding !== "0.000000").length;
  const status = statusTab(row);
  return <Link href={href} scroll={false} className={layout.card} aria-current={selected ? "true" : undefined}>
    <span className={layout.cardTop}><strong>{row.order_no}</strong>{status && <StatusBadge map={RECEIVING_STATE} value={status} />}</span>
    <span className={layout.cardTitle}>{row.supplier_name}</span>
    {state && <span className={layout.cardMeta}>วัตถุดิบ {lines.length} รายการ{left && status !== "received" ? ` · ค้างรับ ${left} รายการ` : ""}{row.full_received_at ? ` · รับครบ ${dateTH(row.full_received_at)}` : ""}</span>}
    {(hasOpenClaim(state) || (admin && owesSupplier(state))) && <span className={layout.cardMeta}>{hasOpenClaim(state) && <ToneBadge tone="problem">มีของเสียหาย</ToneBadge>}{admin && owesSupplier(state) && <ToneBadge tone="action">ค้างจ่ายผู้ขาย</ToneBadge>}</span>}
    <span className={layout.cardNext} data-quiet={tab === "received" ? "" : undefined}>{NEXT[tab]} <Icon name="arrow" size={14} /></span>
  </Link>;
}
