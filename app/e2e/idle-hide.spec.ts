import { test, expect } from "@playwright/test";

test.describe("Meditation idle hide", () => {
  test("chrome fades after 3s idle but center text remains", async ({ page }) => {
    await page.goto("/meditation?durationMin=10&__testDurationSec=60&__testSeed=1");

    const controls = page.getByLabel("Controls");
    const centerText = page.getByTestId("phase-text");

    await expect(controls).toBeVisible();
    await expect(centerText).toBeVisible();

    // Wait for idle hide deadline + transition.
    await page.waitForTimeout(3700);

    const opacity = await controls.evaluate((el) =>
      Number(window.getComputedStyle(el).opacity),
    );
    expect(opacity).toBeLessThanOrEqual(0.05);

    await expect(centerText).toBeVisible();

    // User activity shows chrome again.
    await page.mouse.move(10, 10);

    await expect
      .poll(async () => {
        return await controls.evaluate((el) =>
          Number(window.getComputedStyle(el).opacity),
        );
      })
      .toBeGreaterThan(0.9);
  });
});
