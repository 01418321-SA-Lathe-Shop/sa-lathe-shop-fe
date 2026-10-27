"use client";

import { useEffect, useState } from "react";
import type { BackendApi, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api";
import { latestQuote, readCollection, type Collection } from "./customer-domain";
import { useCollection } from "./customer-hooks";

export type SalesRecord = { request: JobRequest; quotations: Quotation[]; fulfillment?: Fulfillment; issue?: boolean };

// Existing customer-visible DTOs only; no production/stock/cost endpoints.
// Bound concurrency instead of issuing a request waterfall or an unbounded fan-out.
export function useSalesIndex(api: BackendApi) {
  const requests = useCollection<JobRequest>(api, "/requests");
  const [index, setIndex] = useState<{ source?: Collection<JobRequest>; records: SalesRecord[]; complete: boolean }>({ records: [], complete: false });
  useEffect(() => {
    if (!requests.data) return;
    const source = requests.data; const controller = new AbortController();
    async function load() {
      const records: SalesRecord[] = []; let complete = source.complete;
      for (let start = 0; start < source.items.length; start += 6) {
        const batch = await Promise.all(source.items.slice(start, start + 6).map(async (request): Promise<SalesRecord> => {
          try {
            const quotes = await readCollection<Quotation>(api, `/requests/${request.id}/quotations`, controller.signal);
            if (!quotes.complete) complete = false;
            const accepted = quotes.items.find((quote) => quote.status === "approved");
            const fulfillment = accepted ? await api.call<Fulfillment>(`/quotations/${accepted.id}/fulfillment`, "GET", undefined, controller.signal) : undefined;
            return { request, quotations: quotes.items, fulfillment };
          } catch { complete = false; return { request, quotations: [], issue: true }; }
        }));
        if (controller.signal.aborted) return;
        records.push(...batch);
      }
      if (!controller.signal.aborted) setIndex({ source, records, complete });
    }
    void load();
    return () => controller.abort();
  }, [api, requests.data]);
  const ready = index.source === requests.data;
  return { ...requests, records: ready ? index.records : [], complete: ready && index.complete, loading: requests.loading || Boolean(requests.data && !ready) };
}

export function salesStep(record: SalesRecord) {
  if (record.issue) return "ยังโหลดขั้นตอนล่าสุดไม่ได้";
  if (record.request.status === "canceled") return "คำขอถูกยกเลิก · ดูรายละเอียดและประวัติ";
  if (record.request.status === "completed") return "รับงานแล้วและชำระครบ";
  if (record.fulfillment?.job) return "เปิดงานผลิตแล้ว";
  if (record.fulfillment) {
    const required = [record.fulfillment.terms.deposit_required ? "deposit" : "", record.fulfillment.terms.po_required ? "po" : ""].filter(Boolean);
    const pending = required.every((kind) => record.fulfillment?.evidence?.some((item) => item.kind === kind && item.status !== "rejected"));
    return pending ? "ส่งหลักฐานครบแล้ว รอเจ้าหน้าที่ตรวจสอบ" : "ตอบรับราคาแล้ว · ตรวจหลักฐานมัดจำ / PO";
  }
  const quote = latestQuote(record.quotations);
  if (quote?.status === "sent") return "มีใบเสนอราคาให้คุณพิจารณา";
  if (quote?.status === "rejected") return "รอใบเสนอราคาฉบับใหม่";
  return record.request.status === "pending" ? "รอร้านประเมินรายละเอียดคำขอ" : "อยู่ระหว่างดำเนินการกับร้าน";
}
