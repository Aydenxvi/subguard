import { test, expect } from "@playwright/test";

test("CSV preview, mapping, selection and duplicate prevention", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the live demo" }).click();
  await page
    .getByRole("navigation")
    .first()
    .getByRole("button", { name: "Subscriptions", exact: true })
    .click();
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const content =
    "Название;Сумма;Валюта;Цикл;Дата\nCSV Studio;12,50;EUR;monthly;2026-12-01\nCSV Studio;12,50;EUR;monthly;2026-12-01\nBroken;-1;EUR;monthly;2026-12-01\n";
  await dialog
    .getByLabel("Choose CSV file")
    .setInputFiles({
      name: "subscriptions.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(content),
    });
  for (const [label, col] of [
    ["Subscription name", "Название"],
    ["Amount (major units)", "Сумма"],
    ["Currency", "Валюта"],
    ["Billing cycle", "Цикл"],
    ["First billing date", "Дата"],
  ])
    await dialog
      .getByRole("combobox", { name: label, exact: true })
      .selectOption(col);
  await dialog.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    dialog.getByText("Already present / repeated", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Check this row", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Import selected rows (1)" })
    .click();
  await expect(dialog.getByRole("status")).toContainText("Import complete: 1");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "CSV Studio", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await dialog
    .getByLabel("Choose CSV file")
    .setInputFiles({
      name: "again.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "name,amount,currency,interval,anchor_date\nCSV Studio,12.50,EUR,monthly,2026-12-01\n",
      ),
    });
  await dialog.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Import selected rows (0)" }),
  ).toBeDisabled();
});

test("Russian trial form synchronizes dates and warns about a late cancellation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the live demo" }).click();
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("ru");
  await page
    .getByRole("button", { name: "Добавить подписку", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Название", { exact: true }).fill("Проверка дат");
  await dialog.getByLabel("Сумма", { exact: true }).fill("100,50");
  await dialog
    .getByLabel("Дата первого платежа", { exact: true })
    .fill("2026-11-10");
  await dialog
    .getByRole("checkbox", { name: "Пробный период", exact: true })
    .check();
  await expect(
    dialog.getByRole("combobox", { name: "Статус", exact: true }),
  ).toHaveValue("trial");
  await dialog
    .getByLabel("Конец пробного периода", { exact: true })
    .fill("2026-12-10");
  await expect(
    dialog.getByLabel("Дата первого платежа", { exact: true }),
  ).toHaveValue("2026-12-10");
  await dialog.getByLabel("Отменить до", { exact: true }).fill("2026-12-11");
  await expect(dialog.getByRole("status")).toContainText(
    "позже первого списания",
  );
  await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .first()
    .getByRole("button", { name: "Подписки", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Проверка дат", exact: true }),
  ).toBeVisible();
});

test("blue identity, reduced motion and mobile import dialog", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the live demo" }).click();
  await expect(page.locator(".page")).toHaveCSS("animation-name", "none");
  await expect(
    page.getByRole("button", { name: "Add subscription", exact: true }),
  ).toHaveCSS("background-color", "rgb(40, 100, 237)");
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Subscriptions", exact: true })
    .click();
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("animation-name", "none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
