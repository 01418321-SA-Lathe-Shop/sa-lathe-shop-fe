import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  outputDir: "./test-results",
  reporter: [["list"]],
  use: {
    baseURL: process.env.UC_BASE_URL ?? "http://localhost:3100",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    actionTimeout: 20_000,
    navigationTimeout: 180_000,
  },
});
