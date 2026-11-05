import { test, expect } from "@playwright/test";
import { asUser, menu, menuLink, push, readState, ready, saveState, UC, type Session } from "./helpers/kit";
import { adminOpen, attachEvidence, bangkokLocal, confirmReview, staffOpen, testPdf, testPng } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const CUSTOMER = "ลูกค้า (somchai)"; const ADMIN = "Admin (pim.admin)";
let t: UC; let somchai: Session; let pim: Session; let id = ""; let description = "";

async function openDeposit(page: import("@playwright/test").Page, requestId: string) {
  await push(page, "/customer/deposit-po");
  await push(page, `/customer/deposit-po?request=${requestId}`);
  await page.getByText("เงื่อนไขที่ตอบรับ").first().waitFor();
  await ready(page);
}
async function fillDeposit(page: import("@playwright/test").Page, file: string) {
  await page.getByLabel("วันและเวลาที่โอน").fill(bangkokLocal(-0.1));
  await attachEvidence(page, file);
}

test.beforeAll(async ({ browser }) => {
  t = new UC(4, browser); t.reset();
  const state = readState();
  id = state.R2.id; description = state.R2.description;
  somchai = await asUser(browser, "somchai");
  pim = await asUser(browser, "pim.admin");
});
test.afterAll(async () => { await somchai?.ctx.close(); await pim?.ctx.close(); });

test("S01 S02 customer submits deposit evidence", async () => {
  const { page } = somchai;
  await t.step("S01", page, CUSTOMER, async () => {
    await t.A(page, "open-deposit-po", "กดเลือกเมนู “มัดจำและ PO”", { highlight: menuLink(page, "มัดจำและ PO") });
    await menu(page, "มัดจำและ PO");
    await page.locator(`a[href*="${id}"]`).first().click();
    await ready(page);
    await t.R(page, "required-evidence-due-date", "ระบบแสดงหลักฐานที่ต้องส่งและวันครบกำหนด (ตอบรับ + 14 วัน)", { highlight: page.locator(".cust-price-panel"), check: async () => {
      await expect(page.locator(".cust-price-panel")).toContainText("ส่งหลักฐานภายใน");
      await expect(page.locator(".cust-checklist")).toContainText("มัดจำขั้นต่ำ");
      await expect(page.locator(".cust-checklist")).toContainText("ยังไม่ส่ง");
    } });
  });
  await t.step("S02", page, CUSTOMER, async () => {
    await fillDeposit(page, testPng("UCTEST-deposit-slip-1.png"));
    const send = page.getByRole("button", { name: "ส่งหลักฐานมัดจำ" });
    await t.A(page, "upload-evidence", "กรอกจำนวนเงินและวันเวลาที่โอน แนบไฟล์หลักฐาน แล้วกดปุ่ม “ส่งหลักฐานมัดจำ”", { highlight: send });
    await send.click();
    const notice = page.getByText("ส่งหลักฐานแล้ว รอเจ้าหน้าที่ตรวจสอบ");
    await notice.waitFor();
    await t.R(page, "evidence-pending-review", "สถานะเป็น “รอตรวจสอบ” ซึ่งยังไม่ใช่การอนุมัติ", { highlight: notice, check: async () => {
      await expect(notice).toContainText("ยังไม่ใช่การอนุมัติ");
      await expect(page.locator(".cust-checklist")).toContainText("รอตรวจสอบ");
    } });
  });
});

test("S03 S04 admin rejects evidence", async () => {
  const { page } = pim;
  await t.step("S03", page, ADMIN, async () => {
    await t.A(page, "open-review-queue", "กดเลือกเมนู “คำขอและใบเสนอราคา” เพื่อดูรายการรอตรวจหลักฐาน", { highlight: menuLink(page, "คำขอและใบเสนอราคา") });
    await menu(page, "คำขอและใบเสนอราคา");
    const card = page.locator("article").filter({ hasText: description });
    await t.R(page, "evidence-in-queue", "ระบบแสดงหลักฐานที่รอตรวจในส่วน “รอคุณตรวจ”", { highlight: card, check: async () => {
      await expect(page.getByRole("heading", { name: /รอคุณตรวจ/ })).toBeVisible();
      await expect(card).toContainText("หลักฐานรอตรวจ");
    } });
    await card.getByRole("link", { name: "ตรวจหลักฐาน" }).click();
    await ready(page);
  });
  await t.step("S04", page, ADMIN, async () => {
    await page.getByRole("radio", { name: "ไม่อนุมัติ" }).check();
    await page.getByLabel("เหตุผลที่ไม่อนุมัติ").fill("[UCTEST] สลิปไม่ชัดเจน");
    await page.getByRole("checkbox").check();
    await t.A(page, "reject-with-reason", "เลือก “ไม่อนุมัติ” กรอกเหตุผล ทำเครื่องหมาย “ตรวจไฟล์แล้ว” แล้วกดปุ่ม “ยืนยันผลการตรวจ”", { highlight: confirmReview(page) });
    await confirmReview(page).click();
    await expect(page.getByText("ไม่อนุมัติหลักฐานแล้ว").first()).toBeVisible();
    const customer = somchai.page;
    await openDeposit(customer, id);
    await t.R(customer, "customer-must-reupload", "ลูกค้าเห็นสถานะ “ต้องแก้ไข” พร้อมเหตุผล และต้องอัปโหลดไฟล์ใหม่", { role: CUSTOMER, highlight: customer.getByText("เหตุผลที่ต้องแก้ไข"), check: async () => {
      await expect(customer.locator("body")).toContainText("เหตุผลที่ต้องแก้ไข: [UCTEST] สลิปไม่ชัดเจน");
      await expect(customer.locator(".cust-checklist")).toContainText("ต้องแก้ไขและส่งใหม่");
      await expect(customer.getByRole("button", { name: "ส่งหลักฐานมัดจำ" })).toBeDisabled();
    } });
  });
});

test("S05 S06 reupload, approve, job opens", async () => {
  const customer = somchai.page;
  await t.step("S05", customer, "ลูกค้า + Admin", async () => {
    await fillDeposit(customer, testPng("UCTEST-deposit-slip-2.png"));
    const send = customer.getByRole("button", { name: "ส่งหลักฐานมัดจำ" });
    await t.A(customer, "reupload-evidence", "ลูกค้าแนบไฟล์หลักฐานใหม่แล้วกดปุ่ม “ส่งหลักฐานมัดจำ”", { n: 1, highlight: send });
    await send.click();
    await customer.getByText("ส่งหลักฐานแล้ว รอเจ้าหน้าที่ตรวจสอบ").waitFor();
    const { page } = pim;
    await adminOpen(page, id);
    await page.getByRole("checkbox").check();
    await t.A(page, "approve-evidence", "Admin ตรวจไฟล์ เลือก “อนุมัติ” แล้วกดปุ่ม “ยืนยันผลการตรวจ”", { n: 2, role: ADMIN, highlight: confirmReview(page) });
    await confirmReview(page).click();
    const opened = page.getByRole("heading", { name: "เปิดงานผลิตแล้ว" });
    await opened.waitFor();
    await t.R(page, "job-queued-created", "ระบบเปิดงานผลิต 1 งาน", { role: ADMIN, highlight: opened, check: async () => {
      await expect(opened).toHaveCount(1);
      await expect(page.locator("body")).toContainText("ยอดคงเหลือของงาน");
    } });
  });
  await t.step("S06", customer, CUSTOMER, async () => {
    await t.A(customer, "open-customer-jobs", "กดเลือกเมนู “งานผลิต”", { highlight: menuLink(customer, "งานผลิต") });
    await menu(customer, "งานผลิต");
    await t.R(customer, "customer-sees-job", "ลูกค้าเห็นงานผลิตที่เพิ่งเปิด", { highlight: customer.getByText(description).first(), check: async () => {
      await expect(customer.locator("body")).toContainText(description);
    } });
  });
});

test("N01 overdue evidence", async () => {
  t.skip("N01", "ส่งหลักฐานหลังเลยกำหนด 14 วัน", "เจ้าของโครงงานเลือก SKIP (D2): ทดสอบต้องแก้ข้อมูลในฐานข้อมูลโดยตรงและข้ามการตรวจ FK ชั่วคราว", "ลูกค้า");
});

test("N02 double approve", async ({ browser }) => {
  const state = readState();
  const R3 = state.R3;
  const nida = await asUser(browser, "nida.company");
  const anan = await asUser(browser, "anan.staff");
  await t.step("N02", pim.page, "Worker + Admin", async () => {
    await openDeposit(nida.page, R3.id);
    await attachEvidence(nida.page, testPdf("UCTEST-company-po.pdf"));
    await nida.page.getByRole("button", { name: "ส่งใบสั่งซื้อ PO" }).click();
    await nida.page.getByText("ส่งหลักฐานแล้ว รอเจ้าหน้าที่ตรวจสอบ").waitFor();
    // Both reviewers hold the same pending evidence open before either confirms.
    await staffOpen(anan.page, R3.id);
    await adminOpen(pim.page, R3.id);
    await anan.page.getByRole("checkbox").check();
    await pim.page.getByRole("checkbox").check();
    await confirmReview(anan.page).click();
    await anan.page.getByRole("heading", { name: "เปิดงานผลิตแล้ว" }).waitFor();
    await confirmReview(pim.page).click();
    await ready(pim.page);
    const first = await pim.page.getByRole("alert").first().innerText().catch(() => "");
    await t.N(pim.page, "double-approve-refused", "Admin กดอนุมัติหลักฐานซ้ำหลังพนักงานอนุมัติแล้ว ระบบไม่บันทึกซ้ำและให้โหลดข้อมูลล่าสุด", {
      n: 1, highlight: pim.page.getByRole("alert").first(),
      note: `ข้อความจากระบบ: ${first.replace(/\s+/g, " ").slice(0, 160)}`,
      check: async () => { await expect(pim.page.getByRole("alert").first()).toBeVisible(); },
    });
    await menu(pim.page, "งานผลิต");
    await t.N(pim.page, "double-approve-one-job", "รายการงานผลิตมีงานของคำขอนี้เพียง 1 งาน", {
      n: 2, highlight: pim.page.getByText(R3.description).first(),
      check: async () => { await expect(pim.page.locator('a[id^="production-card-"]').filter({ hasText: R3.description })).toHaveCount(1); },
    });
    saveState({ R3: { ...R3, jobOpened: true } });
  });
  await nida.ctx.close(); await anan.ctx.close();
});
