import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceWorkshop } from './workshop-state.ts';
import { createCustomerDemo } from './customer-fixtures.ts';
import { createWorkshopDemo } from './worker-fixtures.ts';

const fresh=()=>({data:createWorkshopDemo(createCustomerDemo(0),0),generation:0,message:'Previous success',error:'',scope:'Customer:requests'});
test('Failed action preserves all committed data and never shows a success notice',()=>{
  const before=fresh();
  const after=reduceWorkshop(before,{scope:'Worker:production',message:'Should not appear',transform:()=>{throw new Error('Issue rejected');}});
  assert.equal(after.data,before.data);assert.equal(after.message,'');assert.equal(after.error,'Issue rejected');assert.equal(after.scope,'Worker:production');
});
test('Unchanged timer preserves state while changed silent lifecycle data clears stale notices',()=>{
  const before=fresh();
  assert.equal(reduceWorkshop(before,{transform:data=>data}),before);
  const after=reduceWorkshop(before,{transform:data=>({...data,requests:[]})});
  assert.equal(after.message,'');assert.equal(after.error,'');assert.equal(after.scope,undefined);assert.equal(after.generation,0);
});
test('Success clears prior error and global reset advances form generation exactly once',()=>{
  const before={...fresh(),error:'Old error'};
  const after=reduceWorkshop(before,{transform:data=>data,message:'Saved',scope:'Admin:workers'});
  assert.equal(after.error,'');assert.equal(after.message,'Saved');assert.equal(after.scope,'Admin:workers');
  const reset=reduceWorkshop(after,{transform:data=>data,reset:true,message:'Reset',scope:'Admin:workers'});
  assert.equal(reset.generation,1);
});
