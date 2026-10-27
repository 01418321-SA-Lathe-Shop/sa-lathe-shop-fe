"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Account, BackendApi } from "../../lib/api/backend-api";
import { CustomerOverview } from "./customer-overview";
import { CustomerNotifications } from "./customer-notifications";
import { CustomerRequests, CustomerRequestDetail } from "./customer-requests";
import { CustomerRequestWizard } from "./customer-request-wizard";
import { CustomerDocumentList, CustomerSalesDetail } from "./customer-sales";
import { Empty } from "./customer-ui";
import { CustomerJobs, CustomerJobDetail } from "./customer-jobs";
import { CustomerAccount } from "./customer-account";
import { CustomerSettings } from "./customer-settings";

export function CustomerContent({ api, account }: { api: BackendApi; account: Account }) {
  const path = usePathname(); const query = useSearchParams();
  const request = query.get("request") ?? ""; const quotation = query.get("quotation") ?? "";
  const badId = ["request", "quotation", "job", "company"].some((key) => query.has(key) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.get(key) ?? ""));
  if (badId) return <Empty title="ลิงก์รายการไม่ถูกต้อง" action={<Link href="/customer">กลับภาพรวม</Link>}>เปิดรายการจากเมนูหรือการแจ้งเตือนอีกครั้ง</Empty>;
  if (path === "/customer" && query.get("view") === "settings") return <CustomerSettings />;
  if (path === "/customer") return <CustomerOverview api={api} />;
  if (path === "/customer/inbox") return <CustomerNotifications api={api} />;
  if (path === "/customer/requests") return query.get("view") === "new" ? <CustomerRequestWizard api={api} /> : request ? <CustomerRequestDetail api={api} id={request} /> : <CustomerRequests api={api} />;
  if (path === "/customer/quotations" || path === "/customer/deposit-po") {
    const deposit = path.endsWith("deposit-po");
    return request ? <CustomerSalesDetail api={api} requestId={request} quotationId={quotation || undefined} deposit={deposit} /> : <CustomerDocumentList api={api} mode={deposit ? "deposit" : "quotes"} />;
  }
  if (["/customer/jobs", "/customer/payments", "/customer/delivery-payment"].includes(path)) {
    const mode = path.endsWith("payments") ? "payments" : path.endsWith("delivery-payment") ? "inspection" : "jobs";
    const id = query.get("job");
    return id ? <CustomerJobDetail api={api} account={account} id={id} mode={mode} /> : <CustomerJobs api={api} mode={mode} />;
  }
  if (path === "/customer/memberships") return <CustomerAccount api={api} account={account} />;
  return <Empty title="ไม่พบหน้าที่ต้องการ" action={<Link href="/customer">กลับภาพรวม</Link>} />;
}
