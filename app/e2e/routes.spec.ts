import { test, expect } from "@playwright/test";

test("/ returns 200 and shows Landing", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Landing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  await expect(page.getByLabel("Custom (1–60 minutes)")).toBeVisible();
});

test("/meditation returns 200 and shows Meditation", async ({ page }) => {
  const res = await page.goto("/meditation?durationMin=10&__testDurationSec=1&__testSeed=1");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Meditation" })).toBeVisible();
});

test("/completion returns 200 and shows completion UI", async ({ page }) => {
  const res = await page.goto("/completion?elapsedActiveSec=5&targetDurationSec=10&endReason=early");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Ended early" })).toBeVisible();
  await expect(page.getByText("提前结束")).toBeVisible();
});
