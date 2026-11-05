import { expect, type Page } from "@playwright/test";

export const ROLE_ROOT = {
  "pim.admin": "/admin",
  "anan.staff": "/staff",
  "kittipong.staff": "/staff",
  "nida.company": "/customer",
  "ploy.company": "/customer",
  somchai: "/customer",
} as const;
export type TestUsername = keyof typeof ROLE_ROOT;

const PICKER = "บัญชีทดสอบ Local · เข้าสู่ระบบทันที";

/** Signs in through the real local-test buttons. The session lives only in page memory. */
export async function loginAs(page: Page, username: TestUsername) {
  await page.goto("/login");
  await page.locator("summary", { hasText: PICKER }).click();
  await page.locator(".auth-account-list button", { hasText: username }).click();
  await expect(page).toHaveURL(new RegExp(`${ROLE_ROOT[username]}(/|$)`));
}
