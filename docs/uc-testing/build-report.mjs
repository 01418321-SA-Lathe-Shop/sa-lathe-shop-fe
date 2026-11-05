// Phase 3: builds results.csv and UC-test-report.docx from screenshots/manifest.json.
// Usage: FIGURE_START=1 node build-report.mjs   (LOCAL dependencies only; run after the UC specs)
import { chromium } from "@playwright/test";
import { AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType } from "docx";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, "screenshots");
const CACHE = path.join(HERE, "tmp", "docx-img");
const FIGURE_START = Number(process.env.FIGURE_START ?? 1);
const FONT = "TH Sarabun New";
const manifest = JSON.parse(fs.readFileSync(path.join(SHOTS, "manifest.json"), "utf8"));

// Main steps first, then error cases, each in guide order; the shot order within a step comes from the file name.
const rank = (row) => [Number(row.uc.slice(2)), row.step[0] === "S" ? 0 : 1, Number(row.step.slice(1)), row.file === "" ? 1 : 0, row.file];
const compare = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; };
const rows = [...manifest].sort(compare);
// UC names follow docs/Use_Case_Description_UC1-UC12.md; the manifest keeps the test guide's titles.
const UC_NAMES = { UC1: "ส่งรายละเอียดออเดอร์ (Submit Job Request)", UC2: "ประเมินราคา (Estimate & Quote)", UC3: "ตรวจสอบเงื่อนไขลูกค้า (Verify Customer & Set Terms)", UC4: "จัดเก็บมัดจำ / จัดการใบ PO (Handle Deposit & PO)", UC5: "เช็คสต็อกวัตถุดิบ (Check Material Stock)", UC6: "สั่งวัตถุดิบจาก Supplier (Order Materials)", UC7: "รับของ และอัปเดตสต็อก (Receive & Stock)", UC8: "ทำงานตามแบบ (Execute Job)", UC9: "ส่งมอบ และรับชำระ (Deliver & Settle Payment)", UC10: "ตั้งค่าหน่วยนับ (Unit Setting)", UC11: "เพิ่มพนักงาน (Add Worker)", UC12: "เพิ่มผู้ดูแลระบบ (Add Admin)" };

// ---- results.csv (BOM so Excel reads Thai correctly) ----
const csv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const lines = [["uc", "step", "kind", "file", "status", "note"].join(","), ...rows.map((r) => [r.uc, r.step, r.kind, r.file, r.status, r.note].map(csv).join(","))];
fs.writeFileSync(path.join(SHOTS, "results.csv"), `﻿${lines.join("\r\n")}\r\n`);

// ---- summary ----
const ucs = [...new Set(rows.map((r) => r.uc))];
const summary = ucs.map((uc) => {
  const own = rows.filter((r) => r.uc === uc);
  const steps = new Map();
  for (const r of own) { const seen = steps.get(r.step); steps.set(r.step, r.status === "FAIL" || seen === "FAIL" ? "FAIL" : r.status === "SKIP" || seen === "SKIP" ? "SKIP" : "PASS"); }
  const count = (status) => [...steps.values()].filter((value) => value === status).length;
  return { uc, name: UC_NAMES[uc] ?? own[0].uc_name, images: own.filter((r) => r.file).length, PASS: count("PASS"), FAIL: count("FAIL"), SKIP: count("SKIP") };
});

// ---- images: PNG 2x is far too heavy for 200 embeds ----
fs.mkdirSync(CACHE, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1038 } });
async function jpeg(file) {
  const out = path.join(CACHE, `${path.basename(file, ".png")}.jpg`);
  const source = path.join(SHOTS, file);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(source).mtimeMs) {
    await page.setContent(`<!doctype html><style>html,body{margin:0}img{display:block;width:1600px;height:1038px}</style><img src="data:image/png;base64,${fs.readFileSync(source).toString("base64")}">`);
    await page.locator("img").evaluate((img) => img.decode());
    await page.screenshot({ path: out, type: "jpeg", quality: 82 });
  }
  return fs.readFileSync(out);
}

// ---- document ----
const text = (value, options = {}) => new TextRun({ text: value, font: FONT, size: 32, ...options });
const para = (value, options = {}, run = {}) => new Paragraph({ spacing: { before: 0, after: 60 }, ...options, children: [text(value, run)] });
const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (children, width, shaded = false) => new TableCell({ width: { size: width, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.TOP, margins: { top: 60, bottom: 60, left: 80, right: 80 }, shading: shaded ? { type: ShadingType.CLEAR, fill: "E7E6E6" } : undefined, children });
const WIDTHS = [1000, 1800, 7026];
const IMAGE_WIDTH = 440; const IMAGE_HEIGHT = Math.round(440 * 1868 / 2880);
const clip = (note) => note.replace(/ \| expect[\s\S]*$/, "").replace(/expect\([\s\S]*$/, "").trim().slice(0, 300);

let figure = FIGURE_START;
const ucRows = [];
for (const item of summary) {
  const children = [];
  for (const row of rows.filter((r) => r.uc === item.uc)) {
    if (!row.file) {
      children.push(para(`${row.step} ${row.caption_th}: ไม่ได้ทดสอบ (SKIP) ${row.note}`, { spacing: { before: 60, after: 120 } }));
      continue;
    }
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 40 }, children: [new ImageRun({ type: "jpg", data: await jpeg(row.file), transformation: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }, altText: { title: row.step, description: row.caption_th, name: path.basename(row.file) } })] }));
    const verdict = row.kind !== "action" || row.status === "FAIL";
    children.push(para(`รูปที่ ${figure++} ${row.caption_th}`, { alignment: AlignmentType.CENTER, keepNext: verdict }));
    if (verdict) {
      children.push(para(`ผลการทดสอบ: ${row.status === "PASS" ? "ผ่าน" : "ไม่ผ่าน"}`, { alignment: AlignmentType.CENTER, keepNext: row.status === "FAIL" }, { bold: true, color: row.status === "PASS" ? "000000" : "C00000" }));
      if (row.status === "FAIL" && row.note) children.push(para(`หมายเหตุ: ${clip(row.note)}`, { alignment: AlignmentType.LEFT }));
    }
  }
  ucRows.push(new TableRow({ children: [cell([para(item.uc)], WIDTHS[0]), cell([para(item.name)], WIDTHS[1]), cell(children, WIDTHS[2])] }));
}
const header = new TableRow({ tableHeader: true, children: [["uc id", WIDTHS[0]], ["uc name", WIDTHS[1]], ["capture screen", WIDTHS[2]]].map(([label, width]) => cell([para(label, { alignment: AlignmentType.CENTER }, { bold: true })], width, true)) });

const SUMMARY_WIDTHS = [1000, 4426, 1100, 1100, 1100, 1100];
const total = (key) => summary.reduce((sum, item) => sum + item[key], 0);
const summaryRows = [
  new TableRow({ tableHeader: true, children: ["uc id", "uc name", "จำนวนภาพ", "ผ่าน", "ไม่ผ่าน", "ไม่ได้ทดสอบ"].map((label, i) => cell([para(label, { alignment: AlignmentType.CENTER }, { bold: true })], SUMMARY_WIDTHS[i], true)) }),
  ...summary.map((item) => new TableRow({ children: [item.uc, item.name, item.images, item.PASS, item.FAIL, item.SKIP].map((value, i) => cell([para(String(value), { alignment: i > 1 ? AlignmentType.CENTER : AlignmentType.LEFT })], SUMMARY_WIDTHS[i])) })),
  new TableRow({ children: ["รวม", "", total("images"), total("PASS"), total("FAIL"), total("SKIP")].map((value, i) => cell([para(String(value), { alignment: i > 1 ? AlignmentType.CENTER : AlignmentType.LEFT }, { bold: true })], SUMMARY_WIDTHS[i])) }),
];

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 32 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, bottom: 1080, left: 1039, right: 1039 } } },
    children: [
      para("การทดสอบโปรแกรมทำงานตาม UC description", { spacing: { after: 120 } }, { bold: true, size: 40 }),
      para("ทดสอบบนเครื่อง (Local) วันที่ 5 พฤศจิกายน 2569 ด้วย Frontend สาขา develop (40c2e4a) และ Backend สาขา feat/uc-audit-alignment (db8e61c) ตามคู่มือทดสอบ UC1–UC12 ชื่อ UC ใช้ตามเอกสาร Use Case Description"),
      para("สรุปผลนับรายขั้นตอนตามคู่มือ ขั้นตอนหนึ่งนับว่าไม่ผ่านเมื่อมีผลที่คาดหวังข้อใดข้อหนึ่งไม่ตรง", { spacing: { after: 120 } }),
      new Table({ width: { size: 9826, type: WidthType.DXA }, columnWidths: SUMMARY_WIDTHS, rows: summaryRows }),
      para("", { spacing: { after: 200 } }),
      new Table({ width: { size: 9826, type: WidthType.DXA }, columnWidths: WIDTHS, rows: [header, ...ucRows] }),
    ],
  }],
});
const out = path.join(HERE, "UC-test-report.docx");
fs.writeFileSync(out, await Packer.toBuffer(doc));
await browser.close();
console.log(`docx ${out} ${(fs.statSync(out).size / 1048576).toFixed(1)} MB · figures ${FIGURE_START}–${figure - 1}`);
console.table(summary.map(({ uc, images, PASS, FAIL, SKIP }) => ({ uc, images, PASS, FAIL, SKIP })));
