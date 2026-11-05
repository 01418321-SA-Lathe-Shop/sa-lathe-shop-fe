import { test, expect } from "@playwright/test";
import { loginAs, ROLE_ROOT, type TestUsername } from "./helpers/auth";

const users = Object.keys(ROLE_ROOT) as TestUsername[];
for (const user of ["pim.admin", "anan.staff", "somchai"] as TestUsername[]) {
  test(`login + nav: ${user}`, async ({ page }) => {
    const api: string[] = [];
    page.on("response", (r) => { if (r.url().includes(":8080")) api.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
    await loginAs(page, user);
    await page.waitForLoadState("networkidle");
    const links = await page.locator("a[href^='/']").evaluateAll((a) => [...new Set(a.map((x) => `${x.getAttribute("href")} = ${(x.textContent || "").trim().slice(0, 30)}`))]);
    console.log(user, "API", api.join(" | "));
    console.log(user, "LINKS", links.join(" | "));
    await expect(page.locator("summary:visible", { hasText: "สลับบัญชีทดสอบ" }).first()).toBeVisible();
  });
}

test("customer typed URL and client-side push to staff route", async ({ page }) => {
  await loginAs(page, "somchai");
  await page.waitForLoadState("networkidle");
  // Client-side navigation keeps the in-memory session, so it exercises the role guard itself.
  await page.evaluate(() => (window as any).next.router.push("/staff/materials"));
  await page.waitForTimeout(4000);
  console.log("PUSH", page.url(), "|", (await page.locator("main, body").first().innerText()).replace(/\s+/g, " ").slice(0, 200));
  // A typed URL is a full reload and drops the memory-only session.
  await page.goto("/staff/materials");
  await page.waitForTimeout(4000);
  console.log("TYPED", page.url(), "|", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));
});

test("simulated backend down (no business data, backend untouched)", async ({ page }) => {
  await page.route("http://localhost:8080/**", (r) => r.abort());
  await page.goto("/login");
  await page.locator("summary", { hasText: "บัญชีทดสอบ Local" }).click();
  await page.locator(".auth-account-list button", { hasText: "somchai" }).click();
  await page.waitForTimeout(2500);
  console.log("DOWN", page.url(), "|", (await page.locator("[role=alert]").allInnerTexts()).join(" / "));
  console.log("users", users.length);
});
