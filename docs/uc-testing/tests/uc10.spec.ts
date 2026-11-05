import { test, expect, type Page } from "@playwright/test";
import { asUser, menu, push, readState, ready, saveState, stamp, UC, type Session } from "./helpers/kit";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const ADMIN = "Admin (pim.admin)"; const WORKER = "Worker (anan.staff)";
const run = stamp();
const RENAMED = `UCTEST-กิโลกรัม-${run}`; const SUB = `UCTEST-เส้น-${run}`;
let t: UC; let pim: Session; let M1 = ""; let UNIT = "";

const dialog = (page: Page) => page.getByRole("dialog").last();
async function catalog(page: Page) {
  await push(page, "/admin/materials?view=catalog");
  await ready(page);
}
const conversions = (page: Page) => push(page, "/admin/materials?view=conversions");
const factorInput = (scope: import("@playwright/test").Locator | Page) => scope.getByLabel(/^② 1 /);
async function openEdit(page: Page) {
  await page.locator(`summary[aria-label="ตัวเลือกสำหรับ ${SUB}"]`).click();
  await page.getByRole("button", { name: "แก้ไขค่าแปลง" }).click();
  await dialog(page).waitFor();
}

test.beforeAll(async ({ browser }) => {
  t = new UC(10, browser); t.reset();
  const state = readState();
  M1 = state.M1; UNIT = state.UNIT;
  pim = await asUser(browser, "pim.admin");
});
test.afterAll(async () => { await pim?.ctx.close(); });

test("S01 rename unit", async () => {
  const { page } = pim;
  await t.step("S01", page, ADMIN, async () => {
    await catalog(page);
    await page.getByRole("button", { name: new RegExp(`แก้ไข\\s*${UNIT}`) }).click();
    const drawer = dialog(page);
    await drawer.getByLabel("ชื่อหน่วย").fill(RENAMED);
    const save = drawer.locator('button[type="submit"]');
    await t.A(page, "rename-unit", "กดปุ่ม “แก้ไข” ของหน่วย กรอกชื่อใหม่ แล้วกดปุ่ม “บันทึก”", { highlight: save });
    await save.click();
    await page.getByRole("status").filter({ hasText: "แก้ไขชื่อหน่วยแล้ว" }).waitFor();
    saveState({ UNIT: RENAMED });
    await menu(page, "สต๊อกวัตถุดิบ");
    const row = page.locator("tr", { hasText: M1 });
    await t.R(page, "unit-name-everywhere", "ชื่อหน่วยใหม่แสดงในรายการสต๊อกวัตถุดิบที่ใช้หน่วยนี้", { highlight: row, check: async () => {
      await expect(row).toContainText(RENAMED);
      await expect(page.locator("body")).not.toContainText(UNIT);
    } });
  });
});

test("S02 conversion", async () => {
  const { page } = pim;
  await t.step("S02", page, ADMIN, async () => {
    await catalog(page);
    await page.getByLabel(/ชื่อหน่วยใหม่/).fill(SUB);
    await page.getByRole("button", { name: "เพิ่มหน่วย" }).click();
    await expect(page.locator("ul li", { hasText: SUB }).first()).toBeVisible();
    await conversions(page);
    await page.getByRole("combobox", { name: /^วัตถุดิบ/ }).selectOption({ label: M1 });
    await ready(page);
    await page.getByLabel(/① หน่วยอื่นที่จะให้กรอกได้/).selectOption({ label: SUB });
    await factorInput(page).first().fill("12.5");
    const add = page.getByRole("button", { name: "เพิ่มการแปลง" });
    await t.A(page, "add-conversion", "เลือกวัตถุดิบและหน่วยย่อย กรอกอัตรา 12.5 แล้วกดปุ่ม “เพิ่มการแปลง”", { n: 1, highlight: add });
    await add.click();
    const list = page.locator('section[aria-label="รายการการแปลงหน่วย"]');
    await expect(list).toContainText(SUB);
    await ready(page);
    await openEdit(page);
    await factorInput(dialog(page)).fill("10");
    const save = dialog(page).locator('button[type="submit"]');
    await t.A(page, "edit-conversion", "กดเมนูแก้ไขค่าแปลง กรอกอัตราใหม่ 10 แล้วกดปุ่ม “บันทึก”", { n: 2, highlight: save });
    await save.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await ready(page);
    await t.R(page, "conversion-saved", "ระบบบันทึกอัตราใหม่ 10 ในรายการการแปลงหน่วย", { highlight: list, check: async () => { await expect(list).toContainText("10"); await expect(list).not.toContainText("12.5"); } });
  });
});

test("N01 invalid rate", async () => {
  const { page } = pim;
  await t.step("N01", page, ADMIN, async () => {
    await openEdit(page);
    const box = dialog(page);
    await factorInput(box).fill("-1");
    await box.locator('button[type="submit"]').click();
    const negative = await box.getByRole("alert").first().isVisible().catch(() => false);
    await factorInput(box).fill("0");
    await box.locator('button[type="submit"]').click();
    const alert = box.getByRole("alert").first();
    await t.N(page, "zero-negative-rate-blocked", "กรอกอัตราแปลงเป็น 0 หรือติดลบแล้วกดปุ่ม “บันทึก” ระบบไม่ยอมและแจ้งข้อผิดพลาด", { highlight: alert, check: async () => {
      expect(negative).toBe(true);
      await expect(alert).toBeVisible();
      await expect(box).toBeVisible();
    } });
    await page.keyboard.press("Escape");
  });
});

test("S03 worker uses sub unit", async ({ browser }) => {
  const anan = await asUser(browser, "anan.staff");
  const { page } = anan;
  await t.step("S03", page, WORKER, async () => {
    await push(page, `/staff/production?view=list&job=${readState().J2}`);
    await page.getByRole("button", { name: "แก้ไขแผนวัตถุดิบ" }).click();
    await page.getByLabel("หน่วยที่กรอก").selectOption({ label: `${SUB} (1 ${SUB} = 10 ${RENAMED})` });
    await page.getByLabel(/ต้องใช้ ·/).fill("2");
    const hint = page.getByText(`= 20 ${RENAMED}`);
    await t.A(page, "use-sub-unit-plan", "ในแผนวัตถุดิบ เลือกหน่วยย่อยและกรอก 2 ระบบแสดงค่าเทียบเป็นหน่วยหลัก แล้วกดปุ่ม “บันทึกแผนและจองวัตถุดิบ”", { highlight: hint });
    await page.getByRole("button", { name: "บันทึกแผนและจองวัตถุดิบ" }).click();
    await page.getByText("ต้องใช้ 20").waitFor();
    await t.R(page, "converted-to-base", "ระบบแปลงเป็นหน่วยหลักตามอัตรา 2 × 10 = 20 และบันทึกค่าที่กรอกไว้", { highlight: page.getByText("ต้องใช้ 20"), check: async () => {
      await expect(page.getByText(new RegExp(`กรอก 2 ${SUB}`))).toBeVisible();
    } });
  });
  await t.step("N02", page, WORKER, async () => {
    await push(page, "/staff/materials?view=catalog");
    await t.N(page, "worker-cannot-edit-units", "Worker เปิดมุมมองข้อมูลหลักไม่ได้ เห็นเฉพาะรายการสต๊อก จึงแก้หน่วยไม่ได้", { check: async () => {
      await expect(page.getByRole("link", { name: "ข้อมูลหลัก (หน่วย/วัตถุดิบ)" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "เพิ่มหน่วย" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^แก้ไข/ })).toHaveCount(0);
    } });
  });
  await anan.ctx.close();
});

test("S04 ordering and receiving use base unit", async () => {
  const { page } = pim;
  await t.step("S04", page, ADMIN, async () => {
    await menu(page, "สั่งซื้อวัตถุดิบ");
    await page.getByRole("button", { name: "สั่งซื้อวัตถุดิบ", exact: true }).click();
    const drawer = page.getByRole("dialog").first();
    await drawer.getByRole("searchbox").fill(M1);
    await drawer.getByRole("button", { name: "ค้นหา" }).click();
    await ready(page);
    await drawer.getByRole("button", { name: `เพิ่ม ${M1}` }).click();
    const quantity = drawer.getByLabel(/^จำนวน \(/);
    await t.A(page, "open-order-receiving", "เปิดฟอร์มสั่งซื้อ ช่องจำนวนใช้หน่วยหลักเท่านั้น ไม่มีตัวเลือกหน่วยย่อย", { highlight: quantity, check: async () => {
      await expect(drawer.getByLabel(new RegExp(`^จำนวน \\(${RENAMED}\\)`))).toBeVisible();
      await expect(drawer.getByLabel("หน่วยที่กรอก")).toHaveCount(0);
    } });
    await page.keyboard.press("Escape");
    await push(page, `/admin/orders?layout=list&tab=pending&order=${readState().O3}`);
    await page.getByRole("button", { name: "ผู้ขายรับแล้ว", exact: true }).click();
    const confirm = dialog(page);
    await confirm.getByRole("checkbox").check();
    await confirm.getByRole("button", { name: "ผู้ขายรับแล้ว", exact: true }).click();
    await page.getByRole("link", { name: "ไปที่รับเข้าวัตถุดิบ" }).waitFor();
    await push(page, `/admin/receiving?layout=list&order=${readState().O3}`);
    const good = page.getByLabel(/^ของดี \(/);
    await t.R(page, "base-unit-only", "ฟอร์มรับเข้าวัตถุดิบใช้ได้เฉพาะหน่วยหลัก", { highlight: good, check: async () => {
      await expect(good).toBeVisible();
      await expect(page.getByLabel("หน่วยที่กรอก")).toHaveCount(0);
    } });
  });
  // S01 expects the new name everywhere it is used; this order line was placed before the rename.
  await t.step("S01", page, ADMIN, async () => {
    const label = page.getByLabel(/^ของดี \(/);
    const shown = (await page.locator("li", { hasText: "เหลือรับ" }).first().innerText()).replace(/\s+/g, " ").slice(0, 120);
    await t.R(page, "unit-name-on-open-order", "ฟอร์มรับของของใบสั่งซื้อที่สร้างก่อนเปลี่ยนชื่อหน่วย ยังแสดงชื่อหน่วยเดิม", { n: 2, highlight: label, note: `ข้อความบนหน้าจอ: ${shown}`, check: async () => {
      await expect(page.getByLabel(new RegExp(`^ของดี \\(${RENAMED}\\)`)), "ต้องแสดงชื่อหน่วยใหม่").toBeVisible({ timeout: 1_000 });
    } });
  });
});
