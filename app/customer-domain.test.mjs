import assert from "node:assert/strict";
import test from "node:test";
import {createCustomerDemo} from "./customer-fixtures.ts";
import {
  confirmationDeadline, confirmationTerms, DEADLINE_MS, expireConfirmations,
  inspectDelivery, invoiceBalance, invoiceStatus, recordPayment,
  respondToQuotation, submitConfirmation,
} from "./customer-domain.ts";

const at = "2026-10-15T03:00:00.000Z";
const proof = { id: "proof", name: "receipt.pdf", size: 30, type: "application/pdf" };
function request(overrides = {}) {
  return { id: "request", details: "Sample job", customerType: "individual", createdAt: at,
    status: "ongoing", attachments: [], quotations: [{id:"quote", revision:1, price:640_000, status:"sent"}], rejections:0, ...overrides };
}

test("Deposit/PO terms cover individual and both sides of the company threshold", () => {
  assert.deepEqual(confirmationTerms("individual",640_000),{poRequired:false,deposit:320_000});
  assert.deepEqual(confirmationTerms("company",1_000_000),{poRequired:true,deposit:0});
  assert.deepEqual(confirmationTerms("company",1_000_002),{poRequired:true,deposit:500_001});
  assert.throws(()=>confirmationTerms("individual",101));
  assert.throws(()=>confirmationTerms("company",NaN));
});

test("sample scenarios use UUIDs, cover rejection limits, and deduct the Deposit once",()=>{
  const data=createCustomerDemo(Date.parse(at));
  for(const record of data.requests) {
    assert.match(record.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(record.rejections,record.quotations.filter(quote=>quote.status==="rejected").length);
    if(record.invoice) assert.equal(record.invoice.total,record.quotations.at(-1).price-confirmationTerms(record.customerType,record.quotations.at(-1).price).deposit);
  }
});

test("one sent quotation can only be accepted or rejected once", () => {
  const accepted=respondToQuotation(request(),"approved",at);
  assert.equal(accepted.acceptedAt,at);
  assert.equal(confirmationDeadline(accepted),Date.parse(at)+DEADLINE_MS);
  assert.throws(()=>respondToQuotation(accepted,"rejected",at));
  const rejected=respondToQuotation(request(),"rejected",at);
  assert.equal(rejected.rejections,1);
  assert.equal(rejected.quotations.at(-1).status,"rejected");
  assert.equal(rejected.status,"ongoing");
  assert.throws(()=>respondToQuotation(rejected,"rejected",at));
});

test("the fifth customer rejection cancels the request", () => {
  const result=respondToQuotation(request({rejections:4}),"rejected",at);
  assert.equal(result.rejections,5);
  assert.equal(result.status,"canceled");
  assert.throws(()=>respondToQuotation(result,"approved",at));
});

test("individual confirmation needs Deposit, company confirmation needs correct evidence", () => {
  const accepted=respondToQuotation(request(),"approved",at);
  assert.throws(()=>submitConfirmation(accepted,{},at,"job"));
  assert.equal(submitConfirmation(accepted,{deposit:proof},at,"job").job.status,"queued");
  const company=respondToQuotation(request({customerType:"company",quotations:[{id:"quote",revision:1,price:1_000_000,status:"sent"}]}),"approved",at);
  assert.throws(()=>submitConfirmation(company,{deposit:proof},at,"job"));
  assert.equal(submitConfirmation(company,{po:proof},at,"job").job.status,"queued");
  const large={...company,quotations:[{...company.quotations[0],price:1_600_000}]};
  assert.throws(()=>submitConfirmation(large,{po:proof},at,"job"));
  const confirmed=submitConfirmation(large,{po:proof,deposit:proof},at,"job");
  assert.throws(()=>submitConfirmation(confirmed,{po:proof,deposit:proof},at,"another-job"));
});

test("deadline expiry rejects late evidence but does not cancel confirmed jobs", () => {
  const accepted=respondToQuotation(request(),"approved",at);
  const deadline=confirmationDeadline(accepted);
  assert.throws(()=>submitConfirmation(accepted,{deposit:proof},new Date(deadline).toISOString(),"job"));
  const queued=submitConfirmation(accepted,{deposit:proof},at,"job");
  const expired=expireConfirmations({version:1,requests:[accepted,queued]},deadline);
  assert.equal(expired.requests[0].status,"canceled");
  assert.equal(expired.requests[1].job.status,"queued");
  assert.equal(expired.requests[1].status,"ongoing");
});

test("delivery return reopens production and prevents repeated inspection", () => {
  const ready=request({job:{id:"job",status:"completed"},delivery:{id:"delivery",status:"shipping"}});
  const returned=inspectDelivery(ready,"returned");
  assert.equal(returned.job.status,"in_progress");
  assert.equal(returned.delivery.status,"returned");
  assert.throws(()=>inspectDelivery(returned,"delivered"));
  assert.equal(inspectDelivery(ready,"delivered").delivery.status,"delivered");
});

test("installments update invoice state exactly and reject invalid/replayed payments", () => {
  const base=request({invoice:{id:"invoice",total:640_000,payments:[]}});
  assert.equal(invoiceStatus(base),"unpaid");
  const partial=recordPayment(base,{id:"payment-1",amount:100_001,at});
  assert.equal(invoiceBalance(partial),539_999);
  assert.equal(invoiceStatus(partial),"partial");
  assert.throws(()=>recordPayment(partial,{id:"payment-1",amount:1,at}));
  for(const amount of [0,-1,0.5,NaN,Infinity,540_000]) assert.throws(()=>recordPayment(partial,{id:"bad",amount,at}));
  const paid=recordPayment(partial,{id:"payment-2",amount:539_999,at});
  assert.equal(invoiceStatus(paid),"paid");
  assert.throws(()=>recordPayment(paid,{id:"extra",amount:1,at}));
  assert.throws(()=>recordPayment({...base,delivery:{id:"delivery",status:"returned"}},{id:"payment",amount:1,at}));
});
