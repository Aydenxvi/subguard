import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: process.env.E2E_URL || "http://127.0.0.1:5173",
    headless: true,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    screenshot: "only-on-failure",
  },
  workers: 1,
  reporter: "list",
});
