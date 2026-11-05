import { test, expect, type Page } from "@playwright/test";
import { asUser, menu, pageText, push, readState, ready, saveState, stamp, UC, type Session } from "./helpers/kit";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const ADMIN = "Admin (pim.admin)"; const WORKER = "Worker (anan.staff)";
const SUPPLIER = `[UCTEST] ผู้ขายเหล็ก ${stamp()}`;
let t: UC; let pim: Session; let M1 = ""; let pendingOrder = "";

const orderButton = (page: Page) => page.getByRole("button", { name: "สั่งซื้อวัตถุดิบ", exact: true });
const top = (page: Page) => page.getByRole("dialog").last();
async function fillOrder(page: Page, quantity: string, cost: string) {
  await orderButton(page).click();
  const drawer = page.getByRole("dialog").first();
  await drawer.getByRole("combobox", { name: /^ผู้ขาย/ }).selectOption({ label: SUPPLIER });
  await drawer.getByRole("searchbox").fill(M1);
  await drawer.getByRole("button", { name: "ค้นหา" }).click();
  await ready(page);
  await drawer.getByRole("button", { name: `เพิ่ม ${M1}` }).click();
  await drawer.getByLabel(/^จำนวน \(/).fill(quantity);
  await drawer.getByLabel(/^ราคาต่อ /).fill(cost);
  return drawer;
}
async function placeOrder(page: Page) {
  const drawer = page.getByRole("dialog").first();
  await drawer.getByRole("button", { name: "สั่งซื้อ", exact: true }).click();
  const confirm = top(page);
  await confirm.getByRole("checkbox").check();
  await confirm.getByRole("button", { name: "ยืนยันสั่งซื้อ" }).click();
  await page.getByRole("status").filter({ hasText: "สั่งซื้อแล้ว รอผู้ขายตอบ" }).waitFor();
  await ready(page);
}
async function openPending(page: Page) {
  const card = page.locator('a[id^="order-card-"]').first();
  await card.click();
  await ready(page);
  return new URL(page.url()).searchParams.get("order") ?? "";
}
async function answer(page: Page, label: string, reason?: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const confirm = top(page);
  if (reason) await confirm.getByLabel("เหตุผล").fill(reason);
  await confirm.getByRole("checkbox").check();
  await confirm.getByRole("button", { name: label, exact: true }).click();
  await ready(page);
}

test.beforeAll(async ({ browser }) => {
  t = new UC(6, browser); t.reset();
  M1 = readState().M1;
  pim = await asUser(browser, "pim.admin");
  saveState({ SUPPLIER });
});
test.afterAll(async () => { await pim?.ctx.close(); });

test("S01 supplier", async () => {
  const { page } = pim;
  await t.step("S01", page, ADMIN, async () => {
    await menu(page, "สั่งซื้อวัตถุดิบ");
    await page.getByRole("link", { name: "ผู้ขาย", exact: true }).click();
    await ready(page);
    await page.getByRole("button", { name: "เพิ่มผู้ขาย" }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByLabel("ชื่อผู้ขาย").fill(SUPPLIER);
    await drawer.getByLabel(/เบอร์โทร/).fill("021234567");
    await drawer.getByLabel(/อีเมล/).fill("supplier@example.com");
    const save = drawer.locator('button[type="submit"]');
    await t.A(page, "add-supplier", "กดปุ่ม “เพิ่มผู้ขาย” กรอกชื่อ เบอร์โทร และอีเมล แล้วกดปุ่ม “เพิ่มผู้ขาย”", { highlight: save });
    await save.click();
    const row = page.locator("li", { hasText: SUPPLIER }).first();
    await row.waitFor();
    await t.R(page, "supplier-saved", "ระบบบันทึกข้อมูลผู้ขายและแสดงในรายการ", { highlight: row, check: async () => { await expect(row).toContainText("เปิดใช้งาน"); } });
  });
});

test("S02 S03 order and acceptance", async () => {
  const { page } = pim;
  await t.step("S02", page, ADMIN, async () => {
    await page.getByRole("link", { name: "ใบสั่งซื้อ", exact: true }).click();
    await ready(page);
    const drawer = await fillOrder(page, "20", "90");
    await t.A(page, "create-order", "เลือกผู้ขายและวัตถุดิบ กรอกจำนวนและราคา แล้วกดปุ่ม “สั่งซื้อ” และ “ยืนยันสั่งซื้อ”", { highlight: drawer.getByRole("button", { name: "สั่งซื้อ", exact: true }) });
    await placeOrder(page);
    const orderId = await openPending(page);
    saveState({ O1: orderId });
    await t.R(page, "order-locked", "ระบบสร้างใบสั่งซื้อและแจ้งว่าแก้ไขรายการไม่ได้", { highlight: page.getByText("แก้ไม่ได้").first(), check: async () => {
      await expect(page.getByText("จำนวน ราคา ผู้ขาย และงานที่เกี่ยวข้องแก้ไม่ได้")).toBeVisible();
      await expect(page.locator('article input:not([type="hidden"])')).toHaveCount(0);
    } });
  });
  await t.step("S03", page, ADMIN, async () => {
    const accept = page.getByRole("button", { name: "ผู้ขายรับแล้ว", exact: true });
    await t.A(page, "supplier-accepted", "ติดต่อผู้ขายแล้วกดปุ่ม “ผู้ขายรับแล้ว”", { highlight: accept });
    await answer(page, "ผู้ขายรับแล้ว");
    const link = page.getByRole("link", { name: "ไปที่รับเข้าวัตถุดิบ" });
    await link.waitFor();
    await t.R(page, "accepted-link-receiving", "สถานะเป็นผู้ขายรับแล้ว และมีลิงก์ “ไปที่รับเข้าวัตถุดิบ”", { highlight: link, check: async () => { await expect(link).toBeVisible(); await expect(page.getByRole("button", { name: "ผู้ขายรับแล้ว", exact: true })).toHaveCount(0); } });
  });
});

test("S04 supplier rejects", async () => {
  const { page } = pim;
  await t.step("S04", page, ADMIN, async () => {
    await push(page, "/admin/orders");
    await fillOrder(page, "5", "90");
    await placeOrder(page);
    await openPending(page);
    const number = (await page.locator("article h2").first().innerText()).trim();
    const reject = page.getByRole("button", { name: "ผู้ขายปฏิเสธ", exact: true });
    await t.A(page, "supplier-rejected", "สร้างใบสั่งซื้ออีกใบแล้วกดปุ่ม “ผู้ขายปฏิเสธ” พร้อมกรอกเหตุผล", { highlight: reject });
    await answer(page, "ผู้ขายปฏิเสธ", "[UCTEST] ผู้ขายไม่มีของ");
    const banner = page.getByText("ผู้ขายปฏิเสธ: [UCTEST] ผู้ขายไม่มีของ");
    await banner.waitFor();
    await t.R(page, "rejected-no-receipt", "สถานะเป็นผู้ขายปฏิเสธ ใบสั่งซื้อถูกยกเลิก และไม่มีลิงก์รับของ", { n: 1, highlight: banner, check: async () => { await expect(page.getByRole("link", { name: "ไปที่รับเข้าวัตถุดิบ" })).toHaveCount(0); } });
    await menu(page, "รับเข้าวัตถุดิบ");
    await t.R(page, "rejected-not-in-receiving", "ใบสั่งซื้อที่ถูกปฏิเสธไม่ปรากฏในหน้ารับเข้าวัตถุดิบ", { n: 2, note: `ใบสั่งซื้อที่ตรวจ: ${number}`, check: async () => { expect(await pageText(page)).not.toContain(number); } });
  });
});

test("S05 stock unchanged", async () => {
  const { page } = pim;
  await t.step("S05", page, ADMIN, async () => {
    await menu(page, "สต๊อกวัตถุดิบ");
    const row = page.locator("tr", { hasText: M1 });
    await t.A(page, "check-materials", "กดเลือกเมนู “สต๊อกวัตถุดิบ” เพื่อตรวจยอดหลังสั่งซื้อ", { highlight: row });
    await t.R(page, "stock-unchanged", "ยอดคงเหลือ 30 และจองแล้ว 25 ยังไม่เปลี่ยนจากการสั่งซื้อ", { highlight: row, check: async () => {
      await expect(row.locator('td[data-label="คงเหลือ"]')).toContainText("30");
      await expect(row.locator('td[data-label="จองแล้ว"]')).toContainText("25");
    } });
  });
});

test("N01 worker cannot manage orders", async ({ browser }) => {
  const { page } = pim;
  await push(page, "/admin/orders");
  await fillOrder(page, "1", "90");
  await placeOrder(page);
  pendingOrder = await openPending(page);
  saveState({ O3: pendingOrder });
  const anan = await asUser(browser, "anan.staff");
  await t.step("N01", anan.page, WORKER, async () => {
    await menu(anan.page, "สั่งซื้อวัตถุดิบ");
    const create = orderButton(anan.page);
    await t.N(anan.page, "worker-no-create-order", await create.count() ? "Worker เปิดเมนู “สั่งซื้อวัตถุดิบ” แล้วยังเห็นปุ่ม “สั่งซื้อวัตถุดิบ” ซึ่งคู่มือกำหนดว่าต้องไม่มี" : "Worker ไม่มีปุ่มสร้างใบสั่งซื้อ", {
      n: 1, highlight: await create.count() ? create : undefined,
      check: async () => { await expect(create, "ปุ่ม “สั่งซื้อวัตถุดิบ” ต้องไม่แสดงกับ Worker").toHaveCount(0, { timeout: 1_000 }); },
    });
    await push(anan.page, `/staff/orders?layout=list&tab=pending&order=${pendingOrder}`);
    const manage = anan.page.getByRole("button", { name: /ผู้ขายรับแล้ว|ผู้ขายปฏิเสธ|ยกเลิกใบสั่งซื้อ/ });
    await t.N(anan.page, "worker-no-manage-order", await manage.count() ? "Worker เปิดใบสั่งซื้อที่รอผู้ขายตอบ แล้วยังเห็นปุ่ม “ผู้ขายรับแล้ว” “ผู้ขายปฏิเสธ” และ “ยกเลิกใบสั่งซื้อ”" : "Worker ไม่มีปุ่มจัดการใบสั่งซื้อ", {
      n: 2, highlight: await manage.count() ? manage : undefined,
      check: async () => { await expect(manage, "ปุ่มจัดการใบสั่งซื้อต้องไม่แสดงกับ Worker").toHaveCount(0, { timeout: 1_000 }); },
    });
  });
  await anan.ctx.close();
});

test("N02 supplier has no account", async () => {
  const { page } = pim;
  await t.step("N02", page, ADMIN, async () => {
    await push(page, "/admin/orders?view=suppliers");
    await page.getByRole("button", { name: "เพิ่มผู้ขาย" }).click();
    const drawer = page.getByRole("dialog");
    await t.N(page, "supplier-has-no-account", "ฟอร์มผู้ขายมีเฉพาะชื่อ เบอร์โทร และอีเมล ไม่มีชื่อผู้ใช้หรือรหัสผ่าน ผู้ขายจึงไม่มีบัญชีเข้าใช้ระบบ", { highlight: drawer.locator("form"), check: async () => {
      await expect(drawer.locator('input[type="password"]')).toHaveCount(0);
      await expect(drawer.getByLabel(/ชื่อผู้ใช้|รหัสผ่าน/)).toHaveCount(0);
    } });
    await page.keyboard.press("Escape");
  });
});
