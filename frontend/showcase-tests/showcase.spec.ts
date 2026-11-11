import { test, expect } from "@playwright/test";

test("static preview supports navigation and local edits without API calls", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) apiCalls.push(request.url());
  });
  await page.goto("./");
  await expect(page.getByRole("note")).toContainText("Portfolio preview");
  await page.locator(".hero-actions").getByRole("button", { name: "Explore the preview" }).click();
  await expect(page.getByText("Cinema Club").first()).toBeVisible();
  await page.locator(".sidebar nav").getByRole("button", { name: "Subscriptions" }).click();
  await page.getByRole("button", { name: "Add subscription" }).click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByLabel("Name").fill("Portfolio Sample");
  await dialog.getByLabel("Amount").fill("12.50");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Portfolio Sample").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Portfolio Sample").first()).toBeVisible();
  await page.locator(".sidebar nav").getByRole("button", { name: "Insights" }).click();
  await expect(page.getByText("Portfolio Sample").first()).toBeVisible();
  expect(apiCalls).toEqual([]);
});

test("mobile preview shows the same pages and refund draft", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.locator(".hero-actions").getByRole("button", { name: "Explore the preview" }).click();
  await page.locator(".mobile-nav").getByRole("button", { name: "Refund assistant" }).click();
  await expect(page.getByText("Example duplicate charge")).toBeVisible();
  await page.getByRole("button", { name: /message/i }).click();
  await expect(page.locator("dialog[open] textarea")).toContainText("Example duplicate charge");
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
});

test("sample CSV can be previewed and imported within the browser tab", async ({ page }) => {
  await page.goto("./");
  await page.locator(".hero-actions").getByRole("button", { name: "Explore the preview" }).click();
  await page.locator(".sidebar nav").getByRole("button", { name: "Subscriptions" }).click();
  await page.getByRole("button", { name: "Import CSV" }).click();
  const dialog = page.locator("dialog.csv-dialog[open]");
  await dialog.locator('input[type="file"]').setInputFiles("../downloads/subscriptions_example.csv");
  await dialog.getByRole("button", { name: "Preview" }).click();
  await expect(dialog.getByRole("row")).toHaveCount(5);
  await dialog.getByRole("button", { name: "Import selected rows" }).click();
  await expect(dialog.getByRole("status")).toContainText("Import complete: 4");
});

test("landing explains the route and simulated bot opens the app preview", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "How to explore SubGuard" })).toBeVisible();
  await page.getByRole("button", { name: "Try the bot flow" }).last().click();
  const bot = page.getByRole("dialog", { name: "Telegram bot preview" });
  await expect(bot.getByRole("note")).toContainText("no message is sent to Telegram");
  await bot.getByRole("button", { name: "/stop" }).click();
  await expect(bot.getByText("Reminders paused.")).toBeVisible();
  await bot.getByRole("button", { name: "/reminders" }).click();
  await expect(bot.getByText(/Reminders enabled/)).toBeVisible();
  await bot.getByRole("button", { name: "Open Mini App preview" }).first().click();
  await expect(page.getByText("Cinema Club").first()).toBeVisible();
});

test("bot preview has a shareable direct link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#bot");
  const bot = page.getByRole("dialog", { name: "Telegram bot preview" });
  await expect(bot).toBeVisible();
  await expect(bot.getByRole("button", { name: "/app" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await bot.getByRole("button", { name: "Close bot preview" }).click();
  await expect(page).toHaveURL(/\/subguard\/$/);
});

test("gallery shows all owner screenshots and opens their full-size files", async ({ page }) => {
  await page.goto("./#gallery");
  const gallery = page.locator("#gallery");
  await expect(gallery.getByRole("link")).toHaveCount(14);
  await expect(gallery.getByRole("heading", { name: "Desktop · English" })).toBeVisible();
  await expect(gallery.getByRole("heading", { name: "Mobile · Russian" })).toBeVisible();
  for (const image of await gallery.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  const first = gallery.getByRole("link").first();
  await expect(first).toHaveAttribute("href", /\/subguard\/gallery\/desktop-en-landing\.png$/);
  await expect(first).toHaveAttribute("target", "_blank");
});
