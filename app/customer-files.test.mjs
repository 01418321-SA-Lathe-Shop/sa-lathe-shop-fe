import assert from "node:assert/strict";
import test from "node:test";
import {fileError,parsePaymentInput,prepareDemoFile} from "./customer-files.ts";

test("file selection enforces decimal 100 MB boundary and document/image categories",()=>{
  assert.equal(fileError({name:"drawing.PDF",type:"application/pdf",size:100_000_000}),undefined);
  assert.ok(fileError({name:"drawing.pdf",type:"application/pdf",size:100_000_001}));
  assert.ok(fileError({name:"drawing.pdf",type:"application/pdf",size:0}));
  assert.ok(fileError({name:"program.exe",type:"image/png",size:10}));
  assert.equal(fileError({name:"photo.png",type:"image/png",size:10}),undefined);
});

test("payment input converts decimal text to exact integer satang",()=>{
  assert.equal(parsePaymentInput("123.45"),12345);
  assert.equal(parsePaymentInput("0.01"),1);
  assert.equal(parsePaymentInput(" 100 "),10000);
  for(const value of ["", "0", "-1", "1.234", "1e3", "NaN", "Infinity", "1,000", "9007199254740991"]) {
    assert.equal(parsePaymentInput(value),undefined);
  }
});

test('Local file preparation registers only a fresh successful read',async()=>{
  const file=new File(['synthetic'],'drawing.txt',{type:'text/plain'});
  let calls=0;const register=current=>{calls++;return {id:'demo',name:current.name,size:current.size,type:current.type};};
  const controller=new AbortController();
  await assert.rejects(prepareDemoFile(file,controller.signal,()=>true,register),/Upload again/);assert.equal(calls,0);
  assert.equal((await prepareDemoFile(file,controller.signal,()=>false,register)).name,'drawing.txt');assert.equal(calls,1);
  controller.abort();assert.equal(await prepareDemoFile(file,controller.signal,()=>false,register),undefined);assert.equal(calls,1);
});
test('Closing/resetting a form during an in-flight read cannot register its file later',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});let calls=0;
  const file={name:'delayed.txt',type:'text/plain',size:8,slice:()=>({arrayBuffer:()=>gate})};
  const controller=new AbortController();
  const pending=prepareDemoFile(file,controller.signal,()=>false,()=>{calls++;return {id:'orphan'};});
  controller.abort();release(new ArrayBuffer(8));
  assert.equal(await pending,undefined);assert.equal(calls,0);
});
