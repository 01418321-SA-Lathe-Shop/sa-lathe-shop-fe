import { test, expect, type Page } from "@playwright/test";
import { asUser, blank, menu, menuLink, passwordLogin, push, ready, stamp, UC, type Session } from "./helpers/kit";
import { randomPassword } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const SUPER = "Super Admin (pim.admin)"; const REGULAR = "Admin ใหม่";
const run = stamp();
const admin = { username: `uctest.admin.${run}`, name: `[UCTEST] ผู้ดูแลใหม่ ${run}`, password: randomPassword() };
let t: UC; let pim: Session;

const panel = (page: Page) => page.locator('section[aria-label="ผู้ดูแลระบบ"]');
const adminRow = (page: Page) => panel(page).locator("tr", { hasText: admin.username });
const dialog = (page: Page) => page.getByRole("dialog").last();
async function setActive(page: Page, label: "ปิดใช้งาน" | "เปิดใช้งาน") {
  await dialog(page).getByRole("button", { name: `ยืนยัน${label}` }).click();
  await page.getByRole("status").filter({ hasText: `${label} ` }).first().waitFor();
  await ready(page);
}
async function tryLogin(session: Session) {
  await session.ctx.clearCookies();
  await passwordLogin(session.page, admin.username, admin.password);
  await ready(session.page);
}

test.beforeAll(async ({ browser }) => {
  t = new UC(12, browser); t.reset();
  pim = await asUser(browser, "pim.admin");
});
test.afterAll(async () => { await pim?.ctx.close(); });

test("S01 S02 N01 N02 super admin panel", async () => {
  const { page } = pim;
  await t.step("S01", page, SUPER, async () => {
    await t.A(page, "open-workers", "กดเลือกเมนู “จัดการพนักงาน”", { highlight: menuLink(page, "จัดการพนักงาน") });
    await menu(page, "จัดการพนักงาน");
    await t.R(page, "admin-panel-visible", "ระบบแสดงแผง “ผู้ดูแลระบบ” พร้อมรายชื่อ Admin", { highlight: panel(page), check: async () => {
      await expect(panel(page)).toContainText("ผู้ดูแลระบบ (Admin)");
      await expect(panel(page).locator("tr", { hasText: "pim.admin" })).toContainText("Super Admin");
    } });
  });
  await t.step("S02", page, SUPER, async () => {
    await page.getByRole("button", { name: "เพิ่มผู้ดูแลระบบ" }).click();
    const box = dialog(page);
    await box.getByLabel("ชื่อ-นามสกุล").fill(admin.name);
    await box.getByLabel(/^ชื่อผู้ใช้/).fill(admin.username);
    await box.getByLabel("อีเมล").fill(`${admin.username}@example.com`);
    await box.getByLabel("เบอร์โทร").fill("0812345603");
    await box.getByLabel("รหัสผ่าน", { exact: false }).first().fill(admin.password);
    await box.getByLabel("ยืนยันรหัสผ่าน").fill(admin.password);
    const save = box.getByRole("button", { name: "เพิ่มผู้ดูแลระบบ" });
    await t.A(page, "create-admin", "กรอกชื่อ ชื่อผู้ใช้ อีเมล เบอร์โทร และรหัสผ่านเริ่มต้น แล้วกดปุ่ม “เพิ่มผู้ดูแลระบบ”", { highlight: save });
    await save.click();
    await adminRow(page).waitFor();
    await t.R(page, "new-admin-regular", "Admin ใหม่ปรากฏในรายการเป็น Admin ทั่วไป", { highlight: adminRow(page), check: async () => {
      await expect(adminRow(page)).toContainText("Admin");
      await expect(adminRow(page)).not.toContainText("Super Admin");
      await expect(adminRow(page)).toContainText("ใช้งานอยู่");
    } });
  });
  await t.step("N01", page, SUPER, async () => {
    await t.N(page, "no-promote-button", "ไม่มีปุ่มเลื่อนขั้นเป็น Super Admin มีเฉพาะปุ่มปิดใช้งาน", { highlight: adminRow(page), check: async () => {
      await expect(adminRow(page).getByRole("button")).toHaveText(["ปิดใช้งาน"]);
      await expect(panel(page).getByRole("button", { name: /เลื่อน|Super/ })).toHaveCount(0);
    } });
  });
  await t.step("N02", page, SUPER, async () => {
    const row = panel(page).locator("tr", { hasText: "pim.admin" });
    await t.N(page, "cannot-deactivate-super-admin", "แถวของ Super Admin ไม่มีปุ่มปิดใช้งาน จึงปิดใช้งานไม่ได้", { highlight: row, check: async () => { await expect(row.getByRole("button")).toHaveCount(0); } });
  });
});

test("S03 N03 new admin", async ({ browser }) => {
  const session = await blank(browser);
  const { page } = session;
  await t.step("S03", page, REGULAR, async () => {
    await page.goto("/login");
    await page.locator('input[name="username"]').fill(admin.username);
    await page.locator('input[name="password"]').fill(admin.password);
    await t.A(page, "new-admin-login", "กรอกชื่อผู้ใช้และรหัสผ่านของ Admin ใหม่ แล้วกดปุ่ม “เข้าสู่ระบบ”", { highlight: page.locator("button.login-submit") });
    await passwordLogin(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin/, { timeout: 60_000 });
    await ready(page);
    await menu(page, "จัดการพนักงาน");
    await t.R(page, "no-admin-panel", "เข้า /admin ได้ แต่ไม่เห็นแผง “ผู้ดูแลระบบ”", { check: async () => {
      await expect(page).toHaveURL(/\/admin\/workers/);
      await expect(panel(page)).toHaveCount(0);
    } });
  });
  await t.step("N03", page, REGULAR, async () => {
    await push(page, "/admin/workers?panel=admins");
    await t.N(page, "regular-admin-no-panel", "Admin ทั่วไปเปิด URL ของแผงผู้ดูแลระบบแล้วไม่เห็นและทำรายการไม่ได้", { check: async () => {
      await expect(panel(page)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "เพิ่มผู้ดูแลระบบ" })).toHaveCount(0);
    } });
  });
  await session.ctx.close();
});

test("S04 S05 deactivate and reactivate", async ({ browser }) => {
  const { page } = pim;
  const candidate = await blank(browser);
  await t.step("S04", page, SUPER, async () => {
    const button = adminRow(page).getByRole("button", { name: "ปิดใช้งาน" });
    await t.A(page, "deactivate-admin", "กดปุ่ม “ปิดใช้งาน” ของ Admin ใหม่ แล้วกดปุ่ม “ยืนยันปิดใช้งาน”", { highlight: button });
    await button.click();
    await setActive(page, "ปิดใช้งาน");
    await tryLogin(candidate);
    await t.R(candidate.page, "deactivated-login-refused", "Admin ที่ถูกปิดใช้งานเข้าสู่ระบบไม่ได้ ระบบแสดงข้อความแจ้งให้เข้าสู่ระบบใหม่", { note: "ข้อความเป็นภาษาอังกฤษว่า session หมดอายุหรือถูกเพิกถอน ไม่ได้บอกว่าบัญชีถูกปิดใช้งาน", check: async () => {
      await expect(candidate.page).toHaveURL(/\/login/);
      await expect(candidate.page.getByRole("alert").first()).toBeVisible();
    } });
  });
  await t.step("S05", page, SUPER, async () => {
    const button = adminRow(page).getByRole("button", { name: "เปิดใช้งาน" });
    await t.A(page, "reactivate-admin", "กดปุ่ม “เปิดใช้งาน” แล้วกดปุ่ม “ยืนยันเปิดใช้งาน”", { highlight: button });
    await button.click();
    await setActive(page, "เปิดใช้งาน");
    await tryLogin(candidate);
    await t.R(candidate.page, "reactivated-login-ok", "Admin นั้นเข้าสู่ระบบได้ตามปกติ", { check: async () => { await expect(candidate.page).toHaveURL(/\/admin/, { timeout: 60_000 }); } });
  });
  await candidate.ctx.close();
});
