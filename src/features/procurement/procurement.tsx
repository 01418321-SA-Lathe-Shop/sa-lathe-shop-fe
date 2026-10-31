"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi } from "../../lib/api/backend-api";
import { bahtTH, dateTH } from "../../components/staff-ui/staff-format";
import { ORDER_STATE } from "../../components/staff-ui/staff-labels";
import { Button, Drawer, EmptyState, LoadError, SearchForm, Skeleton, StatusBadge, StatusTabs, Toast, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { defaultOrderTab, matchOrder, ORDER_TABS, orderCounts, orderTab, orderTabOf, type OrderTab, type SupplierOrder } from "./procurement-domain";
import { NewOrderForm } from "./procurement-new";
import { OrderDetail } from "./procurement-order";
import { SupplierView } from "./procurement-suppliers";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./procurement.module.css";

// UC6 สั่งซื้อวัตถุดิบ is Admin-only: supplier orders by status (ใบสั่งซื้อ) and
// the supplier list (?view=suppliers, same route). No Supplier login exists.
const EMPTY: Record<OrderTab, [string, string]> = {
  pending: ["ไม่มีใบสั่งซื้อที่รอผู้ขายตอบ", "สร้างใบสั่งซื้อใหม่ได้จากปุ่มสั่งซื้อวัตถุดิบ"],
  accepted: ["ไม่มีใบสั่งซื้อที่รอรับของ", "ใบสั่งซื้อที่ผู้ขายรับแล้วจะอยู่ที่นี่จนกว่าจะรับของ"],
  partial: ["ไม่มีใบสั่งซื้อที่รับของบางส่วน", "บันทึกการรับของได้ที่หน้ารับเข้าวัตถุดิบ"],
  received: ["ยังไม่มีใบสั่งซื้อที่รับครบ", "ใบสั่งซื้อที่รับของครบแล้วจะอยู่ที่นี่"],
  cancelled: ["ไม่มีใบสั่งซื้อที่ยกเลิก", "ใบสั่งซื้อที่ผู้ขายปฏิเสธหรือถูกยกเลิกจะอยู่ที่นี่"],
};
const NEXT: Record<OrderTab, string> = { pending: "บันทึกคำตอบผู้ขาย", accepted: "รอรับของ", partial: "รอรับของที่เหลือ", received: "ดูใบสั่งซื้อ", cancelled: "ดูใบสั่งซื้อ" };

export function LiveProcurement({ api }: { api: BackendApi }) {
  return <Suspense fallback={<Skeleton label="กำลังเปิดสั่งซื้อวัตถุดิบ…" />}><ProcurementWorkspace api={api} /></Suspense>;
}

function ProcurementWorkspace({ api }: { api: BackendApi }) {
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter();
  const view = params.get("view") === "suppliers" ? "suppliers" : "orders";
  const cardView = params.get("layout") !== "list" && params.get("view") !== "list";
  const q = params.get("q") ?? ""; const selected = params.get("order") ?? "";
  const orders = useCollection<SupplierOrder>(api, "/material-orders");
  const items = orders.data?.items ?? []; const matched = items.filter((order) => matchOrder(order, q));
  const counts = orderCounts(matched); const tab = orderTab(params.get("tab")) ?? defaultOrderTab(counts);
  const rows = matched.filter((order) => orderTabOf(order) === tab);
  const order = view === "orders" ? items.find((item) => item.id === selected) : undefined;
  const [creating, setCreating] = useState(false); const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState(""); const clearToast = () => setToast("");
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) if (value) next.set(key, value); else next.delete(key);
    const query = next.toString(); return query ? `${pathname}?${query}` : pathname;
  };
  const saved = (message: string) => { if (message) setToast(message); orders.reload(); };
  const listLoading = orders.loading && !orders.data;
  return <section className={layout.page}>
    <nav className={layout.views} aria-label="มุมมอง">
      <Link href={href({ view: undefined })} scroll={false} aria-current={view === "orders" ? "page" : undefined}>ใบสั่งซื้อ</Link>
      <Link href={href({ view: "suppliers", tab: undefined, order: undefined, q: undefined })} scroll={false} aria-current={view === "suppliers" ? "page" : undefined}>ผู้ขาย</Link>
    </nav>
    {view === "suppliers" ? <SupplierView api={api} onSaved={setToast} /> : <>
      <div className={layout.toolbar}>
        <div className={styles.toolbarHead}>
          <StatusTabs label="สถานะใบสั่งซื้อ" tabs={ORDER_TABS.map((key) => ({ key, label: ORDER_STATE[key][0], count: counts[key], attention: key === "pending" }))} current={tab} href={(key) => href({ tab: key, order: undefined })} loading={listLoading} unavailable={Boolean(orders.error && !orders.data)} />
          <nav className={styles.viewSwitch} aria-label="รูปแบบการแสดงใบสั่งซื้อ">
            <Link href={href({ layout: undefined, order: undefined })} scroll={false} aria-current={cardView ? "page" : undefined}><Icon name="grid" size={17} /> การ์ด</Link>
            <Link href={href({ layout: "list", order: undefined })} scroll={false} aria-current={!cardView ? "page" : undefined}><Icon name="file" size={17} /> รายการ</Link>
          </nav>
        </div>
        <div className={layout.toolbarEnd}>
          <SearchForm label="ค้นหาใบสั่งซื้อ" placeholder="เลขใบสั่งซื้อหรือชื่อผู้ขาย" value={q} onSearch={(value) => router.replace(href({ q: value || undefined, order: undefined }), { scroll: false })} />
          <Button onClick={orders.reload} disabled={orders.loading}>อัปเดตข้อมูล</Button>
          <Button variant="primary" onClick={() => setCreating(true)}>สั่งซื้อวัตถุดิบ</Button>
        </div>
      </div>
      {orders.error && !orders.data && <LoadError title="โหลดใบสั่งซื้อไม่สำเร็จ" onRetry={orders.reload} />}
      <TruncatedNotice show={orders.data?.complete === false} />
      {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Link href={href({ q: undefined, order: undefined })} scroll={false}>ล้างการค้นหา</Link></p>}
      {cardView ? (
        <div className={styles.cardWorkspace}>
          <div className={styles.cardGrid} role="region" aria-label="ใบสั่งซื้อแบบการ์ด">
            {listLoading && <Skeleton label="กำลังโหลดใบสั่งซื้อ…" />}
            {rows.map((item) => <OrderCard key={item.id} order={item} tab={tab} selected={item.id === selected} href={href({ order: item.id, tab })} grid />)}
            {orders.data && !rows.length && <EmptyState title={q ? "ไม่พบใบสั่งซื้อที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบสั่งซื้อหรือชื่อผู้ขายอื่น" : EMPTY[tab][1]}</EmptyState>}
          </div>
        </div>
      ) : selected ? (
        <div className={`${layout.layout} ${styles.splitLayout}`} data-detail="open">
          <div className={layout.list} role="region" aria-label="รายการใบสั่งซื้อ">
            {listLoading && <Skeleton label="กำลังโหลดใบสั่งซื้อ…" />}
            {rows.map((item) => <OrderCard key={item.id} order={item} tab={tab} selected={item.id === selected} href={href({ order: item.id, tab })} />)}
            {orders.data && !rows.length && <EmptyState title={q ? "ไม่พบใบสั่งซื้อที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบสั่งซื้อหรือชื่อผู้ขายอื่น" : EMPTY[tab][1]}</EmptyState>}
          </div>
          <div className={layout.detail}>
            {order ? <OrderDetail key={`${order.id}:${order.version}`} api={api} order={order} backHref={href({ order: undefined })} receivingHref={pathname.replace(/\/orders$/, "/receiving")} onChanged={saved} />
              : <div className={layout.placeholder}><EmptyState title={selected && orders.data ? "ไม่พบใบสั่งซื้อนี้" : "เลือกใบสั่งซื้อจากรายการ"}>เปิดใบสั่งซื้อเพื่อบันทึกคำตอบผู้ขายหรือดูรายการวัตถุดิบ</EmptyState></div>}
          </div>
        </div>
      ) : (
        <div className={styles.fullListWorkspace}>
          <div className={styles.fullList} role="region" aria-label="รายการใบสั่งซื้อ">
            {listLoading && <Skeleton label="กำลังโหลดใบสั่งซื้อ…" />}
            {rows.map((item) => <OrderCard key={item.id} order={item} tab={tab} selected={false} href={href({ order: item.id, tab })} row />)}
            {orders.data && !rows.length && <EmptyState title={q ? "ไม่พบใบสั่งซื้อที่ค้นหา" : EMPTY[tab][0]}>{q ? "ลองค้นด้วยเลขใบสั่งซื้อหรือชื่อผู้ขายอื่น" : EMPTY[tab][1]}</EmptyState>}
          </div>
        </div>
      )}
      {cardView && selected && <OrderModal closeHref={href({ order: undefined })} returnFocusId={`order-card-${selected}`} onClose={() => router.replace(href({ order: undefined }), { scroll: false })}>
        {order ? <OrderDetail key={`${order.id}:${order.version}`} api={api} order={order} backHref={href({ order: undefined })} receivingHref={pathname.replace(/\/orders$/, "/receiving")} onChanged={saved} />
          : <div className={layout.placeholder}><EmptyState title="ไม่พบใบสั่งซื้อนี้">เปิดใบสั่งซื้อเพื่อบันทึกคำตอบผู้ขายหรือดูรายการวัตถุดิบ</EmptyState></div>}
      </OrderModal>}
      <Drawer open={creating} title="สั่งซื้อวัตถุดิบ" onClose={() => { if (!locked) setCreating(false); }}>
        {creating && <NewOrderForm api={api} onLock={setLocked} onPlaced={() => { setLocked(false); setCreating(false); saved("สั่งซื้อแล้ว รอผู้ขายตอบ"); router.replace(href({ tab: "pending", order: undefined, q: undefined }), { scroll: false }); }} />}
      </Drawer>
    </>}
    <Toast message={toast} onDone={clearToast} />
  </section>;
}

function OrderModal({ closeHref, returnFocusId, onClose, children }: { closeHref: string; returnFocusId: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current; if (node && !node.open) node.showModal();
    return () => document.getElementById(returnFocusId)?.focus();
  }, [returnFocusId]);
  return <dialog ref={dialog} className={styles.orderModal} aria-label="รายละเอียดใบสั่งซื้อ" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.modalFrame}>
      <div className={styles.modalToolbar}><span>รายละเอียดใบสั่งซื้อ</span><Link href={closeHref} scroll={false} aria-label="ปิดรายละเอียดใบสั่งซื้อ"><Icon name="close" size={20} /></Link></div>
      <div className={styles.modalBody}>{children}</div>
    </div>
  </dialog>;
}

function OrderCard({ order, tab, selected, href, grid = false, row = false }: { order: SupplierOrder; tab: OrderTab; selected: boolean; href: string; grid?: boolean; row?: boolean }) {
  const lines = order.lines?.length ?? 0;
  const dateLabel = order.expected_at && (tab === "pending" || tab === "accepted" || tab === "partial") ? `คาดว่าจะได้รับ ${dateTH(order.expected_at)}` : `สั่งเมื่อ ${dateTH(order.created_at)}`;

  if (grid) {
    return <Link id={`order-card-${order.id}`} href={href} scroll={false} className={styles.gridCard} aria-current={selected ? "true" : undefined}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.metaLabel}>ใบสั่งซื้อ</span>
          <strong>#{order.order_no}</strong>
        </div>
      </div>
      <h3 className={styles.cardTitle}>{order.supplier.name}</h3>
      <div className={styles.cardStatus}>
        <StatusBadge map={ORDER_STATE} value={tab} />
      </div>
      <dl className={styles.essentials}>
        <div>
          <dt>ยอดรวม</dt>
          <dd>{bahtTH(order.total_amount)}</dd>
        </div>
        <div>
          <dt><Icon name="layers" size={14} /> วัตถุดิบ</dt>
          <dd>{lines} รายการ</dd>
        </div>
      </dl>
      <div className={styles.cardStep}>
        <span>{dateLabel}</span>
      </div>
      <footer className={styles.cardFooter}>
        <span className={styles.openHint}>{NEXT[tab]} <Icon name="arrow" size={14} /></span>
      </footer>
    </Link>;
  }

  return <Link id={`order-card-${order.id}`} href={href} scroll={false} className={`${layout.card} ${row ? styles.rowCard : styles.compactCard}`} aria-current={selected ? "true" : undefined}>
    <div className={row ? styles.rowMain : undefined}>
      <span className={layout.cardTop}><strong className={!row ? styles.orderNumber : undefined}>{order.order_no}</strong>{!row && <StatusBadge map={ORDER_STATE} value={tab} />}</span>
      <span className={layout.cardTitle}>{order.supplier.name}</span>
      <span className={layout.cardMeta}>{bahtTH(order.total_amount)}{row ? ` · วัตถุดิบ ${lines} รายการ` : ""}</span>
    </div>
    {row && <div className={styles.rowStatus}>
      <StatusBadge map={ORDER_STATE} value={tab} />
    </div>}
    <div className={row ? styles.rowMeta : undefined}>
      {row && <span className={layout.cardMeta}>{dateLabel}</span>}
    </div>
    {row && <span className={layout.cardNext} data-quiet={tab === "pending" ? undefined : ""}>{NEXT[tab]} <Icon name="arrow" size={14} /></span>}
  </Link>;
}
