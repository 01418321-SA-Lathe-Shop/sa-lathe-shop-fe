import { test, expect } from "@playwright/test";
import { asUser, menu, readState, ready, saveState, stamp, UC, type Session } from "./helpers/kit";
import { acceptButton, confirmChoice, createRequest, customerOpenQuote, decided, rejectButton, sendQuote, tickConfirm } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(600_000);

const CUSTOMER = "ลูกค้า (somchai)";
const run = stamp();
let t: UC; let anan: Session; let somchai: Session; let id = "";

test.beforeAll(async ({ browser }) => {
  t = new UC(3, browser); t.reset();
  id = readState().R1.id;
  anan = await asUser(browser, "anan.staff");
  somchai = await asUser(browser, "somchai");
});
test.afterAll(async () => { await anan?.ctx.close(); await somchai?.ctx.close(); });

test("S01 open latest quotation", async () => {
  const { page } = somchai;
  await t.step("S01", page, CUSTOMER, async () => {
    await menu(page, "ใบเสนอราคา");
    const open = page.locator(`a[href*="${id}"]`).first();
    await t.A(page, "open-latest-quotation", "กดเลือกใบเสนอราคาล่าสุดด้วยปุ่ม “ดูรายละเอียดและตอบ”", { highlight: open });
    await open.click();
    await ready(page);
    const bar = page.getByRole("region", { name: "การตัดสินใจของคุณ" });
    await t.R(page, "accept-reject-buttons", "ระบบแสดงปุ่ม “ตอบรับใบเสนอราคา” และ “ขอใบเสนอราคาใหม่”", { highlight: bar, check: async () => {
      await expect(acceptButton(page)).toBeVisible();
      await expect(rejectButton(page)).toBeVisible();
    } });
  });
});

test("S02 five rejections", async () => {
  const { page } = somchai;
  await t.step("S02", page, "ลูกค้า + Worker", async () => {
    for (let round = 1; round <= 5; round++) {
      await customerOpenQuote(page, id);
      await rejectButton(page).click();
      await page.getByLabel("สิ่งที่ต้องการให้เปลี่ยน").fill(`[UCTEST] ขอปรับราคา ครั้งที่ ${round}`);
      await tickConfirm(page);
      if (round === 1 || round === 5) await t.A(page, `reject-revision-${round}`, `กดปุ่ม “ขอใบเสนอราคาใหม่” กรอกเหตุผลและยืนยันการปฏิเสธครั้งที่ ${round}`, { n: round === 1 ? 1 : 2, highlight: confirmChoice(page) });
      await confirmChoice(page).click();
      await decided(page);
      await sendQuote(anan.page, id, { price: String(2400 + round * 10) + ".00" });
    }
    await customerOpenQuote(page, id);
    const history = page.getByRole("heading", { name: "ประวัติฉบับและการตัดสินใจ" });
    await t.R(page, "decision-history-complete", "หลังปฏิเสธครบ 5 ครั้ง ร้านยังส่งฉบับแก้ไขได้ และประวัติการตัดสินใจแสดงครบ", { highlight: history, check: async () => {
      await expect(page.getByText(/คุณปฏิเสธฉบับที่ \d+/)).toHaveCount(5);
      await expect(page.locator("body")).toContainText("ปฏิเสธสะสม 5 ครั้ง");
      await expect(rejectButton(page)).toBeVisible();
    } });
  });
});

test("S03 sixth rejection cancels", async () => {
  const { page } = somchai;
  await t.step("S03", page, CUSTOMER, async () => {
    await rejectButton(page).click();
    await page.getByLabel("สิ่งที่ต้องการให้เปลี่ยน").fill("[UCTEST] ขอปรับราคา ครั้งที่ 6");
    await tickConfirm(page);
    await t.A(page, "sixth-rejection", "กดยืนยันการปฏิเสธครั้งที่ 6 ระบบเตือนว่าจะยกเลิกคำขอผลิต", { highlight: confirmChoice(page), check: async () => {
      await expect(page.getByRole("dialog")).toContainText("การปฏิเสธครั้งนี้จะยกเลิกคำขอผลิต");
    } });
    await confirmChoice(page).click();
    await decided(page);
    const banner = page.getByText("คำขอนี้ถูกยกเลิกแล้ว");
    await t.R(page, "request-canceled", "คำขอถูกยกเลิก และใบเสนอราคาเปิดดูได้อย่างเดียว", { highlight: banner, check: async () => {
      await expect(banner).toBeVisible();
      await expect(acceptButton(page)).toHaveCount(0);
      await expect(rejectButton(page)).toHaveCount(0);
    } });
  });
});

test("S04 accept new request", async () => {
  const { page } = somchai;
  await t.step("S04", page, CUSTOMER, async () => {
    const description = `[UCTEST] R2 เพลาส่งกำลัง ${run}`;
    const R2 = await createRequest(page, { description });
    saveState({ R2: { id: R2, description } });
    await sendQuote(anan.page, R2);
    await customerOpenQuote(page, R2);
    await acceptButton(page).click();
    await tickConfirm(page);
    await t.A(page, "accept-quotation", "กดปุ่ม “ตอบรับใบเสนอราคา” ทำเครื่องหมายยืนยัน แล้วกดปุ่ม “ยืนยัน”", { highlight: confirmChoice(page) });
    const decisions = page.waitForResponse((r) => r.url().includes(`/requests/${R2}/quotation-decisions`) && r.request().method() === "GET" && r.ok(), { timeout: 30_000 });
    await confirmChoice(page).click();
    await decided(page);
    const terms = ((await (await decisions).json()).items ?? []).find((item: { outcome: string }) => item.outcome === "accept")?.terms;
    const panel = page.getByRole("heading", { name: "เงื่อนไขที่บันทึกเมื่อตอบรับ" });
    await t.R(page, "accepted-terms-14-days", "ระบบแสดงเงื่อนไขที่บันทึกถาวร ได้แก่ มัดจำขั้นต่ำ การส่ง PO และกำหนดส่งหลักฐานภายใน 14 วัน", { highlight: panel, check: async () => {
      await expect(panel).toBeVisible();
      await expect(page.locator("body")).toContainText("ส่งหลักฐานภายใน");
      expect(terms, "terms returned by API").toBeTruthy();
      expect(Date.parse(terms.documents_due_at) - Date.parse(terms.accepted_at)).toBe(14 * 86_400_000);
    } });
  });
});

test("S05 company member accepts", async ({ browser }) => {
  const nida = await asUser(browser, "nida.company");
  const ploy = await asUser(browser, "ploy.company");
  await t.step("S05", ploy.page, "สมาชิกบริษัท (ploy.company)", async () => {
    const description = `[UCTEST] R3 ชิ้นส่วนบริษัท ${run}`;
    const R3 = await createRequest(nida.page, { description });
    saveState({ R3: { id: R3, description } });
    await sendQuote(anan.page, R3);
    await customerOpenQuote(ploy.page, R3);
    await acceptButton(ploy.page).click();
    await tickConfirm(ploy.page);
    await t.A(ploy.page, "member-accepts", "สมาชิกบริษัทกดปุ่ม “ตอบรับใบเสนอราคา” ของคำขอที่เจ้าของบริษัทสร้าง แล้วกดปุ่ม “ยืนยัน”", { highlight: confirmChoice(ploy.page) });
    await confirmChoice(ploy.page).click();
    await decided(ploy.page);
    await t.R(ploy.page, "member-accepted-for-company", "สมาชิกบริษัทตัดสินใจแทนบริษัทได้ และระบบบันทึกเงื่อนไขว่าต้องส่ง PO", { highlight: ploy.page.getByRole("heading", { name: "เงื่อนไขที่บันทึกเมื่อตอบรับ" }), check: async () => {
      await expect(ploy.page.getByText("คุณตอบรับใบเสนอราคานี้แล้ว")).toBeVisible();
      await expect(ploy.page.locator("body")).toContainText("ต้องส่ง");
    } });
  });
  await nida.ctx.close(); await ploy.ctx.close();
});

test("N01 buttons gone after accept", async () => {
  const { page } = somchai;
  await t.step("N01", page, CUSTOMER, async () => {
    await customerOpenQuote(page, readState().R2.id);
    await t.N(page, "buttons-gone-after-accept", "หลังตอบรับแล้ว ปุ่มตอบรับและปฏิเสธหายไป เหลือลิงก์ส่งหลักฐาน", { highlight: page.getByText("คุณตอบรับใบเสนอราคานี้แล้ว"), check: async () => {
      await expect(acceptButton(page)).toHaveCount(0);
      await expect(rejectButton(page)).toHaveCount(0);
    } });
  });
});

test("N02 network loss on confirm", async () => {
  const { page } = somchai;
  await t.step("N02", page, CUSTOMER, async () => {
    const R7 = await createRequest(page, { description: `[UCTEST] R7 เครือข่ายขาด ${run}` });
    await sendQuote(anan.page, R7);
    await customerOpenQuote(page, R7);
    let attempts = 0;
    const cut = (route: import("@playwright/test").Route) => {
      if (route.request().method() === "POST" && route.request().url().endsWith("/decision")) { attempts++; return route.abort(); }
      return route.fallback();
    };
    await page.route("http://localhost:8080/**", cut);
    await acceptButton(page).click();
    await tickConfirm(page);
    await confirmChoice(page).click();
    const panel = page.getByText("ยังยืนยันผลการบันทึกไม่ได้");
    await panel.waitFor();
    await page.waitForTimeout(5_000);
    await t.N(page, "network-loss-no-auto-resend", "เครือข่ายขาดตอนยืนยัน ระบบแจ้งว่ายังยืนยันผลไม่ได้ ไม่ส่งซ้ำเอง และให้ตรวจสถานะล่าสุด", {
      n: 1, highlight: panel,
      note: "จำลองด้วยการตัด request ตัดสินใจในเบราว์เซอร์",
      check: async () => { expect(attempts).toBe(1); await expect(page.getByRole("button", { name: "ตรวจสถานะล่าสุดและเริ่มใหม่" })).toBeVisible(); },
    });
    await page.unroute("http://localhost:8080/**", cut);
    await page.getByRole("button", { name: "ตรวจสถานะล่าสุดและเริ่มใหม่" }).click();
    await ready(page);
    await t.N(page, "network-loss-reloads-state", "เมื่อกด “ตรวจสถานะล่าสุดและเริ่มใหม่” ระบบโหลดสถานะปัจจุบันซึ่งยังรอคุณตอบ", {
      n: 2,
      check: async () => { expect(attempts).toBe(1); await expect(page.getByText("รอคุณตอบ")).toBeVisible(); },
    });
  });
});
