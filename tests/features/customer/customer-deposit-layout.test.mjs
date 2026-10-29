import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL(`../../../src/features/customer/${file}`, import.meta.url), "utf8");
test("Deposit/PO shares the quotation grid, document column and price rail", () => {
  const source = read("customer-deposits.tsx");
  assert.match(source, /styles\.quotationLayout.*styles\.depositLayout/);
  assert(source.indexOf("<CustomerPoPreview") < source.indexOf('<aside className="cust-price-panel">'));
  assert(source.indexOf('<section className="cust-document">') < source.indexOf('<aside className="cust-price-panel">'));
  assert.match(source, /className="cust-hero-price"/);
  assert.match(source, /<DepositChecklist state=\{state\}/);
  assert.doesNotMatch(source, /className="cust-payment-layout"|className="cust-side-summary"/);
});
test("Deposit/PO retains evidence gates, original files and retryable submission", () => {
  const source = read("customer-deposits.tsx");
  for (const value of ['availableEvidenceKinds(state, now)', 'availableEvidenceKinds(state, Date.now())', 'evidencePayload(state.terms', 'disabled={!ready || write.frozen}', '<CustomerWriteRetry', '<CustomerUpload', '/fulfillment', '/evidence', '/download', 'state.canceled_at', 'state.terms.documents_due_at']) assert(source.includes(value), value);
  assert.match(read("customer-documents.tsx"), /className=\{styles\.tabs\} aria-label="มุมมองมัดจำและ PO"/);
});
