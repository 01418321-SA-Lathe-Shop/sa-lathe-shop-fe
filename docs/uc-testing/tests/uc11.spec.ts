import { test, expect, type Page } from "@playwright/test";
import { asPassword, asUser, blank, menu, menuLink, passwordLogin, ready, stamp, UC, type Session } from "./helpers/kit";
import { randomPassword } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const ADMIN = "Admin (pim.admin)";
const run = stamp();
const worker = { username: `uctest.worker.${run}`, name: `[UCTEST] พนักงานใหม่ ${run}`, password: randomPassword(), employee: `UCT-${run}`.toUpperCase() };
let t: UC; let pim: Session;

const dialog = (page: Page) => page.getByRole("dialog").last();
async function fillWorker(page: Page, values: { username: string; name: string; employee: string; email: string; phone: string; password: string }) {
  await page.getByRole("button", { name: "เพิ่มพนักงาน" }).click();
  const box = dialog(page);
  await box.getByLabel("ชื่อ-นามสกุล").fill(values.name);
  await box.getByLabel(/^ชื่อผู้ใช้/).fill(values.username);
  await box.getByLabel("รหัสพนักงาน").fill(values.employee);
  await box.getByLabel("อีเมล").fill(values.email);
  await box.getByLabel("เบอร์โทร").fill(values.phone);
  await box.getByLabel("รหัสผ่าน", { exact: false }).first().fill(values.password);
  await box.getByLabel("ยืนยันรหัสผ่าน").fill(values.password);
  return box;
}
const submit = (box: import("@playwright/test").Locator) => box.getByRole("button", { name: "เพิ่มพนักงาน" });
const closeDrawer = (page: Page) => page.keyboard.press("Escape");

test.beforeAll(async ({ browser }) => {
  t = new UC(11, browser); t.reset();
  pim = await asUser(browser, "pim.admin");
  await menu(pim.page, "จัดการพนักงาน");
});
test.afterAll(async () => { await pim?.ctx.close(); });

test("N01 N02 validation", async () => {
  const { page } = pim;
  await t.step("N01", page, ADMIN, async () => {
    const box = await fillWorker(page, { ...worker, username: `uctest.nocontact.${run}`, employee: `N1-${run}`.toUpperCase(), email: "", phone: "" });
    let posted = 0;
    const count = (request: import("@playwright/test").Request) => { if (request.method() === "POST" && request.url().endsWith("/admin/workers")) posted++; };
    page.on("request", count);
    await submit(box).click();
    await page.waitForTimeout(1_000);
    page.off("request", count);
    const field = box.getByLabel("อีเมล");
    await t.N(page, "missing-contact-blocked", "กดปุ่ม “เพิ่มพนักงาน” โดยไม่กรอกอีเมลและเบอร์โทร ระบบแจ้งเตือนและไม่สร้างบัญชี", { highlight: field, check: async () => {
      expect(posted).toBe(0);
      await expect(box).toBeVisible();
    } });
    await closeDrawer(page);
  });
  await t.step("N02", page, ADMIN, async () => {
    const box = await fillWorker(page, { ...worker, username: "anan.staff", employee: `N2-${run}`.toUpperCase(), email: `dup.${run}@example.com`, phone: "0899990001" });
    await submit(box).click();
    await ready(page);
    const alert = box.getByRole("alert").first();
    await t.N(page, "duplicate-username-error", "กรอกชื่อผู้ใช้ที่มีอยู่แล้ว ระบบแสดงข้อผิดพลาดและไม่สร้างบัญชีซ้ำ", { highlight: alert, check: async () => { await expect(alert).toBeVisible(); await expect(box).toBeVisible(); } });
    await closeDrawer(page);
  });
});

test("S01 S02 create and edit", async () => {
  const { page } = pim;
  await t.step("S01", page, ADMIN, async () => {
    const box = await fillWorker(page, { ...worker, email: `${worker.username}@example.com`, phone: "0812345601" });
    await t.A(page, "create-worker", "กดปุ่ม “เพิ่มพนักงาน” กรอกข้อมูล ข้อมูลติดต่อ และรหัสผ่านเริ่มต้น แล้วกดปุ่ม “เพิ่มพนักงาน”", { highlight: submit(box) });
    await submit(box).click();
    await page.getByRole("status").filter({ hasText: /เพิ่มพนักงาน/ }).first().waitFor();
    await ready(page);
    const row = page.locator("tr, li", { hasText: worker.username }).first();
    await t.R(page, "worker-in-list", "พนักงานใหม่ปรากฏในรายการ", { highlight: row, check: async () => { await expect(row).toContainText(worker.name); } });
  });
  await t.step("S02", page, ADMIN, async () => {
    const row = page.locator("tr, li", { hasText: worker.username }).first();
    await row.locator("summary").click();
    await row.getByRole("button", { name: "แก้ไขข้อมูลและสถานะ" }).click();
    await ready(page);
    const box = dialog(page);
    const newMail = `new.${worker.username}@example.com`;
    await box.getByLabel("อีเมล").fill(newMail);
    await box.getByLabel("เบอร์โทร").fill("0812345602");
    const save = box.getByRole("button", { name: "บันทึก", exact: true });
    await t.A(page, "edit-worker-contact", "กดเมนู “แก้ไขข้อมูลและสถานะ” แก้อีเมลและเบอร์โทร แล้วกดปุ่ม “บันทึก”", { highlight: save });
    await save.click();
    await page.getByRole("status").filter({ hasText: "บันทึกข้อมูลพนักงานแล้ว" }).waitFor();
    await ready(page);
    const after = page.locator("tr, li", { hasText: worker.username }).first();
    await t.R(page, "contact-saved", "ระบบบันทึกข้อมูลติดต่อใหม่", { highlight: after, check: async () => { await expect(after).toContainText(newMail); } });
  });
});

test("S03 new worker logs in", async ({ browser }) => {
  const session = await blank(browser);
  const { page } = session;
  await t.step("S03", page, "Worker ใหม่", async () => {
    await page.goto("/login");
    await page.locator('input[name="username"]').fill(worker.username);
    await page.locator('input[name="password"]').fill(worker.password);
    await t.A(page, "new-worker-login", "กรอกชื่อผู้ใช้และรหัสผ่านของบัญชีใหม่ที่หน้าเข้าสู่ระบบ แล้วกดปุ่ม “เข้าสู่ระบบ”", { highlight: page.locator("button.login-submit") });
    await passwordLogin(page, worker.username, worker.password);
    await expect(page).toHaveURL(/\/staff/, { timeout: 60_000 });
    await t.R(page, "staff-menu-only", "เข้าสู่ /staff ได้และเห็นเฉพาะเมนูพนักงาน", { check: async () => {
      await expect(page).toHaveURL(/\/staff/);
      await expect(menuLink(page, "งานผลิต")).toBeVisible();
      await expect(page.locator("nav a:visible, aside a:visible").filter({ hasText: "จัดการพนักงาน" })).toHaveCount(0);
    } });
  });
  await session.ctx.close();
  void asPassword;
});

test("N03 worker denied", async ({ browser }) => {
  const anan = await asUser(browser, "anan.staff");
  const { page } = anan;
  await t.step("N03", page, "Worker (anan.staff)", async () => {
    await page.evaluate(() => (window as any).next.router.push("/admin/workers"));
    await page.waitForURL(/\/staff/, { timeout: 30_000 }).catch(() => {});
    await ready(page);
    await t.N(page, "worker-denied-admin-workers", "Worker เปิด /admin/workers ไม่ได้ ระบบพากลับพื้นที่พนักงาน", { check: async () => {
      await expect(page).toHaveURL(/\/staff/);
      await expect(page.getByRole("button", { name: "เพิ่มพนักงาน" })).toHaveCount(0);
    } });
  });
  await anan.ctx.close();
});
