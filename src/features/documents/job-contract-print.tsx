"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { BackendApi, Customer, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api";
import type { FulfillmentJob } from "../delivery/delivery-domain";
import { useResource } from "../../hooks/backend-hooks";
import { useCollection } from "../customer/customer-hooks";
import { JobContractDocument } from "./business-documents";
import { PrintDocument } from "./document-print";
import { jobRef, missingContractInfo } from "./documents-domain";

type Trigger = (props: ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;

/**
 * Loads the accepted quotation, its saved terms and the job's invoice state, then
 * offers the Thai contract for printing. Only Customers can read their own
 * profile (name); staff copies print the name as a fill-in line.
 */
export function JobContractPrint({ api, requestId, jobId, customerView, button }: { api: BackendApi; requestId: string; jobId: string; customerView: boolean; button?: Trigger }) {
  const quotes = useCollection<Quotation>(api, `/requests/${requestId}/quotations`);
  const quote = quotes.data?.items.find((item) => item.status === "approved");
  if (!quote) return <PrintDocument ready={false} footer="" button={button} label="พิมพ์สัญญาจ้าง" hint={quotes.error ?? (quotes.loading ? "กำลังโหลดใบเสนอราคาที่ตอบรับ…" : "ไม่พบใบเสนอราคาที่ตอบรับของงานนี้")}>{null}</PrintDocument>;
  const props = { api, requestId, jobId, quote, button };
  return customerView ? <WithProfile {...props} /> : <Loaded {...props} profile={{ ready: true }} />;
}

type Props = { api: BackendApi; requestId: string; jobId: string; quote: Quotation; button?: Trigger };
function WithProfile(props: Props) {
  const profiles = useResource<{ items: Customer[] | null }>(props.api, "/customers");
  return <Loaded {...props} profile={{ ready: Boolean(profiles.data && !profiles.loading), items: profiles.data?.items ?? [], error: profiles.error }} />;
}

function Loaded({ api, requestId, jobId, quote, button, profile }: Props & { profile: { ready: boolean; items?: Customer[]; error?: string } }) {
  const request = useResource<JobRequest>(api, `/requests/${requestId}`);
  const fulfillment = useResource<Fulfillment>(api, `/quotations/${quote.id}/fulfillment`);
  const job = useResource<FulfillmentJob>(api, `/fulfillment/jobs/${jobId}`);
  const customer = profile.items?.find((item) => item.id === request.data?.customer_id);
  const opened = fulfillment.data?.job; const state = job.data;
  const ready = Boolean(request.data && opened && state && !request.loading && !fulfillment.loading && !job.loading && profile.ready && (!profile.items || customer));
  const missing = missingContractInfo({ customerName: customer?.name, creditDays: state?.invoice?.credit_days ?? state?.credit_days });
  const failed = request.error ?? fulfillment.error ?? job.error ?? profile.error;
  return <>
    <PrintDocument ready={ready} footer={`สัญญาจ้างทำของ JOB-${jobRef(jobId)}`} button={button} label="พิมพ์สัญญาจ้าง" hint={failed ?? "กำลังโหลดข้อมูลสัญญา…"}>
      {ready && <JobContractDocument request={request.data!} quote={quote} terms={fulfillment.data!.terms} job={opened!} customer={customer} invoice={state!.invoice} creditDays={state!.invoice?.credit_days ?? state!.credit_days} />}
    </PrintDocument>
    {ready && <small>ร่างจากข้อมูลในระบบ ควรให้ผู้รู้กฎหมายตรวจถ้อยคำก่อนลงนาม · ข้อมูลที่ระบบยังไม่มี (เว้นช่องให้กรอก): {missing.join(", ")}</small>}
  </>;
}
