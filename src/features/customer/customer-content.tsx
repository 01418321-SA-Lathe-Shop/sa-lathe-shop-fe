"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { CustomerOverview } from "./customer-overview";
import { CustomerNotifications } from "./customer-notifications";
import { CustomerRequests, CustomerRequestDetail } from "./customer-requests";
import { CustomerRequestWizard } from "./customer-request-wizard";
import { CustomerDocumentList, CustomerSalesDetail } from "./customer-sales";
import { Empty } from "./customer-ui";

export function CustomerContent({ api, fallback }: { api: BackendApi; fallback: ReactNode }) {
  const path = usePathname(); const query = useSearchParams();
  const request = query.get("request") ?? ""; const quotation = query.get("quotation") ?? "";
  const badId = ["request", "quotation", "job", "company"].some((key) => query.has(key) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.get(key) ?? ""));
  if (badId) return <Empty title="ลิงก์รายการไม่ถูกต้อง" action={<Link href="/customer">กลับภาพรวม</Link>}>เปิดรายการจากเมนูหรือการแจ้งเตือนอีกครั้ง</Empty>;
  if (path === "/customer") return <CustomerOverview api={api} />;
  if (path === "/customer/inbox") return <CustomerNotifications api={api} />;
  if (path === "/customer/requests") return query.get("view") === "new" ? <CustomerRequestWizard api={api} /> : request ? <CustomerRequestDetail api={api} id={request} /> : <CustomerRequests api={api} />;
  if (path === "/customer/quotations" || path === "/customer/deposit-po") {
    const deposit = path.endsWith("deposit-po");
    return request ? <CustomerSalesDetail api={api} requestId={request} quotationId={quotation || undefined} deposit={deposit} /> : <CustomerDocumentList api={api} mode={deposit ? "deposit" : "quotes"} />;
  }
  return fallback;
}
