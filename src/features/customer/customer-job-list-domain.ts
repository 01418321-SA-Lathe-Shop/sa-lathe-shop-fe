import type { JobRequest } from "../../lib/api/backend-api.ts";
import type { FulfillmentJob } from "../delivery/delivery-domain.ts";
import { compareRequestNumbers, JOB_LABELS } from "./customer-domain.ts";

// Presentation-only search over the same authorized collections. Order by the
// related request number without coercing large identifiers to Number.
export function matchingJobs(jobs: FulfillmentJob[], requests: JobRequest[], query: string, status = "") {
  const term = query.trim().toLocaleLowerCase("th-TH");
  const byId = new Map(requests.map((request) => [request.id, request]));
  return jobs.filter((job) => {
    if (status && job.job_status !== status) return false;
    const request = byId.get(job.request_id);
    return !term || Boolean(request && `${request.no_request} ${request.description}`.toLocaleLowerCase("th-TH").includes(term));
  }).sort((a, b) => {
    const left = byId.get(a.request_id); const right = byId.get(b.request_id);
    if (left && right) return compareRequestNumbers(left, right) || a.job_id.localeCompare(b.job_id);
    if (left) return -1;
    if (right) return 1;
    return a.job_id.localeCompare(b.job_id);
  });
}

export function jobStatusCounts(jobs: FulfillmentJob[], requests: JobRequest[], query: string) {
  const matched = matchingJobs(jobs, requests, query);
  const byStatus = Object.fromEntries(Object.keys(JOB_LABELS).map((status) => [status, 0]));
  for (const job of matched) if (Object.hasOwn(byStatus, job.job_status)) byStatus[job.job_status]++;
  return { all: matched.length, byStatus };
}
