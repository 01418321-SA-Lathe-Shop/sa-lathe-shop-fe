import { test, expect, type Page } from "@playwright/test";
import { asUser, fresh, menu, pageText, push, readState, ready, saveState, stamp, UC, type Session } from "./helpers/kit";
import { testPng } from "./helpers/flows";

test.describe.configure({ mode: "serial" });
test.setTimeout(420_000);

const WORKER = "Worker (anan.staff)"; const ADMIN = "Admin (pim.admin)";
const M3 = `[UCTEST] ของใช้นอกแผน ${stamp()}`;
let t: UC; let anan: Session; let pim: Session; let J1 = ""; let J2 = ""; let M1 = "";

const dialog = (page: Page) => page.getByRole("dialog").last();
const startButton = (page: Page) => page.getByRole("button", { name: "เริ่มผลิต", exact: true });
async function jobIdOf(page: Page, description: string) {
  await menu(page, "งานผลิต");
  await page.locator('a[id^="production-card-"]').filter({ hasText: description }).first().click();
  await ready(page);
  return new URL(page.url()).searchParams.get("job") ?? "";
}
const openJob = (page: Page, root: string, job: string) => fresh(page, `${root}/production?view=list&job=${job}`);
async function onHand(page: Page, material: string) {
  await fresh(page, page.url().includes("/admin") ? "/admin/materials" : "/staff/materials");
  return (await page.locator("tr", { hasText: material }).locator('td[data-label="คงเหลือ"]').innerText()).replace(/\s+/g, " ");
}
async function planLine(page: Page, material: string, quantity: string) {
  await page.getByRole("button", { name: "แก้ไขแผนวัตถุดิบ" }).click();
  await page.getByRole("searchbox").last().fill(material);
  await page.getByRole("button", { name: "ค้นหา" }).last().click();
  await ready(page);
  await page.getByRole("button", { name: `เพิ่ม ${material}` }).click();
  await page.getByLabel(/ต้องใช้ ·/).last().fill(quantity);
  await page.getByRole("button", { name: "บันทึกแผนและจองวัตถุดิบ" }).click();
  await page.getByRole("button", { name: "แก้ไขแผนวัตถุดิบ" }).waitFor();
  await ready(page);
}

test.beforeAll(async ({ browser }) => {
  t = new UC(8, browser); t.reset();
  const state = readState();
  J1 = state.J1; M1 = state.M1;
  anan = await asUser(browser, "anan.staff");
  pim = await asUser(browser, "pim.admin");
  J2 = await jobIdOf(anan.page, state.R3.description);
  saveState({ J2 });
});
test.afterAll(async () => { await anan?.ctx.close(); await pim?.ctx.close(); });

test("N01 start disabled without reservation", async () => {
  const { page } = anan;
  await t.step("N01", page, WORKER, async () => {
    await openJob(page, "/staff", J2);
    await t.N(page, "start-disabled-no-reservation", "งานที่แผนว่างหรือจองไม่ครบ ปุ่ม “เริ่มผลิต” กดไม่ได้", { highlight: startButton(page), check: async () => {
      await expect(startButton(page)).toBeDisabled();
      await expect(page.getByText(/ยังไม่มีแผนวัตถุดิบ กด/)).toBeVisible();
    } });
  });
});

test("S01 S02 start job", async () => {
  const { page } = anan;
  await t.step("S01", page, WORKER, async () => {
    await menu(page, "งานผลิต");
    const card = page.locator(`[id="production-card-${J1}"]`);
    await t.A(page, "select-reserved-job", "กดเลือกงานที่แผนจองครบแล้วในเมนู “งานผลิต”", { highlight: card });
    await card.click();
    await ready(page);
    await t.R(page, "start-enabled", "ปุ่ม “เริ่มผลิต” กดได้", { highlight: startButton(page), check: async () => { await expect(startButton(page)).toBeEnabled(); } });
  });
  await t.step("S02", page, WORKER, async () => {
    const before = await onHand(page, M1);
    await openJob(page, "/staff", J1);
    await t.A(page, "start-job", "กดปุ่ม “เริ่มผลิต” และยืนยัน", { highlight: startButton(page) });
    await startButton(page).click();
    await dialog(page).getByRole("button", { name: "เริ่มผลิต" }).click();
    await page.getByRole("button", { name: "ใช้วัตถุดิบ", exact: true }).waitFor();
    await ready(page);
    const summary = page.locator(`section[aria-labelledby="materials-${J1}"]`);
    await t.R(page, "in-progress-not-used", "สถานะเป็นกำลังผลิต และยังไม่มีการใช้วัตถุดิบ", { n: 1, highlight: summary, check: async () => {
      await expect(page.locator("article").last()).toContainText("กำลังผลิต");
      await expect(summary.locator("dl div", { hasText: "ใช้แล้ว" }).first()).toContainText("0");
    } });
    const after = await onHand(page, M1);
    const row = page.locator("tr", { hasText: M1 });
    await t.R(page, "stock-unchanged-after-start", "ยอดคงเหลือในสต๊อกไม่เปลี่ยนหลังเริ่มผลิต", { n: 2, highlight: row, check: async () => { expect(after).toBe(before); } });
  });
});

test("S03 N02 usage", async () => {
  const { page } = anan;
  const { R3 } = readState();
  // Second job holds the rest of the stock, so a J1 overrun has to reach into J2's reservation.
  await openJob(page, "/staff", J2);
  await planLine(page, M1, "25");
  await t.step("S03", page, WORKER, async () => {
    await openJob(page, "/staff", J1);
    await page.getByLabel(/ใช้ครั้งนี้ ·/).first().fill("20");
    const save = page.getByRole("button", { name: "บันทึกการใช้วัตถุดิบ" });
    await t.A(page, "record-usage", "กรอกจำนวนที่ใช้ครั้งนี้ 20 แล้วกดปุ่ม “บันทึกการใช้วัตถุดิบ”", { highlight: save });
    await save.click();
    await page.getByRole("status").filter({ hasText: "บันทึกการใช้วัตถุดิบแล้ว" }).waitFor();
    await ready(page);
    await page.locator("summary", { hasText: "ประวัติงานนี้" }).click();
    const line = page.getByText(/ใช้จากที่จอง 20/);
    await t.R(page, "usage-from-reservation", "ระบบตัดจากของที่จองไว้ก่อน โดยแสดง “ใช้จากที่จอง 20”", { n: 1, highlight: line, check: async () => { await expect(line).toBeVisible(); } });
  });
  await t.step("N02", page, WORKER, async () => {
    await openJob(page, "/staff", J1);
    const available = await pageText(page);
    await page.getByLabel(/ใช้ครั้งนี้ ·/).first().fill("6");
    const answer = page.waitForResponse((r) => r.url().endsWith("/usage") && r.request().method() === "POST", { timeout: 30_000 });
    await page.getByRole("button", { name: "บันทึกการใช้วัตถุดิบ" }).click();
    const response = await answer;
    const body = (await response.text()).slice(0, 160);
    await ready(page);
    const summary = page.locator(`section[aria-labelledby="materials-${J1}"]`);
    const panel = page.getByRole("button", { name: "โหลดข้อมูลล่าสุด" });
    await t.N(page, "overuse-other-reservation-blocked", `ใช้ 6 ซึ่งเกินของที่จองไว้ 5 และของว่างหมดเพราะงาน ${R3.description} จองไว้ ระบบไม่บันทึกการใช้`, {
      highlight: await panel.count() ? panel : page.getByRole("alert").first(),
      note: `API ตอบ HTTP ${response.status()}: ${body} · หน้าจอแสดงกล่อง “ไม่แน่ใจว่าบันทึกสำเร็จหรือไม่” แทนการบอกว่าของไม่พอ${available.includes("จองไว้เหลือ 5") ? "" : " · ยอดจองที่เหลือไม่ใช่ 5 ตามที่เตรียมไว้"}`,
      check: async () => { expect(response.ok()).toBe(false); await expect(summary.locator("dl div", { hasText: "ใช้แล้ว" }).first()).toContainText("20"); },
    });
    if (await panel.count()) await panel.click();
    await ready(page);
  });
  await t.step("S03", page, WORKER, async () => {
    await push(pim.page, "/admin/materials?view=catalog");
    await pim.page.getByRole("button", { name: "เพิ่มวัตถุดิบ" }).click();
    const drawer = pim.page.getByRole("dialog");
    await drawer.getByLabel("ชื่อวัตถุดิบ").fill(M3);
    await drawer.getByLabel("หน่วย").selectOption({ label: readState().UNIT });
    await drawer.locator('button[type="submit"]').click();
    await pim.page.getByRole("status").filter({ hasText: "เพิ่มวัตถุดิบแล้ว" }).waitFor();
    await push(pim.page, "/admin/materials");
    await pim.page.getByRole("link", { name: M3, exact: true }).click();
    await ready(pim.page);
    await pim.page.getByRole("radio", { name: "เพิ่มสต๊อก" }).check();
    await pim.page.getByLabel(/② จำนวนที่เพิ่ม/).fill("5");
    await pim.page.getByLabel(/③ ต้นทุนต่อ/).fill("10");
    await pim.page.getByLabel("④ เหตุผล").fill("[UCTEST] เตรียมของว่าง");
    await pim.page.locator('section[aria-label="ปรับสต๊อก"] button[type="submit"]').click();
    await dialog(pim.page).getByRole("checkbox").check();
    await dialog(pim.page).getByRole("button", { name: "ยืนยันปรับสต๊อก" }).click();
    await pim.page.getByRole("status").filter({ hasText: "เพิ่มสต๊อกแล้ว" }).waitFor();
    await openJob(page, "/staff", J1);
    await page.getByRole("button", { name: "+ เพิ่มวัตถุดิบนอกแผน" }).click();
    await page.getByRole("searchbox").last().fill(M3);
    await page.getByRole("button", { name: "ค้นหา" }).last().click();
    await ready(page);
    await page.getByRole("button", { name: `เพิ่ม ${M3}` }).click();
    await page.getByLabel(new RegExp(`ใช้ครั้งนี้ · .*ของใช้นอกแผน`)).fill("1");
    await page.getByRole("button", { name: "บันทึกการใช้วัตถุดิบ" }).click();
    await page.getByRole("status").filter({ hasText: "บันทึกการใช้วัตถุดิบแล้ว" }).waitFor();
    await ready(page);
    await page.locator("summary", { hasText: "ประวัติงานนี้" }).click();
    const line = page.locator("li", { hasText: M3 }).last();
    await t.R(page, "usage-from-free-stock", "วัตถุดิบนอกแผนซึ่งไม่มีการจองถูกตัดจากของว่าง โดยแสดง “ใช้จากที่จอง 0”", { n: 2, highlight: line, check: async () => { await expect(line).toContainText("ใช้จากที่จอง 0"); } });
  });
});

test("S04 S05 labor, photo, finish", async () => {
  const { page } = anan;
  await t.step("S04", page, WORKER, async () => {
    await openJob(page, "/staff", J1);
    await page.getByRole("button", { name: "เวลาทำงาน", exact: true }).click();
    await page.getByLabel("นาทีที่ทำงาน *").fill("90");
    const save = page.getByRole("button", { name: "บันทึกเวลาทำงาน" });
    await t.A(page, "record-minutes", "เลือก “เวลาทำงาน” กรอก 90 นาที แล้วกดปุ่ม “บันทึกเวลาทำงาน”", { n: 1, highlight: save });
    await save.click();
    await page.getByRole("status").filter({ hasText: "เพิ่มเวลาทำงาน" }).waitFor();
    await ready(page);
    await page.getByRole("button", { name: "รูปงาน", exact: true }).click();
    await page.getByLabel("เลือกรูปงาน").setInputFiles(testPng("UCTEST-job-photo.png"));
    const upload = page.getByRole("button", { name: "อัปโหลดรูป" });
    await t.A(page, "attach-photo", "เลือก “รูปงาน” แนบรูปแล้วกดปุ่ม “อัปโหลดรูป”", { n: 2, highlight: upload });
    await upload.click();
    await page.getByRole("status").filter({ hasText: "แนบรูปงานแล้ว" }).waitFor();
    await ready(page);
    await page.waitForTimeout(1_000);
    await page.locator("details", { hasText: "ประวัติงานนี้" }).first().evaluate((el: HTMLDetailsElement) => { el.open = true; });
    await t.R(page, "labor-saved", "ระบบบันทึกเวลาทำงาน 90 นาทีและรูปงานสำเร็จ", { highlight: page.getByText("UCTEST-job-photo.png"), check: async () => {
      await expect(page.getByText("UCTEST-job-photo.png")).toBeVisible();
      await expect(page.locator("dl div", { hasText: "เวลาทำงานรวม" }).first()).toContainText("1 ชม. 30 นาที");
    } });
  });
  await t.step("S05", page, WORKER, async () => {
    const before = await onHand(page, M1);
    await openJob(page, "/staff", J1);
    const finish = page.getByRole("button", { name: "ปิดงาน", exact: true });
    await t.A(page, "finish-job", "กดปุ่ม “ปิดงาน” เมื่อผลิตเสร็จ แล้วยืนยันรายการตรวจ", { highlight: finish, note: "ปุ่มบนหน้าจอชื่อ “ปิดงาน” ไม่ใช่ “ผลิตเสร็จแล้ว” ตามคู่มือ" });
    await finish.click();
    for (const box of await dialog(page).getByRole("checkbox").all()) await box.check();
    await dialog(page).getByRole("button", { name: "ปิดงาน" }).click();
    await page.getByText("ผลิตเสร็จแล้ว").first().waitFor();
    await ready(page);
    const summary = page.locator(`section[aria-labelledby="materials-${J1}"]`);
    await t.R(page, "reservation-released", "การจองที่เหลือถูกปล่อยคืน โดยแสดงคืนแล้ว 5", { n: 1, highlight: summary, check: async () => {
      await expect(summary.locator("li", { hasText: M1 }).locator("dl div", { hasText: "คืนแล้ว" })).toContainText("5");
      await expect(summary.locator("li", { hasText: M1 }).locator("dl div", { hasText: "จองไว้ตอนนี้" })).toContainText("0");
    } });
    const after = await onHand(page, M1);
    await t.R(page, "on-hand-not-increased", "การปล่อยการจองไม่เพิ่มของจริงในสต๊อก", { n: 2, highlight: page.locator("tr", { hasText: M1 }), check: async () => { expect(after).toBe(before); } });
  });
});

test("S06 admin labor cost", async () => {
  const { page } = pim;
  await t.step("S06", page, ADMIN, async () => {
    await openJob(page, "/admin", J1);
    await page.getByLabel(/ค่าแรงจริงสำหรับเวลาที่บันทึก/).fill("600.00");
    const save = page.getByRole("button", { name: "บันทึกค่าแรง" });
    await t.A(page, "admin-actual-labor", "กรอกค่าแรงจริง 600.00 บาท แล้วกดปุ่ม “บันทึกค่าแรง”", { highlight: save });
    await save.click();
    await page.getByRole("status").filter({ hasText: "บันทึกค่าแรงจริงแล้ว" }).waitFor();
    const section = page.locator(`section[aria-labelledby="cost-${J1}"]`);
    await t.R(page, "admin-sees-cost", "Admin เห็นต้นทุนจริงรวมค่าแรงที่บันทึก", { n: 1, settle: false, highlight: section, check: async () => { await expect(section).toContainText("600.00"); } });
    const worker = anan.page;
    await openJob(worker, "/staff", J1);
    await t.R(worker, "worker-no-cost", "Worker เปิดงานเดียวกันแล้วไม่เห็นต้นทุน", { n: 2, role: WORKER, check: async () => {
      const text = await pageText(worker);
      expect(text).not.toContain("ต้นทุนจริง");
      expect(text).not.toContain("600.00");
    } });
  });
});
