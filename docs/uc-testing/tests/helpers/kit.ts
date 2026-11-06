import { expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROLE_ROOT, type TestUsername } from "./auth";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
export const SHOTS = path.join(ROOT, "screenshots");
const MANIFEST = path.join(SHOTS, "manifest.json");
export const TMP = path.join(ROOT, "tmp");
const STATE = path.join(TMP, "state.json");
const LOGINS = path.join(TMP, "logins.json");
const GUIDE = JSON.parse(fs.readFileSync(path.join(HERE, "guide.json"), "utf8")) as { no: string; title: string; steps: [string, string][]; neg: string[] }[];
export const DIRS: Record<number, string> = {
  1: "UC01_register-and-submit-request", 2: "UC02_review-request-and-quotation", 3: "UC03_customer-quotation-decision", 4: "UC04_evidence-and-open-job",
  5: "UC05_materials-stock-reservation", 6: "UC06_supplier-purchase-orders", 7: "UC07_receiving-claims-supplier-payment", 8: "UC08_production-and-usage",
  9: "UC09_delivery-invoice-payment", 10: "UC10_units-and-conversions", 11: "UC11_worker-management", 12: "UC12_superadmin-manage-admins",
};
const clean = (html: string) => html.replace(/<[^>]+>/g, "").trim();
const pad = (n: number) => String(n).padStart(2, "0");

export type Status = "PASS" | "FAIL" | "SKIP";
export type Entry = { file: string; uc: string; uc_name: string; step: string; kind: string; role: string; url: string; caption_th: string; expected_th: string; status: Status; note: string };

// ---- persisted run state (data chain between spec files) ----
export function readState(): Record<string, unknown> { try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return {}; } }
export function saveState(patch: Record<string, unknown>) { fs.mkdirSync(TMP, { recursive: true }); fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 1)); }

// ---- manifest ----
function readManifest(): Entry[] { try { return JSON.parse(fs.readFileSync(MANIFEST, "utf8")); } catch { return []; } }
function writeManifest(rows: Entry[]) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(MANIFEST, JSON.stringify(rows, null, 1)); }
function record(entry: Entry) {
  const rows = readManifest().filter((row) => !(row.file === entry.file && row.step === entry.step));
  rows.push(entry);
  rows.sort((a, b) => (Number(a.uc.slice(2)) - Number(b.uc.slice(2))) || a.step.localeCompare(b.step) || a.file.localeCompare(b.file));
  writeManifest(rows);
  console.log(`[${entry.status}] ${entry.uc} ${entry.step} ${entry.kind} ${path.basename(entry.file) || "(no image)"}${entry.note ? ` :: ${entry.note}` : ""}`);
}

// ---- sessions ----
/** The login API allows 10/min per IP; a rolling log keeps reruns from causing a 429 that isn't the app's fault. */
export async function throttleLogin() {
  fs.mkdirSync(TMP, { recursive: true });
  let log: number[] = [];
  try { log = JSON.parse(fs.readFileSync(LOGINS, "utf8")); } catch { /* first login */ }
  const now = Date.now();
  log = log.filter((t) => now - t < 61_000);
  if (log.length >= 8) {
    const wait = 61_000 - (now - log[0]) + 500;
    console.log(`(throttle login ${Math.round(wait / 1000)}s)`);
    await new Promise((r) => setTimeout(r, wait));
    log = log.slice(1);
  }
  log.push(Date.now());
  fs.writeFileSync(LOGINS, JSON.stringify(log));
}
export const CONTEXT = { baseURL: "http://localhost:3100", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "th-TH", timezoneId: "Asia/Bangkok", acceptDownloads: true } as const;
export type Session = { ctx: BrowserContext; page: Page; user: string };
const PICKER = "บัญชีทดสอบ Local · เข้าสู่ระบบทันที";

export async function blank(browser: Browser): Promise<Session> {
  const ctx = await browser.newContext(CONTEXT);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);
  const log = (text: string) => { fs.mkdirSync(TMP, { recursive: true }); fs.appendFileSync(path.join(TMP, "console.log"), `${text.slice(0, 500)}
`); };
  page.on("pageerror", (error) => log(`pageerror ${page.url()} ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") log(`console ${page.url()} ${message.text()}`); });
  return { ctx, page, user: "" };
}
export async function asUser(browser: Browser, username: TestUsername): Promise<Session> {
  const session = await blank(browser);
  const { page } = session;
  await throttleLogin();
  await page.goto("/login");
  await page.locator("summary", { hasText: PICKER }).click();
  await page.locator(".auth-account-list button", { hasText: username }).click();
  await expect(page).toHaveURL(new RegExp(`${ROLE_ROOT[username]}(/|$|\\?)`), { timeout: 60_000 });
  await ready(page);
  return { ...session, user: username };
}
export async function asPassword(browser: Browser, username: string, password: string, expectUrl: RegExp): Promise<Session> {
  const session = await blank(browser);
  await passwordLogin(session.page, username, password);
  await expect(session.page).toHaveURL(expectUrl, { timeout: 60_000 });
  await ready(session.page);
  return { ...session, user: username };
}
export async function passwordLogin(page: Page, username: string, password: string) {
  await throttleLogin();
  await page.goto("/login");
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator("button.login-submit").click();
}

// ---- navigation ----
/** Client-side navigation: keeps the memory-only session where the sidebar has no direct link. */
export async function push(page: Page, url: string) {
  await page.evaluate((target) => (window as Window & { next: { router: { push: (url: string) => void } } }).next.router.push(target), url);
  const pathname = url.split("?")[0];
  await page.waitForURL((u) => u.pathname === pathname, { timeout: 30_000 });
  await ready(page);
}
export function menuLink(page: Page, label: string | RegExp) {
  return page.locator("nav a:visible, aside a:visible").filter({ hasText: label }).first();
}
/** Leave the current route so the page refetches; pushing the same route keeps its loaded data. */
export async function fresh(page: Page, url: string) {
  await push(page, `/${new URL(page.url()).pathname.split("/")[1]}`);
  await push(page, url);
}
export async function menu(page: Page, label: string | RegExp) {
  // A detail modal covers the sidebar; a person would close it first.
  if (await page.locator('[class*="modal" i]:visible').count()) await push(page, `/${new URL(page.url()).pathname.split("/")[1]}`);
  const link = menuLink(page, label);
  const target = new URL((await link.getAttribute("href")) ?? "", page.url());
  await link.click();
  // A screenshot taken before the route changes would show the previous page as evidence.
  await page.waitForURL((u) => u.pathname === target.pathname && u.search === target.search, { timeout: 60_000 });
  await ready(page);
}
const BUSY = "กำลังโหลด|กำลังตรวจสถานะ|กำลังเปิด|กำลังคำนวณ|กำลังอัปโหลด|กำลังบันทึก";
export async function ready(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => {});
  await page.waitForFunction((source) => {
    const re = new RegExp(source);
    if (document.querySelector('[aria-busy="true"]')) return false;
    return ![...document.querySelectorAll('[role="status"]')].some((el) => re.test(el.textContent ?? "") || re.test(el.getAttribute("aria-label") ?? ""));
  }, BUSY, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(250);
}

// ---- capture ----
async function compose(browser: Browser, png: Buffer, url: string, file: string) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 934 }, deviceScaleFactor: 2 });
  const safe = url.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#fff}
    .bar{height:34px;display:flex;align-items:center;gap:8px;padding:0 12px;background:#e8eaed;border-bottom:1px solid #c6c9ce;font:13px/1 "Segoe UI",Tahoma,sans-serif;color:#202124}
    .dots{display:flex;gap:5px}.dots i{width:9px;height:9px;border-radius:50%;background:#b3b7bd;display:block}
    .url{flex:1;background:#fff;border-radius:12px;padding:5px 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    img{display:block;width:1440px;height:900px}</style>
    <div class="bar"><div class="dots"><i></i><i></i><i></i></div><div class="url">${safe}</div></div>
    <img src="data:image/png;base64,${png.toString("base64")}">`);
  await page.locator("img").evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({ path: file });
  await page.close();
}
export type ShotOptions = { highlight?: Locator | Locator[]; check?: () => Promise<void>; status?: Status; note?: string; role?: string; expected?: string; settle?: boolean; n?: number };

export class UC {
  readonly no: number; readonly browser: Browser; readonly name: string;
  role = "";
  private current = "";
  private failed = new Set<string>();
  private errors = 0;
  constructor(no: number, browser: Browser) { this.no = no; this.browser = browser; this.name = GUIDE[no - 1].title; }

  /** Start from an empty folder and drop this UC's previous rows, so a rerun can't leave stale evidence. */
  reset() {
    const dir = path.join(SHOTS, DIRS[this.no]);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    writeManifest(readManifest().filter((row) => row.uc !== `UC${this.no}`));
  }
  private expected(step: string) {
    const index = Number(step.slice(1)) - 1;
    const uc = GUIDE[this.no - 1];
    return step[0] === "S" ? clean(uc.steps[index]?.[1] ?? "") : clean(uc.neg[index] ?? "");
  }
  /** Runs one guide step. An exception (button gone, navigation failed) becomes FAIL with a screenshot, then the run goes on. */
  async step(step: string, page: Page, role: string, body: () => Promise<void>) {
    this.current = step;
    this.role = role;
    try { await body(); }
    catch (error) {
      const note = String((error as Error).message).replace(/\u001b\[[0-9;]*m/g, "").split("\n").slice(0, 12).join(" ").replace(/\s+/g, " ").slice(0, 700);
      await this.capture(page, `${step}-X${++this.errors}`, "error-state", `ขั้นตอน ${step} ทำต่อไม่ได้`, "exception", { status: "FAIL", note, settle: false }).catch((e) => console.log("capture failed", e));
    }
    this.current = "";
  }
  private async capture(page: Page, tag: string, slug: string, caption: string, kind: string, options: ShotOptions) {
    const step = tag.split("-")[0];
    const file = `${DIRS[this.no]}/UC${pad(this.no)}-${tag}_${slug}.png`;
    const target = path.join(SHOTS, file);
    if (options.settle !== false) await ready(page);
    let status: Status = options.status ?? "PASS";
    let note = options.note ?? "";
    if (options.check) {
      try { await options.check(); }
      catch (error) {
        status = "FAIL";
        const message = String((error as Error).message).replace(/\u001b\[[0-9;]*m/g, "");
        note = [note, message.split("\n").slice(0, 6).join(" ").replace(/\s+/g, " ").slice(0, 400)].filter(Boolean).join(" | ");
      }
    }
    if (status === "FAIL") this.failed.add(step);
    const marks = options.highlight ? (Array.isArray(options.highlight) ? options.highlight : [options.highlight]) : [];
    for (const mark of marks) {
      await mark.first().evaluate((el: HTMLElement) => el.scrollIntoView({ block: "center", inline: "nearest" }), undefined, { timeout: 5_000 }).catch(() => {});
      await mark.first().evaluate((el: HTMLElement) => { el.dataset.ucOutline = el.style.outline; el.dataset.ucOffset = el.style.outlineOffset; el.style.outline = "3px solid #e11d1d"; el.style.outlineOffset = "2px"; }, undefined, { timeout: 5_000 }).catch(() => {});
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const png = await page.screenshot({ animations: "disabled" });
    for (const mark of marks) await mark.first().evaluate((el: HTMLElement) => { el.style.outline = el.dataset.ucOutline ?? ""; el.style.outlineOffset = el.dataset.ucOffset ?? ""; delete el.dataset.ucOutline; delete el.dataset.ucOffset; }, undefined, { timeout: 5_000 }).catch(() => {});
    await compose(this.browser, png, page.url(), target);
    const current = new URL(page.url());
    record({ file, uc: `UC${this.no}`, uc_name: this.name, step, kind, role: options.role ?? this.role, url: current.pathname + current.search, caption_th: caption, expected_th: options.expected ?? this.expected(step), status, note });
  }
  /** Action shot; n numbers extra shots (A1, A2...). */
  A(page: Page, slug: string, caption: string, options: ShotOptions = {}) { return this.capture(page, `${this.current}-A${options.n ?? ""}`, slug, caption, "action", options); }
  R(page: Page, slug: string, caption: string, options: ShotOptions = {}) { return this.capture(page, `${this.current}-R${options.n ?? ""}`, slug, caption, "result", options); }
  /** Negative-case shot (no -A/-R suffix unless numbered). */
  N(page: Page, slug: string, caption: string, options: ShotOptions = {}) { return this.capture(page, `${this.current}${options.n ? `-${options.n}` : ""}`, slug, caption, "negative", options); }
  /** A guide step that could not be exercised; no picture exists, the reason goes to the results. */
  skip(step: string, caption: string, note: string, role = "") {
    record({ file: "", uc: `UC${this.no}`, uc_name: this.name, step, kind: step[0] === "N" ? "negative" : "result", role, url: "", caption_th: caption, expected_th: this.expected(step), status: "SKIP", note });
  }
  hasFailed(step: string) { return this.failed.has(step); }
}

/** Visible text of the whole page, whitespace-collapsed, for "must not show" assertions. */
export async function pageText(page: Page) { return (await page.locator("body").innerText()).replace(/\s+/g, " "); }
export const stamp = () => Date.now().toString(36).slice(-5);
