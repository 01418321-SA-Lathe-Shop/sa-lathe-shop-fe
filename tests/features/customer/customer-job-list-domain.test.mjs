import test from "node:test";
import assert from "node:assert/strict";
import { matchingJobs, jobStatusCounts } from "../../../src/features/customer/customer-job-list-domain.ts";

const requests = [{ id: "r1", no_request: "9007199254740993", description: "เพลา S45C [แบบ]" }, { id: "r2", no_request: 2, description: "เพลา S45C" }];
const jobs = [{ job_id: "j1", request_id: "r1", job_status: "queued" }, { job_id: "j2", request_id: "r2", job_status: "in_progress" }, { job_id: "j3", request_id: "r1", job_status: "completed" }, { job_id: "j4", request_id: "missing", job_status: "cancelled" }];

test("job search is literal and preserves exact request numbers, input order and job-status filtering", () => {
  assert.deepEqual(matchingJobs(jobs, requests, "  s45c ").map((job) => job.job_id), ["j1", "j2", "j3"]);
  assert.deepEqual(matchingJobs(jobs, requests, "[แบบ]").map((job) => job.job_id), ["j1", "j3"]);
  assert.deepEqual(matchingJobs(jobs, requests, "9007199254740993", "completed").map((job) => job.job_id), ["j3"]);
  assert.equal(matchingJobs(jobs, requests, ".*").length, 0);
  assert.deepEqual(jobs.map((job) => job.job_id), ["j1", "j2", "j3", "j4"]);
});

test("job counts apply the same query before the selected production status, without adding delivery/payment states", () => {
  assert.deepEqual(jobStatusCounts(jobs, requests, "s45c"), { all: 3, byStatus: { queued: 1, in_progress: 1, completed: 1, cancelled: 0 } });
  assert.deepEqual(jobStatusCounts(jobs, requests, ""), { all: 4, byStatus: { queued: 1, in_progress: 1, completed: 1, cancelled: 1 } });
});

test("missing request metadata never hides an unfiltered job or invents searchable details", () => {
  assert.equal(matchingJobs(jobs, [], "").length, 4);
  assert.equal(matchingJobs(jobs, [], "เพลา").length, 0);
  assert.equal(matchingJobs(jobs, requests, "", "shipping").length, 0);
});
