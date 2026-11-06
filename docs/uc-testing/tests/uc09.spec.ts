import { test, expect, type Page } from "@playwright/test";
import { asUser, pageText, push, readState, ready, UC, type Session } from "./helpers/kit";
import { attachEvidence, bangkokLocal, testPng } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(420_000);

const ADMIN = "Admin (pim.admin)"; const WORKER = "Worker (anan.staff)"; const CUSTOMER = "ลูกค้า (somchai)";
let t: UC; let pim: Session; let anan: Session; let somchai: Session; let J1 = "";

const dialog = (page: Page) => page.getByRole("dialog").last();
const openAdmin = (page: Page) => push(page, `/admin/delivery-payment?job=${J1}`);
const openWorker = (page: Page) => push(page, `/staff/delivery-payment?job=${J1}`);
const reopen = async (page: Page, list: string, target: string) => { await push(page, list); await push(page, target); };
const openInspection = (page: Page) => reopen(page, "/customer", `/customer/delivery-payment?job=${J1}`);
const openInvoice = (page: Page) => reopen(page, "/customer", `/customer/payments?job=${J1}`);
async function confirm(page: Page, label: string) {
  const box = dialog(page);
  for (const check of await box.getByRole("checkbox").all()) await check.check();
  await box.getByRole("button", { name: label }).click();
}
async function ship(page: Page, receiver: string) {
  await page.getByLabel("ชื่อผู้รับ").fill(receiver);
  await page.getByRole("button", { name: "บันทึกส่งมอบ" }).click();
  await confirm(page, "ยืนยันส่งมอบ");
  await page.getByText("รอลูกค้าตรวจรับ").waitFor();
  await ready(page);
}
const balanceHero = (page: Page) => page.locator('section[aria-label="ยอดเงิน"]');
async function submitPayment(page: Page, amount: string, file: string) {
  await page.getByLabel(/จำนวนเงินงวดนี้/).fill(amount);
  await page.getByLabel(/วันและเวลาที่โอน/).fill(bangkokLocal(0));
  await attachEvidence(page, file);
}

test.beforeAll(async ({ browser }) => {
  t = new UC(9, browser); t.reset();
  J1 = readState().J1;
  pim = await asUser(browser, "pim.admin");
  anan = await asUser(browser, "anan.staff");
  somchai = await asUser(browser, "somchai");
});
test.afterAll(async () => { await pim?.ctx.close(); await anan?.ctx.close(); await somchai?.ctx.close(); });

test("S01 invoice", async () => {
  const { page } = pim;
  await t.step("S01", page, ADMIN, async () => {
    await openAdmin(page);
    await page.getByLabel(/เครดิต \(วัน/).fill("15");
    await page.getByRole("button", { name: "ตั้งเครดิต", exact: true }).click();
    await confirm(page, "ยืนยันตั้งเครดิต");
    const issue = page.getByRole("button", { name: "ออกใบแจ้งหนี้", exact: true });
    await issue.waitFor();
    await ready(page);
    await t.A(page, "set-invoice-terms", "ตั้งเครดิต 15 วันแล้วกดปุ่ม “ออกใบแจ้งหนี้”", { highlight: issue });
    await issue.click();
    await confirm(page, "ยืนยันออกใบแจ้งหนี้");
    await page.getByText("ออกใบแจ้งหนี้แล้ว").first().waitFor();
    await ready(page);
    await t.R(page, "invoice-in-baht", "ใบแจ้งหนี้แสดงยอดหลังหักมัดจำ 1,200.00 บาท และไม่มี VAT", { highlight: balanceHero(page), check: async () => {
      await expect(balanceHero(page)).toContainText("1,200.00 บาท");
      await expect(balanceHero(page)).toContainText("ไม่มี VAT");
    } });
  });
});

test("S02 delivery", async () => {
  const { page } = anan;
  await t.step("S02", page, WORKER, async () => {
    await openWorker(page);
    await page.getByLabel(/วิธีส่ง/).selectOption("self");
    await page.getByLabel("ชื่อผู้รับ").fill("[UCTEST] คุณสมชาย");
    const save = page.getByRole("button", { name: "บันทึกส่งมอบ" });
    await t.A(page, "record-delivery", "เลือกวิธีส่ง กรอกชื่อผู้รับ แล้วกดปุ่ม “บันทึกส่งมอบ” และ “ยืนยันส่งมอบ”", { highlight: save });
    await save.click();
    await confirm(page, "ยืนยันส่งมอบ");
    const wait = page.getByText("รอลูกค้าตรวจรับ");
    await wait.waitFor();
    await t.R(page, "delivered", "ระบบบันทึกการส่งมอบ สถานะเป็นรอลูกค้าตรวจรับ", { highlight: page.locator('section[aria-label="การส่งมอบ"]'), check: async () => {
      await expect(page.locator('section[aria-label="การส่งมอบ"]')).toContainText("[UCTEST] คุณสมชาย");
    } });
  });
});

test("S03 customer returns", async () => {
  const { page } = somchai;
  await t.step("S03", page, CUSTOMER, async () => {
    await openInspection(page);
    await page.getByRole("button", { name: "งานมีปัญหา? ส่งคืนเพื่อแก้ไข" }).click();
    await page.getByLabel("เหตุผลที่ต้องแก้ไข *").fill("[UCTEST] ขนาดไม่ตรงแบบ");
    await page.locator(".cust-checkbox input").check();
    const send = page.getByRole("button", { name: "ยืนยันส่งคืนเพื่อแก้ไข" });
    await t.A(page, "return-with-reason", "กดปุ่ม “งานมีปัญหา? ส่งคืนเพื่อแก้ไข” กรอกเหตุผล แล้วกดปุ่ม “ยืนยันส่งคืนเพื่อแก้ไข”", { highlight: send });
    await send.click();
    await page.getByText("ส่งคืนเพื่อแก้ไขแล้ว").first().waitFor();
    await ready(page);
    await t.R(page, "free-rework-invoice-same", "งานกลับไปแก้ไขฟรี และใบแจ้งหนี้ยังมียอดคงเหลือ 1,200.00 บาทเท่าเดิม", { check: async () => {
      await expect(page.locator("body")).toContainText("ส่งคืนเพื่อแก้ไขแล้ว");
      await expect(page.locator("body")).toContainText("1,200.00");
    } });
  });
});

test("S04 redeliver and accept", async () => {
  await t.step("S04", anan.page, "Worker + ลูกค้า", async () => {
    const { page } = anan;
    await push(page, `/staff/production?view=list&job=${J1}`);
    await page.getByRole("button", { name: "ปิดงาน", exact: true }).click();
    const box = dialog(page);
    for (const check of await box.getByRole("checkbox").all()) await check.check();
    await box.getByRole("button", { name: "ปิดงาน" }).click();
    await page.getByText("ผลิตเสร็จแล้ว").first().waitFor();
    await openWorker(page);
    await page.getByLabel("ชื่อผู้รับ").fill("[UCTEST] คุณสมชาย");
    await t.A(page, "redeliver", "หลังแก้ไขงานและปิดงานรอบแก้ไข พนักงานกรอกชื่อผู้รับแล้วกดปุ่ม “บันทึกส่งมอบ” อีกครั้ง", { n: 1, highlight: page.getByRole("button", { name: "บันทึกส่งมอบ" }) });
    await ship(page, "[UCTEST] คุณสมชาย");
    const customer = somchai.page;
    await openInspection(customer);
    await customer.locator(".cust-checkbox input").check();
    const accept = customer.getByRole("button", { name: "ยืนยันรับงาน" });
    await t.A(customer, "customer-accepts", "ลูกค้าทำเครื่องหมายว่าตรวจงานแล้วและกดปุ่ม “ยืนยันรับงาน”", { n: 2, role: CUSTOMER, highlight: accept });
    await accept.click();
    await customer.getByText("ยืนยันรับงานแล้ว").first().waitFor();
    await ready(customer);
    await t.R(customer, "latest-delivery-accepted", "การส่งมอบล่าสุดถูกตอบรับ และระบบแสดงประวัติส่งมอบทั้งสองรอบ", { role: CUSTOMER, check: async () => {
      await expect(customer.getByRole("heading", { name: "ยืนยันรับงานแล้ว" })).toBeVisible();
      await expect(customer.getByRole("heading", { name: "ประวัติส่งมอบ" })).toBeVisible();
    } });
  });
});

test("N03 no return after accept", async () => {
  const { page } = somchai;
  await t.step("N03", page, CUSTOMER, async () => {
    await t.N(page, "no-return-after-accept", "หลังตรวจรับแล้ว ไม่มีปุ่มส่งคืนเพื่อแก้ไข", { check: async () => {
      await expect(page.getByRole("button", { name: /ส่งคืนเพื่อแก้ไข/ })).toHaveCount(0);
    } });
  });
});

test("N01 S05 customer payment", async () => {
  const { page } = somchai;
  await t.step("N01", page, CUSTOMER, async () => {
    await openInvoice(page);
    const amount = page.getByLabel(/จำนวนเงินงวดนี้/);
    await amount.fill("99999");
    const send = page.getByRole("button", { name: "ส่งหลักฐานการชำระเงิน" });
    await t.N(page, "overpayment-blocked", "กรอกจำนวนเงินเกินยอดคงเหลือ ระบบแจ้งเตือนและกดปุ่มส่งหลักฐานไม่ได้", { highlight: amount, check: async () => {
      await expect(amount).toHaveAttribute("aria-invalid", "true");
      await expect(send).toBeDisabled();
    } });
  });
  await t.step("S05", page, CUSTOMER, async () => {
    await submitPayment(page, "500", testPng("UCTEST-payment-1.png"));
    const send = page.getByRole("button", { name: "ส่งหลักฐานการชำระเงิน" });
    await t.A(page, "partial-transfer-notice", "กรอกจำนวนเงิน 500 บาท วันเวลาโอน แนบหลักฐาน แล้วกดปุ่ม “ส่งหลักฐานการชำระเงิน”", { highlight: send });
    await send.click();
    await page.getByText("ส่งหลักฐานการชำระเงินแล้ว").first().waitFor();
    await ready(page);
    await t.R(page, "payment-pending", "สถานะการชำระเป็นรอตรวจ และยอดคงเหลือยังไม่ลด", { highlight: page.getByText(/มีหลักฐานรอตรวจ/), check: async () => {
      await expect(page.getByText(/มีหลักฐานรอตรวจ/)).toBeVisible();
      await expect(page.locator("#invoice-balance").locator("..")).toContainText("1,200.00");
    } });
  });
});

test("S06 review", async () => {
  const { page } = pim;
  await t.step("S06", page, ADMIN, async () => {
    await reopen(page, "/admin", `/admin/delivery-payment?job=${J1}`);
    const reject = page.getByRole("button", { name: "ไม่อนุมัติ", exact: true });
    await t.A(page, "reject-payment", "ตรวจหลักฐานแล้วกดปุ่ม “ไม่อนุมัติ” พร้อมกรอกเหตุผล", { n: 1, highlight: reject });
    await reject.click();
    await dialog(page).getByLabel(/เหตุผลที่ไม่ผ่าน/).fill("[UCTEST] ยอดในสลิปไม่ตรง");
    await confirm(page, "ยืนยันไม่อนุมัติ");
    await page.getByText("เหตุผลที่ไม่ผ่าน: [UCTEST] ยอดในสลิปไม่ตรง").waitFor();
    await openInvoice(somchai.page);
    await submitPayment(somchai.page, "500", testPng("UCTEST-payment-2.png"));
    await somchai.page.getByRole("button", { name: "ส่งหลักฐานการชำระเงิน" }).click();
    await somchai.page.getByText("ส่งหลักฐานการชำระเงินแล้ว").first().waitFor();
    await reopen(page, "/admin", `/admin/delivery-payment?job=${J1}`);
    const approve = page.getByRole("button", { name: "อนุมัติ", exact: true });
    await t.A(page, "approve-payment", "เมื่อลูกค้าส่งหลักฐานใหม่ กดปุ่ม “อนุมัติ”", { n: 2, highlight: approve });
    await approve.click();
    await confirm(page, "ยืนยันอนุมัติ");
    await page.getByText("อนุมัติการชำระแล้ว").first().waitFor();
    await ready(page);
    await t.R(page, "balance-reduced", "ยอดคงเหลือลดตามจำนวนที่อนุมัติ เหลือ 700.00 บาท", { highlight: balanceHero(page), check: async () => { await expect(balanceHero(page)).toContainText("700.00 บาท"); } });
  });
});

test("N02 worker handles payments", async () => {
  const { page } = anan;
  await t.step("N02", page, WORKER, async () => {
    await reopen(page, "/staff", `/staff/delivery-payment?job=${J1}`);
    const proof = page.getByRole("button", { name: "เปิดหลักฐาน" }).first();
    await t.N(page, "worker-sees-payment-data", "Worker เห็นหลักฐานการชำระของลูกค้า มีปุ่ม “บันทึกรับเงินสด” และการส่งมอบไม่มีช่องค่าส่ง", { highlight: proof, check: async () => {
      await expect(proof).toBeVisible();
      await expect(page.locator("summary", { hasText: "บันทึกรับเงินสด" })).toBeVisible();
      expect(await pageText(page)).not.toContain("ค่าส่ง");
    } });
  });
});

test("S07 cash closes job", async () => {
  const { page } = pim;
  await t.step("S07", page, ADMIN, async () => {
    await page.locator("summary", { hasText: "บันทึกรับเงินสด" }).click();
    await page.getByLabel("จำนวนเงิน (บาท)").fill("700");
    await page.getByLabel("วันเวลาที่รับเงิน").fill(bangkokLocal(0));
    const save = page.getByRole("button", { name: "บันทึกรับเงินสด" });
    await t.A(page, "record-cash", "กรอกจำนวนเงินส่วนที่เหลือ 700 บาท แล้วกดปุ่ม “บันทึกรับเงินสด”", { highlight: save });
    await save.click();
    await confirm(page, "ยืนยันรับเงินสด");
    await page.getByText("บันทึกรับเงินสดแล้ว").first().waitFor();
    await ready(page);
    await t.R(page, "balance-zero-job-closed", "ยอดคงเหลือเป็น 0 และงานปิดเมื่อลูกค้ารับงานและชำระครบ", { highlight: balanceHero(page), check: async () => {
      await expect(balanceHero(page)).toContainText("0.00 บาท");
      await expect(page.getByText("ปิดงานแล้ว: ลูกค้ารับงานและชำระครบ")).toBeVisible();
    } });
  });
});
