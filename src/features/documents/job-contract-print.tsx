"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { BackendApi, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api";
import type { FulfillmentJob } from "../delivery/delivery-domain";
import { useResource } from "../../hooks/backend-hooks";
import { useCollection } from "../customer/customer-hooks";
import { JobContractDocument } from "./business-documents";
import { useDocumentParties } from "./document-parties";
import { PrintDocument } from "./document-print";
import { jobRef, missingContractInfo } from "./documents-domain";

type Trigger = (props: ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;

/**
 * Loads the accepted quotation, its saved terms, the job's invoice state and both
 * parties' saved details, then offers the Thai contract for printing.
 */
export function JobContractPrint({ api, requestId, jobId, button }: { api: BackendApi; requestId: string; jobId: string; button?: Trigger }) {
  const quotes = useCollection<Quotation>(api, `/requests/${requestId}/quotations`);
  const request = useResource<JobRequest>(api, `/requests/${requestId}`);
  const quote = quotes.data?.items.find((item) => item.status === "approved");
  if (!quote || !request.data) return <PrintDocument ready={false} footer="" button={button} label="พิมพ์สัญญาจ้าง" hint={quotes.error ?? request.error ?? (quotes.loading || request.loading ? "กำลังโหลดใบเสนอราคาที่ตอบรับ…" : "ไม่พบใบเสนอราคาที่ตอบรับของงานนี้")}>{null}</PrintDocument>;
  return <Loaded api={api} request={request.data} jobId={jobId} quote={quote} button={button} />;
}

function Loaded({ api, request, jobId, quote, button }: { api: BackendApi; request: JobRequest; jobId: string; quote: Quotation; button?: Trigger }) {
  const fulfillment = useResource<Fulfillment>(api, `/quotations/${quote.id}/fulfillment`);
  const job = useResource<FulfillmentJob>(api, `/fulfillment/jobs/${jobId}`);
  const parties = useDocumentParties(api, request.customer_id);
  const opened = fulfillment.data?.job; const state = job.data;
  const ready = Boolean(opened && state && !fulfillment.loading && !job.loading && parties.ready);
  const creditDays = state?.invoice?.credit_days ?? state?.credit_days;
  const missing = missingContractInfo({ shop: parties.shop, customer: parties.customer, creditDays });
  const failed = fulfillment.error ?? job.error ?? parties.error;
  return <>
    <PrintDocument ready={ready} footer={`สัญญาจ้างทำของ JOB-${jobRef(jobId)}`} button={button} label="พิมพ์สัญญาจ้าง" hint={failed ?? "กำลังโหลดข้อมูลสัญญา…"}>
      {ready && <JobContractDocument request={request} quote={quote} terms={fulfillment.data!.terms} job={opened!} shop={parties.shop} customer={parties.customer} invoice={state!.invoice} creditDays={creditDays} />}
    </PrintDocument>
    {ready && <small>ร่างจากข้อมูลในระบบ ควรให้ผู้รู้กฎหมายตรวจถ้อยคำก่อนลงนาม · ข้อมูลที่ระบบยังไม่มี (เว้นช่องให้กรอก): {missing.join(", ")}</small>}
  </>;
}
