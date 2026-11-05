import { expect, type Page } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { push, ready, TMP } from "./kit";

export const randomPassword = () => `Uc-${crypto.randomBytes(12).toString("hex")}`;
export const taxId = () => Array.from({ length: 13 }, () => crypto.randomInt(10)).join("");

/** A real, minimal PDF so the backend's file checks exercise an actual document. */
export function testPdf(name = "UCTEST-drawing.pdf") {
  fs.mkdirSync(TMP, { recursive: true });
  const file = path.join(TMP, name);
  fs.writeFileSync(file, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  return file;
}
export function testPng(name = "UCTEST-photo.png") {
  fs.mkdirSync(TMP, { recursive: true });
  const file = path.join(TMP, name);
  fs.writeFileSync(file, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==", "base64"));
  return file;
}
/** Bangkok wall-clock value for a datetime-local input, days from now. */
export function bangkokLocal(days: number) {
  const date = new Date(Date.now() + days * 86_400_000 + 7 * 3_600_000);
  return date.toISOString().slice(0, 16);
}

export type RequestDraft = { description: string; qty?: string; material?: string; deadlineDays?: number; file?: string };
export async function openWizard(page: Page) {
  await page.locator("nav a:visible, aside a:visible").filter({ hasText: "คำขอผลิต" }).first().click();
  await ready(page);
  await page.getByRole("link", { name: "ส่งคำขอผลิตใหม่" }).click();
  await ready(page);
}
export const nextButton = (page: Page) => page.getByRole("button", { name: "ถัดไป", exact: true });
export async function fillDetails(page: Page, draft: RequestDraft) {
  await page.getByLabel("รายละเอียดงาน *").fill(draft.description);
  await page.getByLabel("จำนวน *").fill(draft.qty ?? "2");
  await page.getByLabel("ข้อกำหนดวัตถุดิบ *").fill(draft.material ?? "[UCTEST] เหล็ก S45C เส้นผ่านศูนย์กลาง 30 มม.");
  await page.getByLabel("วันที่ต้องการรับงาน *").fill(bangkokLocal(draft.deadlineDays ?? 30));
}
/** Creates a request through the real wizard and returns its id. */
export async function createRequest(page: Page, draft: RequestDraft) {
  await openWizard(page);
  await nextButton(page).click();
  await fillDetails(page, draft);
  await nextButton(page).click();
  if (draft.file) await page.locator('input[type="file"]').setInputFiles(draft.file);
  await nextButton(page).click();
  await page.getByRole("button", { name: "ส่งคำขอผลิต", exact: true }).click();
  await expect(page).toHaveURL(/created=1/, { timeout: 60_000 });
  await ready(page);
  return requestIdOf(page);
}
export function requestIdOf(page: Page) {
  const id = new URL(page.url()).searchParams.get("request");
  if (!id) throw new Error(`no request id in ${page.url()}`);
  return id;
}

// ---- sales chain (setup steps, not report evidence) ----
export type Costs = { material?: string; labor?: string; price?: string };
export async function staffOpen(page: Page, id: string) {
  await push(page, "/staff/quotations");
  await push(page, `/staff/quotations?request=${id}`);
  await page.getByRole("heading", { name: /คำขอ #\d+/ }).waitFor();
  await ready(page);
}
export async function fillQuote(page: Page, costs: Costs = {}) {
  await page.getByLabel("ค่าวัตถุดิบรวม").fill(costs.material ?? "1000.00");
  await page.getByLabel("ค่าแรงรวม").fill(costs.labor ?? "500.00");
  await page.getByLabel("ราคาเสนอลูกค้า").fill(costs.price ?? "2400.00");
  await expect(page.getByRole("status").filter({ hasText: "ราคาขั้นต่ำ" }).first()).toContainText("ต้นทุนรวม");
}
export const sendQuoteButton = (page: Page) => page.locator('form button[type="submit"]', { hasText: "ส่งใบเสนอราคา" });
export async function confirmSendQuote(page: Page) {
  await sendQuoteButton(page).click();
  await page.getByRole("dialog").getByRole("button", { name: "ส่งใบเสนอราคา" }).click();
  await expect(page.getByText("รอลูกค้าตัดสินใจ").first()).toBeVisible();
}
export async function sendQuote(page: Page, id: string, costs: Costs = {}) {
  await staffOpen(page, id);
  await fillQuote(page, costs);
  await confirmSendQuote(page);
}
export async function customerOpenQuote(page: Page, id: string) {
  await push(page, "/customer/quotations");
  await push(page, `/customer/quotations?request=${id}`);
  await page.getByRole("heading", { name: /ใบเสนอราคา #\d+/ }).waitFor();
  await ready(page);
}
export const rejectButton = (page: Page) => page.getByRole("button", { name: "ขอใบเสนอราคาใหม่" });
export const acceptButton = (page: Page) => page.getByRole("button", { name: "ตอบรับใบเสนอราคา" });
export async function tickConfirm(page: Page) { await page.locator(".cust-checkbox input").check(); }
export const confirmChoice = (page: Page) => page.getByRole("dialog").getByRole("button", { name: "ยืนยัน", exact: true });
export async function decide(page: Page, id: string, outcome: "accept" | "reject", reason = "[UCTEST] ขอปรับราคา") {
  await customerOpenQuote(page, id);
  await (outcome === "accept" ? acceptButton(page) : rejectButton(page)).click();
  if (outcome === "reject") await page.getByLabel("สิ่งที่ต้องการให้เปลี่ยน").fill(reason);
  await tickConfirm(page);
  await confirmChoice(page).click();
  await decided(page);
}
/** Uploads one evidence file through the real form and leaves the submit button ready. */
export async function attachEvidence(page: Page, file: string) {
  await page.locator('.cust-upload input[type="file"]').setInputFiles(file);
  await page.getByRole("button", { name: "อัปโหลดและตรวจไฟล์", exact: true }).click();
  await expect(page.locator(".cust-upload")).toContainText("อัปโหลดและตรวจไฟล์แล้ว", { timeout: 60_000 });
}
export async function adminOpen(page: Page, id: string) {
  await push(page, "/admin/requests");
  await push(page, `/admin/requests?request=${id}`);
  await page.getByRole("heading", { name: /คำขอ #\d+/ }).waitFor();
  await ready(page);
}
export const confirmReview = (page: Page) => page.getByRole("button", { name: "ยืนยันผลการตรวจ" });
/** The page remounts when the quotation version changes, so the one-off success notice is not a reliable signal; the status banner is. */
export async function decided(page: Page) {
  await expect(page.getByText(/ส่งเหตุผลให้ร้านแล้ว|คุณตอบรับใบเสนอราคานี้แล้ว|คำขอนี้ถูกยกเลิกแล้ว/).first()).toBeVisible({ timeout: 30_000 });
  await ready(page);
}
