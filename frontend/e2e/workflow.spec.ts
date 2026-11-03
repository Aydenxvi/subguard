import { test, expect } from "@playwright/test";
test("demo CRUD, payments, cancellation, refund, localization and reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the live demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Your money, on your terms." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add subscription", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Browser test");
  await dialog.getByLabel("Amount", { exact: true }).fill("19.99");
  await dialog.getByLabel("Currency", { exact: true }).selectOption("USD");
  await dialog.getByLabel("First billing date").fill("2026-12-31");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .first()
    .getByRole("button", { name: "Subscriptions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Browser test", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your money, on your terms." }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .first()
    .getByRole("button", { name: "Subscriptions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record a payment Browser test" })
    .click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .first()
    .getByRole("button", { name: "Insights", exact: true })
    .click();
  await expect(page.getByText("Browser test").first()).toBeVisible();
  await page
    .getByRole("navigation")
    .first()
    .getByRole("button", { name: "Protection", exact: true })
    .click();
  await page
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: "Browser test", exact: true }),
    })
    .getByRole("button", { name: "Track cancellation" })
    .click();
  await dialog.getByLabel("Status", { exact: true }).selectOption("confirmed");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .first()
    .getByRole("button", { name: "Refund assistant", exact: true })
    .click();
  await page.getByRole("button", { name: "New refund case" }).click();
  await dialog.getByLabel("Case title").fill("Accidental renewal");
  await dialog.getByLabel("Amount", { exact: true }).fill("19.99");
  await dialog
    .getByLabel("What happened?")
    .fill("I forgot to cancel the trial.");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Prepare message" }).click();
  await expect(
    dialog.getByRole("textbox", { name: "Prepare message" }),
  ).toHaveValue(/forgot to cancel/);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("ru");
  await expect(
    page.getByRole("heading", { name: "Помощник возврата", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Язык", exact: true })
    .selectOption("tr");
  await expect(
    page.getByRole("heading", { name: "İade asistanı", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Dil", exact: true })
    .selectOption("en");
  await page
    .getByRole("navigation")
    .first()
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByLabel("Timezone", { exact: true }).fill("Europe/Istanbul");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Your money, on your terms." }),
  ).toBeVisible();
});
test("mobile layout and keyboard-accessible forms", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the live demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Your money, on your terms." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Subscriptions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add subscription", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test('edit a trial and delete it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the live demo' }).click();
  await page.getByRole('heading', { name: 'Your money, on your terms.' }).waitFor();
  await page.getByRole('navigation').first().getByRole('button', { name: 'Subscriptions', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Language Studio', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill('Trial updated');
  await dialog.getByLabel('Amount', { exact: true }).fill('299.99');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Edit Trial updated', exact: true }).click();
  await expect(dialog.getByLabel('Amount', { exact: true })).toHaveValue('299.99');
  await expect(dialog.getByLabel('Free trial', { exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Delete Trial updated', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Trial updated', exact: true })).toHaveCount(0);
});
