import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomerDemo } from './customer-fixtures.ts';
import { createWorkshopDemo } from './worker-fixtures.ts';
import { latestVisibleQuotation, respondToQuotation, inspectDelivery, recordPayment } from './customer-domain.ts';
import * as w from './worker-domain.ts';

const at = '2026-10-15T03:00:00.000Z';
const fresh = () => createWorkshopDemo(createCustomerDemo(Date.parse(at)), Date.parse(at));
const queued = (data) => data.requests.find(r => r.job?.status === 'queued');
function ordered() {
  let data = fresh();
  const job = queued(data).job.id, material = data.materials[1].id;
  data = w.reserveJob(data, job, { [material]: 'reservation' });
  data = w.createOrder(data, job, data.suppliers[0].id, [{ id: 'line', materialId: material, quantity: 5, unitPrice: 300000 }], 'order', at);
  return { data, job, material };
}
function ready() {
  let {data,job,material} = ordered();
  data = w.receiveMaterial(data,'order','line',5,0,{receipt:'receipt',movement:'movement',defect:'defect'},at);
  data = w.reserveJob(data,job,{[material]:'topup'});
  return {data,job,material};
}
test('UC2 enforces 60% markup; drafts stay hidden and sent revisions are immutable', () => {
  let data=fresh(); const id=data.requests[0].id;
  assert.equal(w.minimumQuote(400000,200000),960000);
  assert.equal(w.minimumQuote(1,0),undefined);
  assert.throws(()=>w.saveQuotation(data,id,{material:400000,labor:200000},959998,'quote',true),/60%/);
  data=w.saveQuotation(data,id,{material:400000,labor:200000},960000,'quote',false);
  assert.equal(latestVisibleQuotation(data.requests[0]),undefined);
  data=w.saveQuotation(data,id,{material:400000,labor:200000},960000,'unused',true);
  assert.equal(data.requests[0].quotations.length,1);
  assert.equal(data.requests[0].quotations[0].id,'quote');
  assert.equal(data.requests[0].status,'ongoing');
  assert.throws(()=>w.saveQuotation(data,id,{material:400000,labor:200000},960000,'other',true));
  data={...data,requests:data.requests.map(r=>r.id===id?respondToQuotation(r,'rejected',at):r)};
  data=w.saveQuotation(data,id,{material:400000,labor:200000},960000,'revision',false);
  assert.equal(latestVisibleQuotation(data.requests[0]).status,'rejected');
  assert.equal(data.requests[0].quotations.at(-1).revision,2);
});
test('UC2 cancellation prevents another quotation; half-satang Deposit is not rounded',()=>{
  let data=fresh(); const id=data.requests[0].id;
  assert.throws(()=>w.saveQuotation(data,id,{material:100,labor:0},161,'quote',true),/half-satang/);
  data=w.rejectRequest(data,id);
  assert.equal(data.requests[0].status,'canceled');
  assert.throws(()=>w.saveQuotation(data,id,{material:100,labor:0},160,'quote',true));
});
test('UC5 reservation never overbooks; repeated check is idempotent and shortage stays undefined',()=>{
  let data=fresh(); const job=queued(data).job.id, material=data.materials[1].id;
  data=w.reserveJob(data,job,{[material]:'reservation'});
  data=w.reserveJob(data,job,{[material]:'repeat'});
  assert.equal(w.reservedQuantity(data,material),3);
  assert.equal(w.availableQuantity(data,material),0);
  assert.equal(data.reservations.length,1);
  assert.equal(w.materialNeed(data,job,material).shortage,undefined);
  assert.throws(()=>w.savePlan(data,job,[]),/before reserving/);
  assert.throws(()=>w.startJob(data,job),/Reserve all/);
});
test('UC5 plans reject duplicates, negative and fractional demo quantities',()=>{
  const data=fresh(), job=queued(data).job.id, material=data.materials[0].id;
  assert.throws(()=>w.savePlan(data,job,[{materialId:material,quantity:1},{materialId:material,quantity:2}]));
  for(const quantity of [-1,0,1.5,NaN]) assert.throws(()=>w.savePlan(data,job,[{materialId:material,quantity}]));
  assert.equal(w.savePlan(data,job,[{materialId:material,quantity:2}]).plans[0].quantity,2);
});
test('UC6 exposes incoming counts without inventing an automatic shortage formula',()=>{
  const {data,job,material}=ordered();
  assert.equal(w.materialNeed(data,job,material).incoming,5);
  assert.throws(()=>w.createOrder(data,job,data.suppliers[0].id,[{id:'line2',materialId:material,quantity:1,unitPrice:1}],'order',at),/already exists/);
  assert.throws(()=>w.createOrder(data,job,data.suppliers[0].id,[{id:'other',materialId:'missing',quantity:1,unitPrice:1}],'other',at));
  assert.equal(w.cancelSupplierOrder(data,'order').orders[0].status,'cancelled');
});
test('UC7 good-only receipts atomically update stock, ledger and exact Moving Average',()=>{
  let {data,material}=ordered(); const before=data;
  data=w.receiveMaterial(data,'order','line',2,1,{receipt:'r1',movement:'m1',defect:'d1'},at);
  assert.equal(before.materials[1].onHand,3);
  assert.equal(data.materials[1].onHand,5);
  assert.deepEqual(data.materials[1].avgCost,w.exactCost(240000));
  assert.equal(data.orders[0].status,'partially_received');
  assert.equal(data.orders[0].items[0].status,'partially_received');
  assert.equal(data.movements.at(-1).quantity,2);
  assert.equal(data.defects[0].quantity,1);
  assert.equal(data.defects[0].status,'PENDING_CLAIM');
  assert.throws(()=>w.receiveMaterial(data,'order','line',1,0,{receipt:'r1',movement:'m2',defect:'d2'},at),/already recorded/);
  assert.throws(()=>w.receiveMaterial(data,'order','line',3,0,{receipt:'r2',movement:'m2',defect:'d2'},at),/exceeds/);
  data=w.receiveMaterial(data,'order','line',0,2,{receipt:'r2',movement:'m2',defect:'d2'},at);
  assert.equal(data.orders[0].status,'received');
  assert.equal(data.materials[1].onHand,5);
  assert.equal(w.materialNeed(data,queued(data).job.id,material).incoming,0);
  data=w.recordClaim(data,'d1'); assert.equal(data.defects[0].status,'CLAIMED');
  data=w.recordSupplierPayment(data,'order',true); assert.equal(data.orders[0].paymentStatus,'pending');
  assert.throws(()=>w.recordSupplierPayment(data,'order',false));
});
test('UC7 all-defective items never change stock or Moving Average',()=>{
  let {data}=ordered();
  assert.throws(()=>w.recordSupplierPayment(data,'order',false));
  data=w.receiveMaterial(data,'order','line',0,5,{receipt:'r',movement:'m',defect:'d'},at);
  assert.equal(data.materials[1].onHand,3);
  assert.deepEqual(data.materials[1].avgCost,w.exactCost(200000));
  assert.equal(data.movements.length,3);
  assert.equal(data.orders[0].items[0].status,'damaged');
  assert.equal(w.recordSupplierPayment(data,'order',false).orders[0].paymentStatus,'paid');
});
test('UC7 fractional averages retain exact precision through UC8 material issues',()=>{
  let data=fresh(); const job=queued(data).job.id, material=data.materials[1].id;
  data=w.savePlan(data,job,[{materialId:material,quantity:4}]);
  data=w.createOrder(data,job,data.suppliers[0].id,[{id:'fraction-line',materialId:material,quantity:1,unitPrice:300001}],'fraction-order',at);
  data=w.receiveMaterial(data,'fraction-order','fraction-line',1,0,{receipt:'r',movement:'m',defect:'d'},at);
  assert.deepEqual(data.materials[1].avgCost,{numerator:'900001',denominator:'4'});
  data=w.reserveJob(data,job,{[material]:'reservation'});
  data=w.startJob(data,job);
  data=w.issueMaterial(data,job,material,1,{usage:'u',movement:'issue',consumed:'c'},at);
  assert.deepEqual(data.usages[0].cost,{numerator:'900001',denominator:'4'});
  assert.deepEqual(data.materials[1].avgCost,{numerator:'900001',denominator:'4'});
});
test('UC5 another job cannot reserve stock already held by the first job',()=>{
  let data=fresh(); const request=queued(data), material=data.materials[1].id;
  data=w.reserveJob(data,request.job.id,{[material]:'first'});
  data={...data,requests:[...data.requests,{...request,id:'second-request',job:{id:'second-job',status:'queued'}}]};
  data=w.savePlan(data,'second-job',[{materialId:material,quantity:2}]);
  data=w.reserveJob(data,'second-job',{[material]:'second'});
  assert.equal(w.reservedQuantity(data,material,'second-job'),0);
  assert.equal(w.availableQuantity(data,material),0);
});
test('UC8 partial issue consumes only issued reservations and preserves exact fractional cost',()=>{
  let {data,job,material}=ready();
  assert.deepEqual(data.materials[1].avgCost,w.exactCost(262500));
  data=w.startJob(data,job);
  data=w.issueMaterial(data,job,material,3,{usage:'u1',movement:'m1',consumed:'c1'},at);
  assert.equal(data.materials[1].onHand,5);
  assert.equal(w.reservedQuantity(data,material),5);
  assert.equal(w.availableQuantity(data,material),0);
  assert.equal(data.usages[0].quantity,3);
  assert.equal(data.movements.at(-1).quantity,-3);
  assert.deepEqual(data.usages[0].cost,w.exactCost(787500));
  assert.throws(()=>w.issueMaterial(data,job,material,6,{usage:'u2',movement:'m2',consumed:'c2'},at));
  assert.throws(()=>w.completeJob(data,job),/actual/);
  data=w.recordActuals(data,job,{cost:100000,minutes:45,evidence:[]});
  assert.throws(()=>w.completeJob(data,job),/Finish issuing/);
  data=w.issueMaterial(data,job,material,5,{usage:'u2',movement:'m2',consumed:'c2'},at);
  data=w.completeJob(data,job);
  assert.equal(data.requests.find(r=>r.job?.id===job).job.status,'completed');
  assert.deepEqual(w.exactCost(100,3),{numerator:'100',denominator:'3'});
});
test('UC9 invoice deducts Deposit once and survives return/rework/redelivery with payments',()=>{
  let {data,job,material}=ready();
  data=w.startJob(data,job);
  data=w.issueMaterial(data,job,material,8,{usage:'u',movement:'m',consumed:'c'},at);
  data=w.recordActuals(data,job,{cost:100000,minutes:60,evidence:[]});
  data=w.completeJob(data,job);
  const id=data.requests.find(r=>r.job?.id===job).id;
  data=w.createDelivery(data,id,{id:'delivery',method:'pickup',recipient:'Demo recipient',evidence:[]},'invoice');
  let request=data.requests.find(r=>r.id===id);
  assert.equal(request.invoice.total,480000);
  request=recordPayment(request,{id:'payment',amount:100000,at});
  request=inspectDelivery(request,'returned');
  data={...data,requests:data.requests.map(r=>r.id===id?request:r)};
  data=w.completeJob(data,job);
  data=w.createDelivery(data,id,{id:'redelivery',method:'delivery',recipient:'Demo recipient',evidence:[]},'duplicate-invoice');
  request=data.requests.find(r=>r.id===id);
  assert.equal(request.invoice.id,'invoice');
  assert.equal(request.invoice.total,480000);
  assert.equal(request.invoice.payments.length,1);
  assert.equal(request.status,'ongoing');
  assert.throws(()=>w.createDelivery(data,id,{id:'again',method:'pickup',recipient:'Demo',evidence:[]},'new'));
});
