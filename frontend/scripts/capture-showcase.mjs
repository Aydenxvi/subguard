import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../../docs/screenshots/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1, locale: "ru-RU" });
  await page.addInitScript(() => localStorage.setItem("subguard.locale", "ru"));
  await page.goto(process.env.SHOWCASE_URL || "http://127.0.0.1:4173/subguard/");
  await page.locator(".hero-actions .primary").waitFor();
  await page.screenshot({ path: output + "portfolio-cover-ru.png", animations: "disabled" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: output + "showcase-landing-ru.png", fullPage: true, animations: "disabled" });
  await page.locator(".hero-actions .secondary").click();
  await page.locator("dialog.bot-preview-dialog[open]").screenshot({ path: output + "showcase-bot-simulation-ru.png", animations: "disabled" });
  await page.getByRole("dialog").getByRole("button", { name: "Закрыть пример бота" }).click();
  await page.locator(".hero-actions .primary").click();
  await page.locator(".page-heading h1").waitFor();
  await page.screenshot({ path: output + "showcase-desktop-ru.png", animations: "disabled" });
  const nav = page.locator(".sidebar nav");
  await nav.getByRole("button", { name: "Подписки" }).click();
  await page.getByRole("heading", { name: "Подписки" }).waitFor();
  await page.screenshot({ path: output + "showcase-subscriptions-ru.png", animations: "disabled" });
  await page.locator(".sub-title .text-button").filter({ hasText: "Language Studio" }).click();
  await page.locator("dialog[open]").evaluate((dialog) => { dialog.style.maxHeight = "none"; dialog.style.overflow = "visible"; });
  await page.locator("dialog[open]").screenshot({ path: output + "showcase-trial-form-ru.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await nav.getByRole("button", { name: "Помощник возврата" }).click();
  await page.getByRole("heading", { name: "Помощник возврата" }).waitFor();
  await page.screenshot({ path: output + "showcase-refunds-ru.png", animations: "disabled" });
  await nav.getByRole("button", { name: "Аналитика" }).click();
  await page.getByRole("heading", { name: "Аналитика" }).waitFor();
  await page.screenshot({ path: output + "showcase-analytics-ru.png", animations: "disabled" });
  await nav.getByRole("button", { name: "Обзор" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: output + "showcase-mobile-ru.png", animations: "disabled" });
} finally {
  await browser.close();
}
