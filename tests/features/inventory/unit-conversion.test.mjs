import test from "node:test";
import assert from "node:assert/strict";
import { fixedFactor, guessDensity, pieceWeightKg, weightFactor } from "../../../src/features/inventory/unit-conversion.ts";
import { convertToBase } from "../../../src/features/inventory/inventory-domain.ts";

test("standard units of one kind have one universal factor", () => {
  assert.deepEqual(fixedFactor("กรัม", "กิโลกรัม"), { factor: "0.001000", exact: true });
  assert.deepEqual(fixedFactor("ตัน", "กก."), { factor: "1000.000000", exact: true });
  assert.deepEqual(fixedFactor("นิ้ว", "มิลลิเมตร"), { factor: "25.400000", exact: true });
  assert.deepEqual(fixedFactor("ฟุต", "เมตร"), { factor: "0.304800", exact: true });
  assert.equal(fixedFactor("มิลลิเมตร", "ฟุต").exact, false, "1 mm = 0.00328083… ft cannot be stored exactly");
});
test("kg ↔ length or count depends on the material, so there is no fixed factor", () => {
  for (const [a, b] of [["เมตร", "กิโลกรัม"], ["เส้น", "กิโลกรัม"], ["แผ่น", "กิโลกรัม"], ["ชิ้น", "เมตร"]]) assert.equal(fixedFactor(a, b), null);
});
test("theoretical weights match Thai steel weight tables", () => {
  // S45C Ø45 round bar, 1 m: 12.485 kg; same bar 6 m: 74.909 kg
  assert.equal(weightFactor(pieceWeightKg({ shape: "round", diameter: 45 }, 1000, 7.85), "กิโลกรัม"), "12.485000");
  assert.equal(weightFactor(pieceWeightKg({ shape: "round", diameter: 45 }, 6000, 7.85), "กิโลกรัม"), "74.909000");
  // Same 1 m length but Ø16 or aluminium: why one kg/m factor cannot serve every material
  assert.equal(weightFactor(pieceWeightKg({ shape: "round", diameter: 16 }, 1000, 7.85), "กิโลกรัม"), "1.578000");
  assert.equal(weightFactor(pieceWeightKg({ shape: "round", diameter: 45 }, 1000, 2.7), "กิโลกรัม"), "4.294000");
  // SS400 plate 12 mm, 4 × 8 ft (1219 × 2438 mm): 279.955 kg; flat bar 50 × 6: 2.355 kg/m
  assert.equal(weightFactor(pieceWeightKg({ shape: "rect", width: 1219, thickness: 12 }, 2438, 7.85), "กิโลกรัม"), "279.955000");
  assert.equal(weightFactor(pieceWeightKg({ shape: "rect", width: 50, thickness: 6 }, 1000, 7.85), "กิโลกรัม"), "2.355000");
  assert.equal(weightFactor(5.549, "กรัม"), "5549.000000");
  assert.equal(weightFactor(5.549, "เมตร"), null);
  assert.equal(pieceWeightKg({ shape: "round", diameter: 0 }, 1000, 7.85), null);
});
test("a suggested factor converts typed quantities exactly to base stock", () => {
  assert.equal(convertToBase("2.5", "12.485000"), "31.212500");
  assert.equal(convertToBase("3", "74.909000"), "224.727000");
});
test("density guess follows the grade in the material name", () => {
  assert.equal(guessDensity("เหล็กเพลา S45C Ø45 มม."), 7.85);
  assert.equal(guessDensity("เหล็กกล้าไร้สนิม SUS304 แผ่นหนา 25 มม."), 7.93);
  assert.equal(guessDensity("เหล็กกล้าไร้สนิม SUS316 เพลากลม Ø25 มม."), 7.98);
  assert.equal(guessDensity("อะลูมิเนียม AL6061-T6 แผ่นหนา 20 มม."), 2.7);
  assert.equal(guessDensity("ทองบรอนซ์ SAE660 เพลากลมตัน Ø40 มม."), 8.93);
  assert.equal(guessDensity("พลาสติกวิศวกรรม POM แท่งกลม Ø50 มม."), 1.41);
  assert.equal(guessDensity("ยางรองแท่น"), undefined);
});
