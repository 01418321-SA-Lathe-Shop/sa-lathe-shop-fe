import test from 'node:test';
import assert from 'node:assert/strict';
import { addWorker, editWorker, setWorkerStatus, passwordInputError, simulatePasswordChange } from './admin-domain.ts';
import { createWorkshopDemo } from './worker-fixtures.ts';
import { createCustomerDemo } from './customer-fixtures.ts';

const fields={name:'Demo technician',email:'technician@example.test',phone:'+66 80 000 0000'};
const at='2026-10-15T04:00:00.000Z';
const create=()=>addWorker([],'Admin','50000000-0000-4000-8000-000000000001',fields);

test('Admin adds a trimmed profile with required name/email/phone, UUID and active status',()=>{
  const workers=addWorker([],'Admin','50000000-0000-4000-8000-000000000001',{name:' Demo technician ',email:' technician@example.test ',phone:' +66 80 000 0000 '});
  assert.deepEqual(workers,[{id:'50000000-0000-4000-8000-000000000001',...fields,status:'active'}]);
  for(const key of ['name','email','phone'])assert.throws(()=>addWorker([],'Admin','id',{...fields,[key]:' '}),/required/);
  for(const email of ['not-an-email','a@b','a b@example.test'])assert.throws(()=>addWorker([],'Admin','id',{...fields,email}),/valid Worker email/);
  assert.throws(()=>addWorker(workers,'Admin',workers[0].id,fields),/unique/);
});
test('Admin edits contacts without changing identity, status or password-change metadata',()=>{
  let workers=create(); const id=workers[0].id;
  workers=setWorkerStatus(workers,'Admin',id,'inactive');
  workers=simulatePasswordChange(workers,'Admin',id,at);
  const before=workers;
  workers=editWorker(workers,'Admin',id,{...fields,name:'Updated technician'});
  assert.equal(workers[0].name,'Updated technician');
  assert.equal(workers[0].id,id);
  assert.equal(workers[0].status,'inactive');
  assert.equal(workers[0].passwordChangeSimulatedAt,at);
  assert.equal(before[0].name,fields.name);
  assert.throws(()=>editWorker(workers,'Admin','missing',fields),/not found/);
});
test('Deactivate/reactivate preserve the profile instead of deleting it',()=>{
  let workers=create();const id=workers[0].id;
  workers=setWorkerStatus(workers,'Admin',id,'inactive');assert.equal(workers[0].status,'inactive');
  workers=setWorkerStatus(workers,'Admin',id,'active');assert.equal(workers[0].status,'active');
  assert.equal(workers.length,1);
  assert.throws(()=>setWorkerStatus(workers,'Admin','missing','inactive'),/not found/);
  assert.throws(()=>setWorkerStatus(workers,'Admin',id,'deleted'),/Invalid/);
});
test('Customer and Worker cannot perform Admin profile/status/password actions',()=>{
  const workers=create(); const id=workers[0].id;
  for(const role of ['Customer','Worker']){
    assert.throws(()=>addWorker(workers,role,'new',fields),/Only Admin/);
    assert.throws(()=>editWorker(workers,role,id,fields),/Only Admin/);
    assert.throws(()=>setWorkerStatus(workers,role,id,'inactive'),/Only Admin/);
    assert.throws(()=>simulatePasswordChange(workers,role,id,at),/Only Admin/);
  }
});
test('Password confirmation validates without trimming/changing the password or storing credentials',()=>{
  const synthetic='Synthetic demo value only';
  assert.match(passwordInputError(' ',' '),/Enter/);
  assert.match(passwordInputError(synthetic,''),/Confirm/);
  assert.match(passwordInputError(synthetic,synthetic+' '),/match/);
  assert.equal(passwordInputError(' '+synthetic,' '+synthetic),undefined);
  const workers=create();const changed=simulatePasswordChange(workers,'Admin',workers[0].id,at);
  assert.equal(changed[0].passwordChangeSimulatedAt,at);
  assert.equal(JSON.stringify(changed).includes(synthetic),false);
  assert.equal('password' in changed[0],false);
  assert.equal('passwordHash' in changed[0],false);
  assert.throws(()=>simulatePasswordChange(workers,'Admin','missing',at),/not found/);
  assert.throws(()=>simulatePasswordChange(workers,'Admin',workers[0].id,'invalid'),/timestamp/);
});
test('Worker-management updates preserve manufacturing data and reset fixtures are fresh',()=>{
  const original=createWorkshopDemo(createCustomerDemo(Date.parse(at)),Date.parse(at));
  const updated={...original,workers:addWorker(original.workers,'Admin','new-worker',fields)};
  assert.equal(updated.requests,original.requests);
  assert.equal(updated.materials,original.materials);
  assert.equal(updated.orders,original.orders);
  assert.equal(updated.workers.length,original.workers.length+1);
  const reset=createWorkshopDemo(createCustomerDemo(Date.parse(at)),Date.parse(at));
  assert.equal(reset.workers.some(worker=>worker.id==='new-worker'),false);
  assert.notEqual(reset.workers,original.workers);
  for(const worker of reset.workers){assert.match(worker.id,/^[0-9a-f-]{36}$/);assert.ok(worker.name&&worker.email&&worker.phone);}
});
