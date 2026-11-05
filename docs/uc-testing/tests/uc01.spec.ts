import { test, expect, type Browser, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { asUser, blank, menu, pageText, passwordLogin, push, ready, saveState, stamp, TMP, UC, type Session } from "./helpers/kit";
import { bangkokLocal, fillDetails, nextButton, openWizard, randomPassword, requestIdOf, taxId, testPdf } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

const run = stamp();
const ind = { username: `uctest.ind.${run}`, password: randomPassword(), name: "[UCTEST] ลูกค้าบุคคลทั่วไป" };
const own = { username: `uctest.own.${run}`, password: randomPassword(), name: "[UCTEST] เจ้าของบริษัท", company: `[UCTEST] บริษัททดสอบ ${run} จำกัด` };
const mem = { username: `uctest.mem.${run}`, password: randomPassword(), name: "[UCTEST] สมาชิกบริษัท" };
const R1 = `[UCTEST] R1 เพลากลึง ${run}`;

let t: UC; let reg: Session; let somchai: Session;
let invitation = ""; let requestId = "";

async function accountStep(page: Page, who: { username: string; password: string }) {
  await page.locator('input[name="phone"]').fill("0812345678");
  await page.locator('input[name="email"]').fill(`${who.username}@example.com`);
  await page.locator('input[name="username"]').fill(who.username);
  await page.locator('input[name="password"]').fill(who.password);
}
async function addressStep(page: Page, contact: string) {
  await page.locator('input[name="contact_name"]').fill(contact);
  await page.locator('input[name="address_line1"]').fill("[UCTEST] 99/1 ถนนงามวงศ์วาน");
  await page.locator('input[name="district"]').fill("จตุจักร");
  await page.locator('input[name="province"]').fill("กรุงเทพมหานคร");
  await page.locator('input[name="postal_code"]').fill("10900");
  await page.locator('textarea[name="address"]').fill("[UCTEST] 99/1 ถนนงามวงศ์วาน จตุจักร กรุงเทพมหานคร 10900");
}
const submit = (page: Page) => page.locator("button.login-submit");

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  t = new UC(1, browser); t.reset();
  reg = await blank(browser);
  somchai = await asUser(browser, "somchai");
});
test.afterAll(async () => { await reg?.ctx.close(); await somchai?.ctx.close(); });

/** Submits the form and reports what the API really answered; the password is never read back. */
async function submitRegistration(page: Page) {
  const response = page.waitForResponse((r) => r.url().endsWith("/auth/register") && r.request().method() === "POST", { timeout: 30_000 });
  await submit(page).click();
  const answer = await response;
  const body = answer.request().postDataJSON() ?? {};
  const sent = Object.keys(body).filter((key) => key !== "password");
  await ready(page);
  return { ok: answer.ok(), note: answer.ok() ? "" : `POST /auth/register ตอบ HTTP ${answer.status()} "invalid input": ฟอร์มไม่มีช่องชื่อ จึงส่ง name=${JSON.stringify(body.name)} ${"contact_name" in body ? " และส่งฟิลด์ contact_name ที่ Backend ไม่รู้จัก" : ""} (ฟิลด์ที่ส่ง: ${sent.join(", ")}) · FE develop 7b81ac9 กับ BE db8e61c ไม่ตรงกัน` };
}
const FAILED_CAPTION = "ระบบแสดงข้อความ “invalid input” และสมัครบัญชีไม่สำเร็จ";

test("S01 register individual", async () => {
  const { page } = reg;
  await t.step("S01", page, "ลูกค้า (บุคคลทั่วไป)", async () => {
    await page.goto("/register");
    await accountStep(page, ind);
    await t.A(page, "register-individual-account", "กรอกชื่อผู้ใช้และรหัสผ่านอย่างน้อย 12 ตัวอักษร เลือกประเภทลูกค้า “บุคคลทั่วไป” แล้วกดปุ่ม “ถัดไป”", { n: 1, highlight: submit(page) });
    await submit(page).click();
    await addressStep(page, ind.name);
    await t.A(page, "register-individual-address", "กรอกชื่อผู้รับและที่อยู่ให้ครบแล้วกดปุ่ม “สมัครบัญชี”", { n: 2, highlight: submit(page) });
    const result = await submitRegistration(page);
    await t.R(page, "register-individual-result", result.ok ? "ระบบสร้างบัญชีสำเร็จและพากลับไปหน้าเข้าสู่ระบบ" : FAILED_CAPTION, { note: result.note, highlight: result.ok ? undefined : page.getByRole("alert").first(), check: async () => { expect(result.ok).toBe(true); await expect(page).toHaveURL(/\/login/); } });
    if (!result.ok) return;
    await passwordLogin(page, ind.username, ind.password);
    await expect(page).toHaveURL(/\/customer/, { timeout: 60_000 });
    await t.R(page, "individual-customer-home", "เข้าสู่ระบบลูกค้าด้วยบัญชีที่สมัครใหม่ได้", { n: 2, check: async () => { await expect(page.locator("body")).toContainText(ind.name); } });
  });
});

test("S02 register company", async () => {
  const { page } = reg;
  await t.step("S02", page, "ลูกค้า (เจ้าของบริษัท)", async () => {
    await page.goto("/register");
    await accountStep(page, own);
    await page.locator("label", { hasText: "ประเภทลูกค้า" }).locator("select").selectOption("company");
    await page.locator('input[name="company_name"]').fill(own.company);
    await page.locator('input[name="tax_id"]').fill(taxId());
    await t.A(page, "register-company-fill-form", "เลือกประเภท “บริษัท” และ “สร้างบริษัทใหม่” กรอกชื่อบริษัทและเลขผู้เสียภาษี 13 หลัก แล้วกดปุ่ม “ถัดไป”", { n: 1, highlight: submit(page) });
    await submit(page).click();
    await addressStep(page, own.name);
    await t.A(page, "register-company-address", "กรอกชื่อผู้รับและที่อยู่บริษัทแล้วกดปุ่ม “สมัครบัญชี”", { n: 2, highlight: submit(page) });
    const result = await submitRegistration(page);
    await t.R(page, "register-company-result", result.ok ? "ระบบสร้างบัญชีเจ้าของบริษัทสำเร็จ" : FAILED_CAPTION, { note: result.note, highlight: result.ok ? undefined : page.getByRole("alert").first(), check: async () => { expect(result.ok).toBe(true); await expect(page).toHaveURL(/\/login/); } });
    if (!result.ok) return;
    await passwordLogin(page, own.username, own.password);
    await expect(page).toHaveURL(/\/customer/, { timeout: 60_000 });
    await ready(page);
    await menu(page, "บัญชีและบริษัท");
    await t.R(page, "company-owner-memberships", "ระบบแสดงข้อมูลบริษัทและสิทธิ์ “เจ้าของบริษัท” ในหน้าบัญชีและบริษัท", { n: 2, check: async () => { await expect(page.locator("body")).toContainText(own.company); await expect(page.locator("body")).toContainText("เจ้าของบริษัท"); } });
  });
});

test("S03 register by invitation", async ({ browser }) => {
  // The seed owner issues the invitation, so this step doesn't depend on S02. The code is one-time and never photographed.
  const nida = await asUser(browser, "nida.company");
  await menu(nida.page, "บัญชีและบริษัท");
  await nida.page.getByRole("link", { name: /สร้างคำเชิญส่วนตัว/ }).first().click();
  await ready(nida.page);
  await nida.page.getByRole("button", { name: "สร้างคำเชิญ", exact: true }).click();
  invitation = (await nida.page.locator(".cust-secret output").innerText()).trim();
  await nida.ctx.close();
  const { page } = reg;
  await t.step("S03", page, "ผู้สมัครที่ได้รับเชิญ", async () => {
    await page.goto("/register");
    await accountStep(page, mem);
    await page.locator("label", { hasText: "ประเภทลูกค้า" }).locator("select").selectOption("company");
    await page.locator("label", { hasText: "การเข้าร่วมบริษัท" }).locator("select").selectOption("join");
    await page.locator('input[name="invitation"]').fill(invitation);
    await t.A(page, "register-invite-fill-form", "เลือก “เข้าร่วมด้วยคำเชิญ” กรอกคำเชิญส่วนตัวโดยไม่ต้องกรอกที่อยู่ แล้วกดปุ่ม “สมัครบัญชี”", { highlight: submit(page), check: async () => {
      await expect(page.locator('textarea[name="address"]')).toHaveCount(0);
      await expect(submit(page)).toContainText("สมัครบัญชี");
    } });
    const result = await submitRegistration(page);
    await t.R(page, "invite-result", result.ok ? "ระบบสร้างบัญชีและเข้าร่วมบริษัทสำเร็จ" : FAILED_CAPTION, { note: result.note, highlight: result.ok ? undefined : page.getByRole("alert").first(), check: async () => { expect(result.ok).toBe(true); await expect(page).toHaveURL(/\/login/); } });
    if (!result.ok) return;
    await passwordLogin(page, mem.username, mem.password);
    await expect(page).toHaveURL(/\/customer/, { timeout: 60_000 });
    await ready(page);
    await menu(page, "บัญชีและบริษัท");
    await t.R(page, "invite-joined-company", "ระบบเข้าร่วมบริษัทในสิทธิ์ “สมาชิกบริษัท” และใช้ที่อยู่ของบริษัทที่เข้าร่วม", { n: 2, check: async () => { await expect(page.locator("body")).toContainText("สมาชิกบริษัท"); } });
  });
});

test("S04-S07 somchai submits request", async () => {
  const { page } = somchai;
  await t.step("S04", page, "ลูกค้า (somchai)", async () => {
    await menu(page, "คำขอผลิต");
    const add = page.getByRole("link", { name: "ส่งคำขอผลิตใหม่" });
    await t.A(page, "open-new-request", "กดเลือกที่เมนู “คำขอผลิต” แล้วกดปุ่ม “ส่งคำขอผลิตใหม่”", { highlight: add });
    await add.click();
    await t.R(page, "request-form-shown", "ระบบแสดงฟอร์มคำขอผลิต ขั้นที่ 1 ผู้สั่ง", { check: async () => { await expect(page.getByRole("heading", { name: /ขั้นที่ 1/ })).toBeVisible(); } });
  });
  await t.step("S05", page, "ลูกค้า (somchai)", async () => {
    await nextButton(page).click();
    await fillDetails(page, { description: R1 });
    await t.A(page, "fill-request-form", "กรอกรายละเอียดงาน จำนวน ข้อกำหนดวัตถุดิบ และวันที่ต้องการรับงาน แล้วกดปุ่ม “ถัดไป”", { highlight: nextButton(page) });
    await nextButton(page).click();
    await t.R(page, "request-form-valid", "ฟอร์มผ่านการตรวจสอบและไปยังขั้นไฟล์แนบ", {
      note: "คู่มือระบุสเปกวัสดุและวันที่ต้องการเป็น “ไม่บังคับ” แต่ฟอร์มจริงบังคับกรอกทั้งสองช่อง",
      check: async () => { await expect(page.getByRole("heading", { name: /ขั้นที่ 3/ })).toBeVisible(); },
    });
  });
  await t.step("S06", page, "ลูกค้า (somchai)", async () => {
    await page.locator('input[type="file"]').setInputFiles(testPdf());
    await t.A(page, "upload-drawing-file", "แนบไฟล์แบบขนาดไม่เกิน 100 MB ระบบแสดงไฟล์ในสถานะ “รอส่ง”", { highlight: page.locator(".cust-file-list li"), check: async () => { await expect(page.locator(".cust-file-list")).toContainText("UCTEST-drawing.pdf"); } });
  });
  await t.step("S07", page, "ลูกค้า (somchai)", async () => {
    await nextButton(page).click();
    const send = page.getByRole("button", { name: "ส่งคำขอผลิต", exact: true });
    await t.A(page, "submit-request", "ตรวจทานข้อมูลแล้วกดปุ่ม “ส่งคำขอผลิต”", { highlight: send });
    await send.click();
    await expect(page).toHaveURL(/created=1/, { timeout: 60_000 });
    requestId = requestIdOf(page);
    saveState({ run, R1: { id: requestId, description: R1 } });
  });
  await t.step("S06", page, "ลูกค้า (somchai)", async () => {
    await t.R(page, "file-status-ready", "ระบบแสดงไฟล์แนบว่า “ตรวจไฟล์แล้ว” ซึ่งเป็นการตรวจทางเทคนิคแยกจากสถานะคำขอ", {
      note: "ข้อความจริงคือ “ตรวจไฟล์แล้ว” ไม่ใช่คำว่า “พร้อม” ตามคู่มือ ความหมายตรงกัน",
      check: async () => { await expect(page.locator(".cust-file-row")).toContainText("UCTEST-drawing.pdf"); await expect(page.locator(".cust-file-row")).toContainText("ตรวจไฟล์แล้ว"); },
    });
  });
  await t.step("S07", page, "ลูกค้า (somchai)", async () => {
    await menu(page, "คำขอผลิต");
    await t.R(page, "request-in-list", "คำขอปรากฏในรายการพร้อมสถานะจากเซิร์ฟเวอร์", { highlight: page.getByRole("link", { name: new RegExp(R1.replace(/[[\]]/g, "\\$&")) }), check: async () => { await expect(page.locator("body")).toContainText(R1); } });
  });
});

test("S08 worker sees request and file", async ({ browser }) => {
  const anan = await asUser(browser, "anan.staff");
  const { page } = anan;
  await t.step("S08", page, "Worker (anan.staff)", async () => {
    await push(page, "/staff/requests");
    const card = page.locator(`#request-card-${requestId}`);
    await t.A(page, "open-staff-requests", "เปิดหน้าคำขอของพนักงานแล้วกดเลือกคำขอที่ลูกค้าเพิ่งสร้าง", { highlight: card, check: async () => { await expect(card).toBeVisible(); } });
    await card.click();
    await ready(page);
    const open = page.getByRole("button", { name: "เปิดไฟล์" });
    const download = page.waitForEvent("download", { timeout: 20_000 });
    await open.click();
    const file = await download;
    await t.R(page, "staff-sees-request-file", "พนักงานเห็นรายละเอียดคำขอและเปิดไฟล์แนบได้", { highlight: open, check: async () => { expect(file.suggestedFilename()).toContain("UCTEST-drawing"); await expect(page.locator("body")).toContainText(R1); } });
  });
  await anan.ctx.close();
});

test("N01 N02 quantity and date", async () => {
  const { page } = somchai;
  await t.step("N01", page, "ลูกค้า (somchai)", async () => {
    await openWizard(page);
    await nextButton(page).click();
    await fillDetails(page, { description: "[UCTEST] ทดสอบจำนวนผิด", qty: "0" });
    const qty = page.getByLabel("จำนวน *");
    await nextButton(page).click();
    const zeroBlocked = await qty.evaluate((el: HTMLInputElement) => !el.validity.valid);
    await qty.fill("-1");
    await nextButton(page).click();
    await t.N(page, "quantity-zero-rejected", "กรอกจำนวน 0 หรือติดลบแล้วกดปุ่ม “ถัดไป” ระบบไม่ยอมให้ไปขั้นถัดไป", {
      highlight: qty,
      note: "ข้อความเตือนมาจากเบราว์เซอร์ ยืนยันด้วย validity ของช่องและหน้ายังอยู่ขั้นเดิม",
      check: async () => {
        expect(zeroBlocked).toBe(true);
        expect(await qty.evaluate((el: HTMLInputElement) => !el.validity.valid)).toBe(true);
        await expect(page.getByRole("heading", { name: /ขั้นที่ 2/ })).toBeVisible();
      },
    });
  });
  await t.step("N02", page, "ลูกค้า (somchai)", async () => {
    await page.getByLabel("จำนวน *").fill("1");
    const deadline = page.getByLabel("วันที่ต้องการรับงาน *");
    await deadline.fill(bangkokLocal(-2));
    await nextButton(page).click();
    await t.N(page, "past-date-rejected", "เลือกวันที่ต้องการเป็นวันในอดีต ระบบแสดงข้อความว่าต้องเป็นวันและเวลาในอนาคต", {
      highlight: page.getByRole("alert").first(),
      check: async () => { await expect(page.getByRole("alert").first()).toContainText("ต้องเป็นวันและเวลาในอนาคต"); },
    });
  });
});

test("N03 oversize, bad type, upload failure", async () => {
  const { page } = somchai;
  await t.step("N03", page, "ลูกค้า (somchai)", async () => {
    await page.getByLabel("วันที่ต้องการรับงาน *").fill(bangkokLocal(30));
    await nextButton(page).click();
    const big = path.join(TMP, "UCTEST-oversize.pdf");
    fs.mkdirSync(TMP, { recursive: true });
    const handle = fs.openSync(big, "w"); fs.ftruncateSync(handle, 100_000_001); fs.closeSync(handle);
    await page.locator('input[type="file"]').setInputFiles(big);
    fs.rmSync(big, { force: true });
    const message = page.getByRole("alert").first();
    await t.N(page, "oversize-file-rejected", "แนบไฟล์ขนาด 100,000,001 ไบต์ ระบบไม่รับไฟล์และแจ้งขนาดที่อนุญาต", {
      n: 1, highlight: message,
      note: "ปฏิเสธตั้งแต่ตอนเลือกไฟล์ จึงเลือกไฟล์ใหม่ได้เลย และไม่มีปุ่ม “อัปโหลดอีกครั้ง” ในกรณีนี้ (ปุ่มอยู่ในกรณี N03-3)",
      check: async () => { await expect(message).toContainText("100 MB"); await expect(page.locator(".cust-file-list")).toHaveCount(0); },
    });
    const exe = path.join(TMP, "UCTEST-bad.exe");
    fs.writeFileSync(exe, "not allowed");
    await page.locator('input[type="file"]').setInputFiles(exe);
    fs.rmSync(exe, { force: true });
    await t.N(page, "bad-extension-rejected", "แนบไฟล์นามสกุล .exe ระบบไม่รับไฟล์และแจ้งประเภทไฟล์ที่รองรับ", {
      n: 2, highlight: message,
      check: async () => { await expect(message).toContainText("ประเภทที่รองรับ"); await expect(page.locator(".cust-file-list")).toHaveCount(0); },
    });
    // Storage failure on an existing request: the real "upload again" path. Backend stays up.
    await push(page, `/customer/requests?request=${requestId}`);
    await page.locator("summary", { hasText: "แนบไฟล์เพิ่มเติม" }).click();
    const fail = (route: import("@playwright/test").Route) => route.request().method() === "PUT" && !route.request().url().includes(":8080") ? route.abort() : route.fallback();
    await page.route("**/*", fail);
    await page.locator('.cust-upload input[type="file"]').setInputFiles(testPdf("UCTEST-second.pdf"));
    await page.getByRole("button", { name: "อัปโหลดและตรวจไฟล์" }).click();
    const again = page.getByRole("button", { name: "อัปโหลดอีกครั้ง" });
    await again.waitFor({ timeout: 30_000 });
    await page.unroute("**/*", fail);
    await t.N(page, "upload-failed-upload-again", "เมื่ออัปโหลดไม่สำเร็จ ระบบแสดงปุ่ม “อัปโหลดอีกครั้ง” ซึ่งเริ่มอัปโหลดใหม่ ไม่ลองซ้ำเอง", {
      n: 3, highlight: again,
      check: async () => { await expect(again).toBeVisible(); await expect(page.locator(".cust-upload")).toContainText("ไม่ใช้ upload intent ที่ล้มเหลว"); },
    });
  });
});

test("N04 short password", async () => {
  const session = reg;
  const { page } = session;
  await t.step("N04", page, "ผู้สมัคร", async () => {
    await page.goto("/register");
    await accountStep(page, { username: `uctest.short.${run}`, password: "short123" });
    await submit(page).click();
    const password = page.locator('input[name="password"]');
    await t.N(page, "short-password-rejected", "กรอกรหัสผ่านสั้นกว่า 12 ตัวอักษรแล้วกดปุ่ม “ถัดไป” ระบบไม่ยอมให้สมัครต่อ", {
      highlight: password,
      note: "ข้อความเตือนมาจากเบราว์เซอร์ ยืนยันด้วย validity ของช่องและหน้ายังอยู่ขั้นเดิม",
      check: async () => {
        expect(await password.evaluate((el: HTMLInputElement) => el.validationMessage)).not.toBe("");
        await expect(page.getByText("ขั้นที่ 1 จาก 2")).toBeVisible();
      },
    });
  });
});

test("N05 backend down", async () => {
  const { page } = somchai;
  await t.step("N05", page, "ลูกค้า (somchai)", async () => {
    await push(page, "/customer");
    await page.route("http://localhost:8080/**", (route) => route.abort());
    await menu(page, "คำขอผลิต");
    await page.getByRole("alert").first().waitFor({ timeout: 30_000 });
    await t.N(page, "backend-down-shows-error", "เมื่อเชื่อมต่อ backend ไม่ได้ ระบบแสดงข้อความผิดพลาดและไม่แสดงข้อมูลตัวอย่าง", {
      note: "จำลองด้วยการตัด request ไป API ในเบราว์เซอร์ ไม่ได้ปิด backend จริง",
      highlight: page.getByRole("alert").first(),
      check: async () => {
        await expect(page.getByRole("alert").first()).toBeVisible();
        const text = await pageText(page);
        expect(text).not.toContain("[UCTEST]");
      },
    });
    await page.unroute("http://localhost:8080/**");
  });
});
