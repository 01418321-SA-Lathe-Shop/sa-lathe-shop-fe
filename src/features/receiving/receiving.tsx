"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
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
import styles from "./receiving.module.css";

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
  const cardView = params.get("layout") !== "list" && params.get("view") !== "list";
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
      <div className={styles.toolbarHead}>
        <StatusTabs label="สถานะการรับของ" tabs={tabs.map((key) => ({ key, label: RECEIVING_STATE[key][0], count: (key === "damaged" || key === "unpaid") && details.loading ? undefined : counts[key], attention: key === "waiting" || key === "damaged" }))} current={tab} href={(key) => href({ tab: key, order: undefined })} loading={listLoading} unavailable={Boolean(orders.error && !orders.data)} />
        <nav className={styles.viewSwitch} aria-label="รูปแบบการแสดงการรับของ">
          <Link href={href({ layout: undefined, order: undefined })} scroll={false} aria-current={cardView ? "page" : undefined}><Icon name="grid" size={17} /> การ์ด</Link>
          <Link href={href({ layout: "list", order: undefined })} scroll={false} aria-current={!cardView ? "page" : undefined}><Icon name="file" size={17} /> รายการ</Link>
        </nav>
      </div>
      <div className={layout.toolbarEnd}>
        <SearchForm label="ค้นหาการรับของ" placeholder="เลขใบสั่งซื้อหรือชื่อผู้ขาย" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, order: undefined }), { scroll: false })} />
        <Button onClick={orders.reload} disabled={orders.loading}>อัปเดตข้อมูล</Button>
      </div>
    </div>
    {orders.error && !orders.data && <LoadError title="โหลดรายการรับของไม่สำเร็จ" onRetry={orders.reload} />}
    <TruncatedNotice show={orders.data?.complete === false} />
    {details.failed && !details.loading && <p className={layout.warning}>โหลดรายละเอียดบางใบสั่งซื้อไม่ได้ จำนวนในแท็บมีของเสียหาย{admin ? "และค้างจ่ายผู้ขาย" : ""}อาจไม่ครบ กดอัปเดตข้อมูลเพื่อโหลดใหม่</p>}
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, order: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
    {cardView ? (
      <div className={styles.cardWorkspace}>
        <div className={styles.cardGrid} role="region" aria-label="การรับของแบบการ์ด">
          {(listLoading || (detailTab && details.loading)) && <Skeleton label="กำลังโหลดรายการรับของ…" />}
          {!(detailTab && details.loading) && rows.map((row) => <ReceivingCard key={row.order_id} row={row} state={details.states[row.order_id]} tab={tab} admin={admin} selected={row.order_id === selected} href={href({ order: row.order_id, tab })} grid />)}
          {orders.data && !(detailTab && details.loading) && !rows.length && <EmptyState title={q ? "ไม่พบใบสั่งซื้อที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบสั่งซื้อหรือชื่อผู้ขายอื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
      </div>
    ) : selected ? (
      <div className={`${layout.layout} ${styles.splitLayout}`} data-detail="open">
        <div className={layout.list} role="region" aria-label="รายการใบสั่งซื้อที่รับของ">
          {(listLoading || (detailTab && details.loading)) && <Skeleton label="กำลังโหลดรายการรับของ…" />}
          {!(detailTab && details.loading) && rows.map((row) => <ReceivingCard key={row.order_id} row={row} state={details.states[row.order_id]} tab={tab} admin={admin} selected={row.order_id === selected} href={href({ order: row.order_id, tab })} />)}
          {orders.data && !(detailTab && details.loading) && !rows.length && <EmptyState title={q ? "ไม่พบใบสั่งซื้อที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบสั่งซื้อหรือชื่อผู้ขายอื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
        <div className={layout.detail}>
          <ReceivingDetail key={selected} api={api} admin={admin} id={selected} backHref={href({ order: undefined })} onChanged={saved} />
        </div>
      </div>
    ) : (
      <div className={styles.fullListWorkspace}>
        <div className={styles.fullList} role="region" aria-label="รายการใบสั่งซื้อที่รับของ">
          {(listLoading || (detailTab && details.loading)) && <Skeleton label="กำลังโหลดรายการรับของ…" />}
          {!(detailTab && details.loading) && rows.map((row) => <ReceivingCard key={row.order_id} row={row} state={details.states[row.order_id]} tab={tab} admin={admin} selected={false} href={href({ order: row.order_id, tab })} isRow />)}
          {orders.data && !(detailTab && details.loading) && !rows.length && <EmptyState title={q ? "ไม่พบใบสั่งซื้อที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบสั่งซื้อหรือชื่อผู้ขายอื่น" : EMPTY[tab][1]}</EmptyState>}
        </div>
      </div>
    )}
    {cardView && selected && <ReceivingModal closeHref={href({ order: undefined })} returnFocusId={`receiving-card-${selected}`} onClose={() => router.replace(href({ order: undefined }), { scroll: false })}>
      <ReceivingDetail key={selected} api={api} admin={admin} id={selected} backHref={href({ order: undefined })} onChanged={saved} />
    </ReceivingModal>}
    <Toast message={toast} onDone={clearToast} />
  </section>;
}

function ReceivingModal({ closeHref, returnFocusId, onClose, children }: { closeHref: string; returnFocusId: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current; if (node && !node.open) node.showModal();
    return () => document.getElementById(returnFocusId)?.focus();
  }, [returnFocusId]);
  return <dialog ref={dialog} className={styles.receivingModal} aria-label="รายละเอียดการรับของ" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.modalFrame}>
      <div className={styles.modalToolbar}><span>รายละเอียดการรับของ</span><Link href={closeHref} scroll={false} aria-label="ปิดรายละเอียดการรับของ"><Icon name="close" size={20} /></Link></div>
      <div className={styles.modalBody}>{children}</div>
    </div>
  </dialog>;
}

function ReceivingCard({ row, state, tab, admin, selected, href, grid = false, isRow = false }: { row: ReceivingSummary; state?: ReceivingState; tab: ReceivingTab; admin: boolean; selected: boolean; href: string; grid?: boolean; isRow?: boolean }) {
  const lines = state?.lines ?? []; const left = lines.filter((line) => line.outstanding !== "0.000000").length;
  const status = statusTab(row);

  if (grid) {
    return <Link id={`receiving-card-${row.order_id}`} href={href} scroll={false} className={styles.gridCard} aria-current={selected ? "true" : undefined}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.metaLabel}>ใบสั่งซื้อ</span>
          <strong>#{row.order_no}</strong>
        </div>
      </div>
      <h3 className={styles.cardTitle}>{row.supplier_name}</h3>
      <div className={styles.cardStatus}>
        {status && <StatusBadge map={RECEIVING_STATE} value={status} />}
      </div>
      <dl className={styles.essentials}>
        <div>
          <dt>วัตถุดิบ</dt>
          <dd>{lines.length ? `${lines.length} รายการ` : "—"}</dd>
        </div>
        <div>
          <dt><Icon name="clock" size={14} /> ค้างรับ</dt>
          <dd>{left ? `${left} รายการ` : status === "received" ? "ครบแล้ว" : "—"}</dd>
        </div>
      </dl>
      <div className={styles.cardStep}>
        {row.full_received_at && <span>รับครบ {dateTH(row.full_received_at)}</span>}
        {(hasOpenClaim(state) || (admin && owesSupplier(state))) && <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {hasOpenClaim(state) && <ToneBadge tone="problem">มีของเสียหาย</ToneBadge>}
          {admin && owesSupplier(state) && <ToneBadge tone="action">ค้างจ่ายผู้ขาย</ToneBadge>}
        </div>}
      </div>
      <footer className={styles.cardFooter}>
        <span className={styles.openHint}>{NEXT[tab]} <Icon name="arrow" size={14} /></span>
      </footer>
    </Link>;
  }

  return <Link id={`receiving-card-${row.order_id}`} href={href} scroll={false} className={`${layout.card} ${isRow ? styles.rowCard : ""}`} aria-current={selected ? "true" : undefined}>
    <div className={isRow ? styles.rowMain : undefined}>
      <span className={layout.cardTop}><strong>{row.order_no}</strong>{!isRow && status && <StatusBadge map={RECEIVING_STATE} value={status} />}</span>
      <span className={layout.cardTitle}>{row.supplier_name}</span>
      {state && <span className={layout.cardMeta}>วัตถุดิบ {lines.length} รายการ{left && status !== "received" ? ` · ค้างรับ ${left} รายการ` : ""}{row.full_received_at ? ` · รับครบ ${dateTH(row.full_received_at)}` : ""}</span>}
    </div>
    {isRow && <div className={styles.rowStatus}>
      {status && <StatusBadge map={RECEIVING_STATE} value={status} />}
      {(hasOpenClaim(state) || (admin && owesSupplier(state))) && <>
        {hasOpenClaim(state) && <ToneBadge tone="problem">มีของเสียหาย</ToneBadge>}
        {admin && owesSupplier(state) && <ToneBadge tone="action">ค้างจ่ายผู้ขาย</ToneBadge>}
      </>}
    </div>}
    <div className={isRow ? styles.rowMeta : undefined}>
      {!isRow && (hasOpenClaim(state) || (admin && owesSupplier(state))) && <span className={layout.cardMeta}>{hasOpenClaim(state) && <ToneBadge tone="problem">มีของเสียหาย</ToneBadge>}{admin && owesSupplier(state) && <ToneBadge tone="action">ค้างจ่ายผู้ขาย</ToneBadge>}</span>}
      {isRow && row.full_received_at && <span className={layout.cardMeta}>รับครบ {dateTH(row.full_received_at)}</span>}
    </div>
    {isRow && <span className={layout.cardNext} data-quiet={tab === "received" ? "" : undefined}>{NEXT[tab]} <Icon name="arrow" size={14} /></span>}
  </Link>;
}
