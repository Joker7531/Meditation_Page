import { test, expect } from "@playwright/test";

// Step 4.2: phase text switching with tolerance (avoid ms-precise asserts)

test.describe("Meditation phase text windows", () => {
  test("shows Hold around 4-11s and Breathe out around 11-19s", async ({ page }) => {
    await page.goto("/meditation?durationMin=10&__testDurationSec=60&__testSeed=1");
    await page.mouse.move(10, 10);

    // Wait until we are likely within hold window.
    await page.waitForTimeout(5200);
    await expect(page.getByTestId("phase-text")).toHaveText(/Hold/);

    // Wait until we are likely within exhale window.
    await page.waitForTimeout(7000);
    await expect(page.getByTestId("phase-text")).toHaveText(/Breathe out/);
  });
});
