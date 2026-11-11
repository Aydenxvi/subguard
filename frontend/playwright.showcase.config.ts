import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "showcase-tests",
  use: {
    baseURL: "http://127.0.0.1:4173/subguard/",
    headless: true,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  workers: 1,
  reporter: "list",
});
