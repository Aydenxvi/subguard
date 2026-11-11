import { test, expect } from "@playwright/test";

test("static preview supports navigation and local edits without API calls", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) apiCalls.push(request.url());
  });
  await page.goto("./");
  await expect(page.getByRole("note")).toContainText("Portfolio preview");
  await page.getByRole("button", { name: "Explore the preview" }).click();
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
  await page.getByRole("button", { name: "Explore the preview" }).click();
  await page.locator(".mobile-nav").getByRole("button", { name: "Refund assistant" }).click();
  await expect(page.getByText("Example duplicate charge")).toBeVisible();
  await page.getByRole("button", { name: /message/i }).click();
  await expect(page.locator("dialog[open] textarea")).toContainText("Example duplicate charge");
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
});

test("sample CSV can be previewed and imported within the browser tab", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Explore the preview" }).click();
  await page.locator(".sidebar nav").getByRole("button", { name: "Subscriptions" }).click();
  await page.getByRole("button", { name: "Import CSV" }).click();
  const dialog = page.locator("dialog.csv-dialog[open]");
  await dialog.locator('input[type="file"]').setInputFiles("../downloads/subscriptions_example.csv");
  await dialog.getByRole("button", { name: "Preview" }).click();
  await expect(dialog.getByRole("row")).toHaveCount(5);
  await dialog.getByRole("button", { name: "Import selected rows" }).click();
  await expect(dialog.getByRole("status")).toContainText("Import complete: 4");
});
