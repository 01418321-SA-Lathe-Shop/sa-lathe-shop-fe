import { test, expect, type Page } from "@playwright/test";
import { asUser, blank, fresh, menu, pageText, push, readState, ready, saveState, stamp, UC, type Session } from "./helpers/kit";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const ADMIN = "Admin (pim.admin)"; const WORKER = "Worker (anan.staff)";
const run = stamp();
const UNIT = `UCTEST-กก-${run}`; const M1 = `[UCTEST] เหล็ก S45C ${run}`; const M2 = `[UCTEST] วัตถุดิบเลิกใช้ ${run}`;
let t: UC; let pim: Session; let anan: Session; let jobId = "";

async function catalog(page: Page) {
  await menu(page, "สต๊อกวัตถุดิบ");
  await page.getByRole("link", { name: "ข้อมูลหลัก (หน่วย/วัตถุดิบ)" }).click();
  await ready(page);
}
async function addMaterial(page: Page, name: string, shot?: () => Promise<void>) {
  await page.getByRole("button", { name: "เพิ่มวัตถุดิบ" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("ชื่อวัตถุดิบ").fill(name);
  await drawer.getByLabel("หน่วย").selectOption({ label: UNIT });
  if (shot) await shot();
  await drawer.locator('button[type="submit"]').click();
  await expect(page.locator("ul li", { hasText: name }).first()).toBeVisible();
  await ready(page);
}
async function openMaterial(page: Page, name: string) {
  await fresh(page, page.url().includes("/admin") ? "/admin/materials" : "/staff/materials");
  await page.getByRole("link", { name, exact: true }).click();
  await ready(page);
}
const stockSubmit = (page: Page) => page.locator('section[aria-label="ปรับสต๊อก"] button[type="submit"]');
async function confirmStock(page: Page) {
  await stockSubmit(page).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "ยืนยันปรับสต๊อก" }).click();
  await page.getByRole("status").filter({ hasText: /เพิ่มสต๊อกแล้ว|แก้ยอดตามที่นับแล้ว/ }).waitFor();
}
async function fillAddition(page: Page, quantity: string, cost: string, reason: string) {
  await page.getByRole("radio", { name: "เพิ่มสต๊อก" }).check();
  await page.getByLabel(/② จำนวนที่เพิ่ม/).fill(quantity);
  await page.getByLabel(/③ ต้นทุนต่อ/).fill(cost);
  await page.getByLabel("④ เหตุผล").fill(reason);
}
async function openJob(page: Page, description: string) {
  await menu(page, "งานผลิต");
  const card = page.locator('a[id^="production-card-"]').filter({ hasText: description });
  await card.first().click();
  await ready(page);
  return new URL(page.url()).searchParams.get("job") ?? "";
}
const stat = (page: Page, label: string) => page.locator("dl div").filter({ has: page.locator("dt", { hasText: label }) }).first().locator("dd");

test.beforeAll(async ({ browser }) => {
  t = new UC(5, browser); t.reset();
  pim = await asUser(browser, "pim.admin");
  anan = await asUser(browser, "anan.staff");
  saveState({ M1, M2, UNIT });
});
test.afterAll(async () => { await pim?.ctx.close(); await anan?.ctx.close(); });

test("S01-S03 admin catalog and stock", async () => {
  const { page } = pim;
  await t.step("S01", page, ADMIN, async () => {
    await catalog(page);
    await page.getByLabel(/ชื่อหน่วยใหม่/).fill(UNIT);
    const addUnit = page.getByRole("button", { name: "เพิ่มหน่วย" });
    await t.A(page, "add-unit", "ในหน้าข้อมูลหลัก กรอกชื่อหน่วยแล้วกดปุ่ม “เพิ่มหน่วย”", { n: 1, highlight: addUnit });
    await addUnit.click();
    await expect(page.locator("ul li", { hasText: UNIT }).first()).toBeVisible();
    await addMaterial(page, M1, () => t.A(page, "add-material", "กดปุ่ม “เพิ่มวัตถุดิบ” กรอกชื่อและเลือกหน่วย แล้วกดปุ่ม “เพิ่มวัตถุดิบ”", { n: 2, highlight: page.getByRole("dialog").locator('button[type="submit"]') }));
    const row = page.locator("ul li", { hasText: M1 }).first();
    await t.R(page, "material-in-catalog", "วัตถุดิบใหม่ปรากฏในแคตตาล็อก", { highlight: row, check: async () => { await expect(row).toContainText(UNIT); } });
    await addMaterial(page, M2);
  });
  await t.step("S02", page, ADMIN, async () => {
    await openMaterial(page, M1);
    await fillAddition(page, "10.123456", "100.50", "[UCTEST] รับเข้าเริ่มต้น");
    await t.A(page, "stock-in-form", "เลือก “เพิ่มสต๊อก” กรอกจำนวน 10.123456 ราคาต่อหน่วย และเหตุผล แล้วกดปุ่ม “ปรับสต๊อก”", { highlight: stockSubmit(page) });
    await confirmStock(page);
    await t.R(page, "balance-increased-exact", "ยอดคงเหลือเพิ่มเป็น 10.123456 ตรงตามทศนิยม 6 ตำแหน่ง", { settle: false, highlight: stat(page, "คงเหลือ"), check: async () => { await expect(stat(page, "คงเหลือ")).toHaveText("10.123456"); } });
  });
  await t.step("S03", page, ADMIN, async () => {
    await page.getByRole("radio", { name: "แก้ยอดตามที่นับ" }).check();
    await page.getByLabel(/② ยอดที่นับได้ทั้งหมด/).fill("20");
    await page.getByLabel("③ เหตุผล").fill("[UCTEST] นับสต๊อกจริง");
    await t.A(page, "stock-count-adjust", "เลือก “แก้ยอดตามที่นับ” กรอกยอดจริง 20 พร้อมเหตุผล แล้วกดปุ่ม “ปรับสต๊อก” และ “ยืนยันปรับสต๊อก”", { highlight: stockSubmit(page) });
    await confirmStock(page);
    await t.R(page, "balance-equals-count", "ยอดคงเหลือเท่ากับค่าที่กรอกคือ 20", { settle: false, highlight: stat(page, "คงเหลือ"), check: async () => { await expect(stat(page, "คงเหลือ")).toHaveText("20"); } });
  });
});

test("S04-S06 worker stock view and plan", async () => {
  const { page } = anan;
  const { description } = readState().R2;
  await t.step("S04", page, WORKER, async () => {
    await menu(page, "สต๊อกวัตถุดิบ");
    const search = page.getByRole("searchbox");
    await search.fill(M1);
    await t.A(page, "staff-search-material", "ในเมนู “สต๊อกวัตถุดิบ” พิมพ์ชื่อวัตถุดิบแล้วกดปุ่ม “ค้นหา”", { highlight: search });
    await page.getByRole("button", { name: "ค้นหา" }).click();
    await ready(page);
    await t.R(page, "staff-no-average-cost", "พนักงานเห็นยอดคงเหลือ จองแล้ว และพร้อมใช้ แต่ไม่เห็นต้นทุนเฉลี่ย", {
      note: "ตารางสต๊อกไม่มีคอลัมน์ “ขาด” จำนวนที่ขาดแสดงในแผนวัตถุดิบของงาน (S05)",
      check: async () => {
        const text = await pageText(page);
        for (const word of ["คงเหลือ", "จองแล้ว", "พร้อมใช้", M1]) expect(text).toContain(word);
        expect(text).not.toContain("ต้นทุนเฉลี่ย");
      },
    });
  });
  await t.step("S05", page, WORKER, async () => {
    jobId = await openJob(page, description);
    saveState({ J1: jobId });
    await page.getByRole("button", { name: "แก้ไขแผนวัตถุดิบ" }).click();
    await page.getByRole("searchbox").last().fill(M1);
    await page.getByRole("button", { name: "ค้นหา" }).last().click();
    await ready(page);
    await page.getByRole("button", { name: `เพิ่ม ${M1}` }).click();
    await page.getByLabel(/ต้องใช้ ·/).fill("25");
    const save = page.getByRole("button", { name: "บันทึกแผนและจองวัตถุดิบ" });
    await t.A(page, "edit-job-plan", "เลือกงานที่รอคิว กดปุ่ม “แก้ไขแผนวัตถุดิบ” เพิ่มวัตถุดิบ 25 หน่วย แล้วกดปุ่ม “บันทึกแผนและจองวัตถุดิบ”", { highlight: save });
    await save.click();
    const short = page.getByText("ขาด 5");
    await short.waitFor();
    await t.R(page, "plan-reserved-shortage", "ระบบบันทึกแผนและจองของที่มี 20 หน่วย พร้อมแสดงว่าขาด 5 หน่วย", { highlight: short, check: async () => {
      await expect(page.getByText("จองแล้ว 20")).toBeVisible();
      await expect(page.getByRole("button", { name: "เริ่มผลิต" })).toBeDisabled();
    } });
  });
  await t.step("S06", page, WORKER, async () => {
    await openMaterial(pim.page, M1);
    await fillAddition(pim.page, "10", "100.50", "[UCTEST] รับของเพิ่ม");
    await confirmStock(pim.page);
    await menu(page, "งานผลิต");
    await page.locator('a[id^="production-card-"]').filter({ hasText: description }).first().click();
    await ready(page);
    const again = page.getByRole("button", { name: "จองเพิ่มตามแผนเดิม" });
    await t.A(page, "recheck-reservation", "หลัง Admin รับของเพิ่ม การจองยังขาด 5 หน่วย จึงกดปุ่ม “จองเพิ่มตามแผนเดิม”", { highlight: again, check: async () => { await expect(page.getByText("ขาด 5")).toBeVisible(); } });
    await again.click();
    await page.getByText("จองแล้ว 25").waitFor();
    await t.R(page, "reservation-updated-on-click", "การจองอัปเดตเป็น 25 หน่วยเมื่อกดปุ่มเท่านั้น และปุ่ม “เริ่มผลิต” กดได้", { highlight: page.getByText("จองแล้ว 25"), check: async () => {
      await expect(page.getByText("ขาด 5")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "เริ่มผลิต" })).toBeEnabled();
    } });
  });
});

test("N01 N02 stock rules", async () => {
  const { page } = pim;
  await t.step("N01", page, ADMIN, async () => {
    await openMaterial(page, M1);
    await page.getByRole("radio", { name: "แก้ยอดตามที่นับ" }).check();
    const field = page.getByLabel(/② ยอดที่นับได้ทั้งหมด/);
    await field.fill("5");
    await page.getByLabel("③ เหตุผล").fill("[UCTEST] ลองปรับต่ำกว่ายอดจอง");
    const problem = page.getByText(/ต่ำกว่าจำนวนที่จองให้งานไว้/);
    await t.N(page, "adjust-below-reserved-blocked", "กรอกยอดนับ 5 ซึ่งต่ำกว่ายอดจอง 25 ระบบแจ้งเตือนและกดปุ่ม “ปรับสต๊อก” ไม่ได้", { highlight: problem, check: async () => {
      await expect(problem).toBeVisible();
      await expect(stockSubmit(page)).toBeDisabled();
    } });
  });
  await t.step("N02", page, ADMIN, async () => {
    await catalog(page);
    await page.getByRole("button", { name: new RegExp(`แก้ไข\\s*${M2.replace(/[[\]]/g, "\\$&")}`) }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByRole("checkbox", { name: "เปิดใช้งาน" }).uncheck();
    await drawer.locator('button[type="submit"]').click();
    await page.getByRole("status").filter({ hasText: "บันทึกวัตถุดิบแล้ว" }).waitFor();
    await openMaterial(page, M2);
    const addition = page.getByRole("radio", { name: "เพิ่มสต๊อก" });
    await t.N(page, "stock-in-inactive-blocked", "วัตถุดิบที่ปิดใช้งานเลือก “เพิ่มสต๊อก” ไม่ได้ เหลือเฉพาะการแก้ยอดตามที่นับ", { highlight: page.getByText("วัตถุดิบนี้ปิดใช้งานอยู่"), check: async () => {
      await expect(addition).toBeDisabled();
      await expect(page.getByText("วัตถุดิบนี้ปิดใช้งานอยู่")).toBeVisible();
    } });
  });
});

test("N03 customer denied", async ({ browser }) => {
  const somchai = await asUser(browser, "somchai");
  await t.step("N03", somchai.page, "ลูกค้า (somchai)", async () => {
    await somchai.page.evaluate(() => (window as Window & { next: { router: { push: (url: string) => void } } }).next.router.push("/staff/materials"));
    await somchai.page.waitForURL(/\/customer/, { timeout: 30_000 }).catch(() => {});
    await ready(somchai.page);
    await t.N(somchai.page, "customer-denied-staff-materials", "ลูกค้าเปิด /staff/materials ไม่ได้ ระบบพากลับพื้นที่ลูกค้า", { n: 1, check: async () => {
      await expect(somchai.page).toHaveURL(/\/customer/);
      expect(await pageText(somchai.page)).not.toContain(M1);
    } });
    await somchai.page.goto("/staff/materials");
    await somchai.page.waitForURL(/\/login/, { timeout: 30_000 }).catch(() => {});
    await ready(somchai.page);
    await t.N(somchai.page, "typed-url-requires-login", "เมื่อพิมพ์ URL ตรง ๆ ระบบพาไปหน้าเข้าสู่ระบบเพราะ session อยู่ในหน่วยความจำ", { n: 2, check: async () => { await expect(somchai.page).toHaveURL(/\/login/); } });
  });
  await somchai.ctx.close();
  void blank;
});

test("N04 admin plan read only", async () => {
  const { page } = pim;
  await t.step("N04", page, ADMIN, async () => {
    await push(page, `/admin/production?job=${jobId}`);
    const note = page.getByText("Admin ดูแผนได้อย่างเดียว");
    await t.N(page, "admin-plan-read-only", "Admin เปิดแผนวัตถุดิบได้แบบดูอย่างเดียว ไม่มีปุ่มแก้ไขแผนหรือเริ่มผลิต", { highlight: note, check: async () => {
      await expect(note).toBeVisible();
      await expect(page.getByRole("button", { name: /แก้ไขแผนวัตถุดิบ|เริ่มผลิต|จองเพิ่มตามแผนเดิม/ })).toHaveCount(0);
    } });
  });
});
