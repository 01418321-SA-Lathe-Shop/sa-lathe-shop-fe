import assert from "node:assert/strict";
import test from "node:test";
import {fileError,parsePaymentInput} from "./customer-files.ts";

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
