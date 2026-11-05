import { test, expect } from "@playwright/test";
import { asUser, menu, menuLink, pageText, push, readState, ready, stamp, UC, type Session } from "./helpers/kit";
import { createRequest, fillQuote, sendQuoteButton, staffOpen } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const WORKER = "Worker (anan.staff)";
const run = stamp();
let t: UC; let anan: Session; let somchai: Session; let id = ""; let description = "";

test.beforeAll(async ({ browser }) => {
  t = new UC(2, browser); t.reset();
  const state = readState();
  id = state.R1.id; description = state.R1.description;
  anan = await asUser(browser, "anan.staff");
  somchai = await asUser(browser, "somchai");
});
test.afterAll(async () => { await anan?.ctx.close(); await somchai?.ctx.close(); });

test("S01-S03 worker drafts quotation", async () => {
  const { page } = anan;
  const money = () => page.getByLabel("ราคาเสนอลูกค้า");
  await t.step("S01", page, WORKER, async () => {
    await menu(page, "คำขอและใบเสนอราคา");
    const card = page.locator(`#request-card-${id}`);
    await t.A(page, "select-request", "กดเลือกคำขอในเมนู “คำขอและใบเสนอราคา”", { highlight: card, check: async () => { await expect(card).toBeVisible(); } });
    await card.click();
    await ready(page);
    await t.R(page, "request-detail-file", "ระบบแสดงรายละเอียดคำขอและไฟล์แนบ", { highlight: page.getByText("UCTEST-drawing.pdf"), check: async () => {
      await expect(page.locator("body")).toContainText(description);
      await expect(page.getByText("UCTEST-drawing.pdf")).toBeVisible();
    } });
  });
  await t.step("S02", page, WORKER, async () => {
    await fillQuote(page);
    const save = page.getByRole("button", { name: "บันทึกร่าง" });
    await t.A(page, "fill-draft-costs", "กรอกค่าวัตถุดิบ 1,000 บาท ค่าแรง 500 บาท และราคาเสนอ แล้วกดปุ่ม “บันทึกร่าง”", { highlight: save });
    await save.click();
    await expect(page.getByRole("button", { name: "บันทึกร่างแล้ว" })).toBeVisible();
    const minimum = page.getByRole("status").filter({ hasText: "ราคาขั้นต่ำ" }).first();
    await t.R(page, "draft-saved-min-price", "ระบบบันทึกร่างและแสดงราคาขั้นต่ำ 2,400.00 บาท ซึ่งเท่ากับ (1,000 + 500) × 1.6", { settle: false, highlight: minimum, check: async () => {
      await expect(minimum).toContainText("2,400");
      await expect(page.getByRole("button", { name: "บันทึกร่างแล้ว" })).toBeVisible();
    } });
  });
  await t.step("S03", page, WORKER, async () => {
    await money().fill("2399.99");
    await t.A(page, "enter-price-below-min", "กรอกราคาเสนอ 2,399.99 บาท ซึ่งต่ำกว่าราคาขั้นต่ำ แล้วกดปุ่ม “ส่งใบเสนอราคา”", { highlight: money() });
    await sendQuoteButton(page).click();
    const problem = page.getByRole("alert").filter({ hasText: "ต่ำกว่าราคาขั้นต่ำ" });
    await t.R(page, "below-min-rejected", "ระบบไม่ยอมรับและแสดงข้อความว่าราคาเสนอต่ำกว่าราคาขั้นต่ำ", { highlight: problem, check: async () => {
      await expect(problem).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } });
  });
});

test("S04 request more information", async () => {
  const { page } = anan;
  const message = `[UCTEST] ขอทราบค่าความคลาดเคลื่อน ${run}`;
  let accepted = false;
  await t.step("S04", page, WORKER, async () => {
    await page.locator("summary", { hasText: "ขอข้อมูลเพิ่มเติมจากลูกค้า" }).click();
    await page.getByLabel("รายละเอียดที่ต้องการให้ลูกค้าแจ้งเพิ่มเติม").fill(message);
    const send = page.getByRole("button", { name: "ส่งคำขอข้อมูลเพิ่มเติม" });
    await t.A(page, "request-more-info", "กรอกรายละเอียดที่ต้องการแล้วกดปุ่ม “ส่งคำขอข้อมูลเพิ่มเติม”", { highlight: send });
    const answer = page.waitForResponse((r) => r.url().endsWith("/request-info") && r.request().method() === "POST", { timeout: 30_000 });
    await send.click();
    const response = await answer;
    const keys = Object.keys(response.request().postDataJSON() ?? {}).join(", ");
    accepted = response.ok();
    const toast = page.getByRole("status").filter({ hasText: "บันทึกการขอข้อมูลเพิ่มเติมแล้ว" });
    const failure = page.getByRole("alert").filter({ hasText: /ไม่สำเร็จ|invalid/ }).first();
    if (!accepted) await failure.waitFor();
    await t.R(page, "info-request-status", accepted ? "ระบบบันทึกการขอข้อมูลเพิ่มเติม" : "ระบบแสดงข้อผิดพลาดและส่งคำขอข้อมูลเพิ่มเติมไม่สำเร็จ", {
      n: 1, settle: false, highlight: accepted ? toast : failure,
      note: accepted ? "" : `POST /requests/{id}/request-info ตอบ HTTP ${response.status()}: Frontend ส่งฟิลด์ ${keys} แต่ Backend รับฟิลด์ note และปฏิเสธฟิลด์ที่ไม่รู้จัก (internal/request/handler.go)`,
      check: async () => { expect(accepted).toBe(true); await expect(page.locator("article").first()).toContainText("รอข้อมูล", { timeout: 1_000 }); },
    });
  });
  if (!accepted) { t.skip("S04", "ลูกค้าเห็นข้อความขอข้อมูลเพิ่มเติม", "ทดสอบต่อไม่ได้ เพราะการส่งคำขอข้อมูลเพิ่มเติมล้มเหลวในขั้นก่อนหน้า (UC02-S04-R1)", "ลูกค้า (somchai)"); return; }
  await t.step("S04", somchai.page, "ลูกค้า (somchai)", async () => {
    const customer = somchai.page;
    await push(customer, "/customer/inbox");
    await t.R(customer, "customer-sees-info-request", "ลูกค้าเห็นการแจ้งเตือนว่าร้านขอข้อมูลเพิ่มเติม", { n: 2, check: async () => { await expect(customer.locator("body")).toContainText(message); } });
  });
});

test("S05 send quotation", async () => {
  const { page } = anan;
  await t.step("S05", page, WORKER, async () => {
    await page.getByLabel("ราคาเสนอลูกค้า").fill("2400.00");
    const send = sendQuoteButton(page);
    await t.A(page, "send-quotation", "กรอกราคาเสนอ 2,400.00 บาท แล้วกดปุ่ม “ส่งใบเสนอราคา”", { highlight: send });
    await send.click();
    await page.getByRole("dialog").getByRole("button", { name: "ส่งใบเสนอราคา" }).click();
    const sent = page.getByText("รอลูกค้าตัดสินใจ").first();
    await sent.waitFor();
    await t.R(page, "quotation-sent-no-vat", "สถานะเป็นส่งแล้ว รอลูกค้าตัดสินใจ ราคาแสดงเป็นบาทและไม่บวก VAT", { highlight: page.getByText("ราคาเสนอลูกค้า (ไม่มี VAT)"), check: async () => {
      await expect(page.locator("body")).toContainText("ราคาเสนอลูกค้า (ไม่มี VAT)");
      await expect(page.locator("body")).toContainText("2,400");
    } });
  });
});

test("S06 admin read only", async ({ browser }) => {
  const pim = await asUser(browser, "pim.admin");
  const { page } = pim;
  await t.step("S06", page, "Admin (pim.admin)", async () => {
    await t.A(page, "admin-open-requests", "กดเลือกเมนู “คำขอและใบเสนอราคา”", { highlight: menuLink(page, "คำขอและใบเสนอราคา") });
    await menu(page, "คำขอและใบเสนอราคา");
    await page.locator(`a[href*="${id}"]`).first().click();
    await ready(page);
    await t.R(page, "admin-read-only-costs", "Admin เห็นคำขอและต้นทุน แต่ไม่มีปุ่มแก้ไขหรือส่งใบเสนอราคา", { highlight: page.getByText("ต้นทุนรวม").first(), check: async () => {
      await expect(page.locator("body")).toContainText("ต้นทุนรวม");
      await expect(page.locator("body")).toContainText("ราคาขั้นต่ำ");
      await expect(page.getByRole("button", { name: /บันทึกร่าง|ส่งใบเสนอราคา/ })).toHaveCount(0);
      await expect(page.getByLabel("ค่าวัตถุดิบรวม")).toHaveCount(0);
    } });
  });
  await pim.ctx.close();
});

test("S07 customer sees sent quotation only", async () => {
  const { page } = somchai;
  await t.step("S07", page, "ลูกค้า (somchai)", async () => {
    await t.A(page, "customer-open-quotation", "กดเลือกเมนู “ใบเสนอราคา”", { highlight: menuLink(page, "ใบเสนอราคา") });
    const api = page.waitForResponse((r) => r.url().includes(`/requests/${id}/quotations`) && r.request().method() === "GET", { timeout: 30_000 });
    await menu(page, "ใบเสนอราคา");
    const body = await (await api).text();
    await page.locator(`a[href*="${id}"]`).first().click();
    await ready(page);
    await t.R(page, "customer-no-internal-costs", "ลูกค้าเห็นใบเสนอราคาที่ส่งแล้ว แต่ไม่เห็นต้นทุนวัสดุและค่าแรงภายใน", { check: async () => {
      expect(body).not.toContain("internal_costs");
      const text = await pageText(page);
      expect(text).toContain("2,400");
      expect(text).not.toContain("ต้นทุน");
      expect(text).not.toContain("ค่าแรงรวม");
    } });
  });
});

test("N01 refuse without reason", async () => {
  await t.step("N01", anan.page, WORKER, async () => {
    const R4 = `[UCTEST] R4 คำขอที่ร้านปฏิเสธ ${run}`;
    const rId = await createRequest(somchai.page, { description: R4 });
    const { page } = anan;
    await staffOpen(page, rId);
    await page.locator("summary", { hasText: "ปฏิเสธคำขอ" }).click();
    const refuse = page.locator("form").getByRole("button", { name: "ปฏิเสธคำขอ" });
    await refuse.click();
    const problem = page.getByText("กรอกเหตุผล 1–2,000 ตัวอักษร");
    await t.N(page, "reject-without-reason-blocked", "กดปุ่ม “ปฏิเสธคำขอ” โดยไม่กรอกเหตุผล ระบบไม่ยอมและแจ้งให้กรอกเหตุผล", { highlight: problem, check: async () => {
      await expect(problem).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } });
    await page.getByLabel("เหตุผล (ลูกค้าจะเห็นข้อความนี้)").fill("[UCTEST] ไม่สามารถผลิตได้");
    await refuse.click();
    await page.getByRole("dialog").getByRole("button", { name: "ปฏิเสธคำขอ" }).click();
    await expect(page.getByText("คำขอนี้ถูกยกเลิก")).toBeVisible();
  });
});

test("N02 concurrent edit", async ({ browser }) => {
  const kitti = await asUser(browser, "kittipong.staff");
  await t.step("N02", kitti.page, "Worker (kittipong.staff)", async () => {
    const rId = await createRequest(somchai.page, { description: `[UCTEST] R6 แก้ไขพร้อมกัน ${run}` });
    await staffOpen(anan.page, rId);
    await fillQuote(anan.page);
    await anan.page.getByRole("button", { name: "บันทึกร่าง" }).click();
    await expect(anan.page.getByRole("button", { name: "บันทึกร่างแล้ว" })).toBeVisible();
    await staffOpen(kitti.page, rId);
    await anan.page.getByLabel("ราคาเสนอลูกค้า").fill("2500.00");
    await anan.page.getByRole("button", { name: "บันทึกร่าง" }).click();
    await expect(anan.page.getByRole("button", { name: "บันทึกร่างแล้ว" })).toBeVisible();
    await kitti.page.getByLabel("ราคาเสนอลูกค้า").fill("2600.00");
    await kitti.page.getByRole("button", { name: "บันทึกร่าง" }).click();
    const conflict = kitti.page.getByText("มีคนแก้ไขใบเสนอราคานี้ไปแล้ว");
    await conflict.waitFor();
    await staffOpen(anan.page, rId);
    const stored = await anan.page.getByLabel("ราคาเสนอลูกค้า").inputValue();
    await t.N(kitti.page, "concurrent-edit-conflict", "บันทึกร่างเดียวกันจากสองบัญชี แท็บที่สองได้รับแจ้งว่ามีคนแก้ไขแล้วและให้โหลดข้อมูลล่าสุด โดยไม่เขียนทับ", { settle: false, highlight: conflict, check: async () => {
      await expect(conflict).toBeVisible();
      expect(Number(stored)).toBe(2500);
    } });
  });
  await kitti.ctx.close();
});
