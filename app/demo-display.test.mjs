import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTHB, formatBangkok } from './demo-display.ts';

test('THB display uses satang, exact two-decimal presentation and no VAT',()=>{
  assert.match(formatTHB(12345),/THB\s*123\.45/);
  assert.match(formatTHB(0),/THB\s*0\.00/);
  assert.match(formatTHB(1000000),/THB\s*10,000\.00/);
  assert.match(formatTHB(-1),/THB\s*-?0\.01|-THB\s*0\.01/);
  assert.equal(formatTHB(12345).includes('VAT'),false);
  assert.match(formatTHB(900001/4),/2,250\.00/);
});
test('Dates use Asia/Bangkok across UTC midnight and seasonal host timezones',()=>{
  for(const hostZone of ['UTC','America/New_York','Asia/Tokyo']){
    const previous=process.env.TZ;process.env.TZ=hostZone;
    try{
      assert.equal(formatBangkok('2026-10-15T18:30:00.000Z'),'16 Oct 2026, 01:30 ICT');
      assert.equal(formatBangkok('2026-01-01T00:00:00.000Z'),'1 Jan 2026, 07:00 ICT');
      assert.equal(formatBangkok(0),'1 Jan 1970, 07:00 ICT');
    }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
  }
});
test('Missing/invalid display values are not fabricated as zero or the current time',()=>{
  for(const value of [undefined,NaN,Infinity])assert.equal(formatTHB(value),'Unavailable');
  for(const value of [undefined,'','invalid',NaN,Infinity])assert.equal(formatBangkok(value),'Unavailable');
});
