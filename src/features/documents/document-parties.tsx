"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { BackendApi, CustomerBilling, JobRequest, Quotation, ShopProfile, Terms } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { QuotationDocument } from "./business-documents";
import { PrintDocument } from "./document-print";
import { customerParty, shopParty } from "./documents-domain";

type Trigger = (props: ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;

/** Shop profile and the customer's billing details, as printed on every document. */
export function useDocumentParties(api: BackendApi, customerId: string) {
  const shop = useResource<ShopProfile>(api, "/shop-profile");
  const billing = useResource<CustomerBilling>(api, `/customers/${customerId}/billing`);
  return {
    ready: Boolean(shop.data && billing.data && !shop.loading && !billing.loading),
    error: shop.error ?? billing.error,
    shop: shopParty(shop.data), customer: customerParty(billing.data), customerType: billing.data?.customer_type,
  };
}

/** Print button for a sent quotation; `ready`/`hint` cover the caller's own data (accepted terms). */
export function QuotationPrint({ api, request, quote, terms, ready, hint, label, button }: { api: BackendApi; request: JobRequest; quote: Quotation; terms?: Terms; ready: boolean; hint: string; label?: string; button?: Trigger }) {
  const parties = useDocumentParties(api, request.customer_id);
  return <PrintDocument ready={ready && parties.ready} footer={`ใบเสนอราคา #${quote.quotation_no} ฉบับที่ ${quote.version}`} label={label} button={button} hint={parties.error ?? (parties.ready ? hint : "กำลังโหลดข้อมูลร้านและลูกค้า…")}>
    <QuotationDocument request={request} quote={quote} terms={terms} shop={parties.shop} customer={parties.customer} customerType={parties.customerType} />
  </PrintDocument>;
}
