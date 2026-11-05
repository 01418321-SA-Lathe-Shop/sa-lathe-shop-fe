import { test, expect, type Page } from "@playwright/test";
import { asUser, fresh, menu, readState, ready, UC, type Session } from "./helpers/kit";
import { bangkokLocal, testPdf } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(420_000);

const ADMIN = "Admin (pim.admin)"; const WORKER = "Worker (anan.staff)";
let t: UC; let anan: Session; let pim: Session; let M1 = ""; let order = "";

const saveReceipt = (page: Page) => page.getByRole("button", { name: "บันทึกรับของ", exact: true });
const dialog = (page: Page) => page.getByRole("dialog").last();
const originalRow = (page: Page) => page.locator("li", { hasText: "เหลือรับ" }).filter({ hasNotText: "ของแทน" }).first();
const replacementRow = (page: Page) => page.locator("li", { hasText: "· ของแทน" }).first();
async function confirmReceipt(page: Page) {
  await saveReceipt(page).click();
  await dialog(page).getByRole("checkbox").check();
  await dialog(page).getByRole("button", { name: "ยืนยันรับของ" }).click();
  await page.getByRole("status").filter({ hasText: "บันทึกรับของแล้ว" }).waitFor();
}
const openOrder = (page: Page, root: string) => fresh(page, `${root}/receiving?layout=list&order=${order}`);

test.beforeAll(async ({ browser }) => {
  t = new UC(7, browser); t.reset();
  const state = readState();
  M1 = state.M1; order = state.O1;
  anan = await asUser(browser, "anan.staff");
  pim = await asUser(browser, "pim.admin");
});
test.afterAll(async () => { await anan?.ctx.close(); await pim?.ctx.close(); });

test("S01 N03 worker opens accepted order", async () => {
  const { page } = anan;
  await t.step("S01", page, WORKER, async () => {
    await menu(page, "รับเข้าวัตถุดิบ");
    const card = page.locator(`[id="receiving-card-${order}"]`);
    await t.A(page, "select-accepted-order", "กดเลือกใบสั่งซื้อที่ผู้ขายรับแล้วในเมนู “รับเข้าวัตถุดิบ”", { highlight: card, check: async () => { await expect(card).toBeVisible(); } });
    await card.click();
    await ready(page);
    const detail = page.locator("article").last();
    await t.R(page, "outstanding-no-price", "พนักงานเห็นจำนวนค้างรับ 20 แต่ไม่เห็นราคาหรือเครดิต", { highlight: page.locator("dl", { hasText: "คงเหลือ" }).last(), check: async () => {
      await expect(detail).toContainText("เหลือรับ 20");
      await expect(detail).not.toContainText("บาท");
      await expect(detail.locator("dt", { hasText: "เครดิต" })).toHaveCount(0);
    } });
  });
  await t.step("N03", page, WORKER, async () => {
    const payment = page.getByLabel(/สถานะการชำระเงินผู้ขาย/);
    const visible = await payment.count();
    await t.N(page, "worker-no-finance", visible ? "ฟอร์มรับของของ Worker แสดงช่อง “สถานะการชำระเงินผู้ขาย”" : "Worker ไม่เห็นปุ่มชำระเงินหรือข้อมูลการเงิน", {
      highlight: visible ? payment : undefined,
      note: visible ? "ไม่มีปุ่มบันทึกการจ่ายและไม่เห็นราคา แต่ Worker เห็นและเลือกสถานะการชำระเงินผู้ขายได้ (receiving-receipt.tsx)" : "",
      check: async () => {
        await expect(page.getByRole("button", { name: /บันทึกการจ่าย|ตั้งเครดิต/ })).toHaveCount(0);
        await expect(payment, "ต้องไม่มีข้อมูลการเงินสำหรับ Worker").toHaveCount(0, { timeout: 1_000 });
      },
    });
  });
});

test("S02 S03 N01 partial receipt and claim", async () => {
  const { page } = anan;
  await t.step("S02", page, WORKER, async () => {
    await originalRow(page).getByLabel(/ของดี/).fill("8");
    await originalRow(page).getByLabel(/เสียหาย/).fill("2");
    await t.A(page, "partial-receipt", "กรอกของดี 8 และเสียหาย 2 แล้วกดปุ่ม “บันทึกรับของ” และ “ยืนยันรับของ”", { highlight: saveReceipt(page) });
    await confirmReceipt(page);
    await t.R(page, "receipt-recorded", "ระบบบันทึกของดี 8 และเปิดรายการของเสียหาย 2", { n: 1, settle: false, highlight: page.getByText(/เสียหาย 2/).first(), check: async () => {
      await expect(page.locator("article").last()).toContainText("เคยรับของเสียหายรวม 2");
    } });
    await menu(page, "สต๊อกวัตถุดิบ");
    const row = page.locator("tr", { hasText: M1 });
    await t.R(page, "stock-good-only", "สต๊อกเพิ่มเฉพาะของดีจาก 30 เป็น 38", { n: 2, highlight: row, check: async () => { await expect(row.locator('td[data-label="คงเหลือ"]')).toContainText("38"); } });
  });
  await t.step("S03", page, WORKER, async () => {
    await openOrder(page, "/staff");
    await page.getByLabel("แจ้งผู้ขายอย่างไร").fill("[UCTEST] โทรแจ้งฝ่ายขาย ขอของแทน");
    const claim = page.getByRole("button", { name: "บันทึกว่าแจ้งผู้ขายแล้ว" });
    await t.A(page, "open-claim", "ที่หัวข้อของเสียหาย กรอกวิธีแจ้งผู้ขายแล้วกดปุ่ม “บันทึกว่าแจ้งผู้ขายแล้ว”", { n: 1, highlight: claim, note: "หน้าจอใช้คำว่า “ของเสียหาย” และ “แจ้งผู้ขาย” แทนคำว่า “เคลม” ตามคู่มือ" });
    await claim.click();
    await page.getByRole("status").filter({ hasText: "บันทึกการแจ้งผู้ขายแล้ว" }).waitFor();
    await ready(page);
    await replacementRow(page).getByLabel(/ของดี/).fill("2");
    await t.A(page, "receive-replacement", "เมื่อของแทนมาถึง กรอกจำนวนในรายการ “ของแทน” แล้วกดปุ่ม “บันทึกรับของ”", { n: 2, highlight: replacementRow(page) });
    await confirmReceipt(page);
    await ready(page);
    const claims = page.locator('section[aria-label="ของเสียหาย"]');
    await t.R(page, "claim-status-separate", "สถานะของเสียหายแสดงแยกจากการรับของ และระบุว่าไม่มีการคืนเงิน", { settle: false, highlight: claims, check: async () => {
      await expect(claims).toContainText("ไม่มีการคืนเงิน");
      await expect(claims).toContainText("ได้ของแทนแล้ว 2");
    } });
  });
  await t.step("N01", page, WORKER, async () => {
    const good = originalRow(page).getByLabel(/ของดี/);
    await good.fill("999");
    await t.N(page, "over-receipt-blocked", "กรอกของดี 999 ซึ่งเกินจำนวนค้างรับ ระบบแจ้งเตือนและกดปุ่ม “บันทึกรับของ” ไม่ได้", { highlight: originalRow(page), check: async () => {
      await expect(saveReceipt(page)).toBeDisabled();
    } });
    await good.fill("");
  });
});

test("S04 receive remaining", async () => {
  const { page } = anan;
  await t.step("S04", page, WORKER, async () => {
    await originalRow(page).getByLabel(/ของดี/).fill("10");
    await t.A(page, "receive-remaining", "กรอกของดีส่วนที่เหลือ 10 แล้วกดปุ่ม “บันทึกรับของ”", { highlight: saveReceipt(page) });
    await confirmReceipt(page);
    await ready(page);
    const done = page.getByText("รับของครบตามใบสั่งซื้อแล้ว");
    await t.R(page, "order-fully-received", "ใบสั่งซื้อรับของครบแล้ว", { settle: false, highlight: done, check: async () => { await expect(done).toBeVisible(); } });
  });
});

test("S05 N02 S06 admin finance", async () => {
  const { page } = pim;
  await t.step("S05", page, ADMIN, async () => {
    await openOrder(page, "/admin");
    const days = page.getByLabel(/เครดิตที่ตกลงกับผู้ขาย/);
    const set = page.getByRole("button", { name: "ตั้งเครดิต", exact: true });
    const emptyAtStart = await days.inputValue();
    const disabledAtStart = await set.isDisabled();
    await days.fill("30");
    await t.A(page, "enter-credit-days", "กรอกจำนวนวันเครดิต 30 วัน แล้วกดปุ่ม “ตั้งเครดิต” และ “ยืนยันตั้งเครดิต”", { highlight: set });
    await set.click();
    await dialog(page).getByRole("checkbox").check();
    await dialog(page).getByRole("button", { name: "ยืนยันตั้งเครดิต" }).click();
    await page.getByRole("status").filter({ hasText: "ตั้งเครดิตผู้ขายแล้ว" }).waitFor();
    await t.R(page, "credit-no-default", "ระบบไม่มีค่าเริ่มต้น ต้องกรอกเอง และบันทึกเครดิต 30 วัน", {
      settle: false, highlight: page.locator("dl div", { hasText: "เครดิต" }).first(),
      note: "ป้ายในฟอร์มระบุว่า “ไม่บังคับหากจ่ายทันที” จึงจ่ายได้โดยไม่ตั้งเครดิต ซึ่งคู่มือไม่ได้กล่าวถึง",
      check: async () => { expect(emptyAtStart).toBe(""); expect(disabledAtStart).toBe(true); await expect(page.locator("dl div", { hasText: "เครดิต" }).first()).toContainText("30 วัน"); },
    });
  });
  await t.step("N02", page, ADMIN, async () => {
    // paid_at has minute precision and may not precede the full-receipt time.
    await page.waitForTimeout(61_000);
    await page.getByLabel("วันเวลาที่จ่าย").fill(bangkokLocal(0));
    await page.getByRole("button", { name: "บันทึกการจ่าย", exact: true }).click();
    const problem = page.getByRole("alert").filter({ hasText: /หลักฐาน/ }).first();
    await t.N(page, "transfer-no-evidence-blocked", "เลือกจ่ายแบบโอนโดยไม่แนบหลักฐาน ระบบไม่ยอมและแจ้งให้แนบหลักฐาน", { highlight: problem, check: async () => {
      await expect(problem).toBeVisible();
      await expect(page.getByRole("dialog").filter({ hasText: "บันทึกการจ่ายผู้ขาย?" })).toHaveCount(0);
    } });
  });
  await t.step("S06", page, ADMIN, async () => {
    await page.locator('section[aria-label="จ่ายผู้ขาย"] input[type="file"]').setInputFiles(testPdf("UCTEST-supplier-transfer.pdf"));
    await page.getByRole("button", { name: "อัปโหลดหลักฐาน" }).click();
    await page.getByText("แนบแล้ว: UCTEST-supplier-transfer.pdf").waitFor({ timeout: 60_000 });
    const pay = page.getByRole("button", { name: "บันทึกการจ่าย", exact: true });
    await t.A(page, "pay-transfer-evidence", "เลือกวิธีโอนผ่านธนาคาร แนบหลักฐาน แล้วกดปุ่ม “บันทึกการจ่าย” เต็มจำนวน", { highlight: pay });
    await pay.click();
    await dialog(page).getByRole("checkbox").check();
    await dialog(page).getByRole("button", { name: "ยืนยันบันทึกการจ่าย" }).click();
    await page.getByRole("status").filter({ hasText: "บันทึกการจ่ายผู้ขายแล้ว" }).waitFor();
    const section = page.locator('section[aria-label="จ่ายผู้ขาย"]');
    await t.R(page, "supplier-paid", "สถานะการจ่ายผู้ขายเป็น “จ่ายแล้ว”", { settle: false, highlight: section, check: async () => {
      await expect(section).toContainText("จ่ายแล้ว");
      await expect(section.getByRole("button", { name: "ดาวน์โหลดหลักฐานการจ่าย" })).toBeVisible();
    } });
  });
});
