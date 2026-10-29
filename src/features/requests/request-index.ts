"use client";

import { useEffect, useState } from "react";
import type { BackendApi, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api";
import { latestQuote, readCollection, type Collection } from "../customer/customer-domain";
import { useCollection } from "../customer/customer-hooks";
import { isClosed, type RequestRecord } from "./request-stage-domain";

// Every request (100 per call, up to 1,000), then quotations and the accepted
// quotation's Deposit/PO record for open requests only, six at a time.
export function useRequestIndex(api: BackendApi) {
  const requests = useCollection<JobRequest>(api, "/requests");
  const [index, setIndex] = useState<{ source?: Collection<JobRequest>; records: RequestRecord[]; complete: boolean }>({ records: [], complete: false });
  useEffect(() => {
    if (!requests.data) return;
    const source = requests.data; const controller = new AbortController();
    void (async () => {
      const records: RequestRecord[] = []; let complete = source.complete;
      for (let start = 0; start < source.items.length; start += 6) {
        records.push(...await Promise.all(source.items.slice(start, start + 6).map(async (request): Promise<RequestRecord> => {
          if (isClosed(request)) return { request, quotations: [] };
          try {
            const quotes = await readCollection<Quotation>(api, `/requests/${request.id}/quotations`, controller.signal);
            if (!quotes.complete) complete = false;
            const latest = latestQuote(quotes.items);
            const fulfillment = latest?.status === "approved" ? await api.call<Fulfillment>(`/quotations/${latest.id}/fulfillment`, "GET", undefined, controller.signal) : undefined;
            return { request, quotations: quotes.items, fulfillment };
          } catch { return { request, quotations: [], issue: true }; }
        })));
        if (controller.signal.aborted) return;
      }
      setIndex({ source, records, complete });
    })();
    return () => controller.abort();
  }, [api, requests.data]);
  // A reload keeps showing the previous index until the new one is ready.
  const ready = Boolean(requests.data) && index.source === requests.data;
  return { error: requests.error, reload: requests.reload, records: requests.data && index.source ? index.records : undefined, complete: ready && index.complete, loading: requests.loading || Boolean(requests.data && !ready) };
}
