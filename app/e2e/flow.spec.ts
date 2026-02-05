import { test, expect } from "@playwright/test";

test.describe("3-page MVP flow", () => {
  test("Landing preset selection navigates with durationMin", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "5 min", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();

    await page.getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/meditation\?durationMin=5/);
    await expect(page.getByRole("heading", { name: "Meditation" })).toBeVisible();
  });

  test("Landing custom invalid shows error and disables Start", async ({ page }) => {
    await page.goto("/");

    const input = page.getByLabel("Custom (1–60 minutes)");
    await input.fill("0");
    await input.blur();

    await expect(page.getByText("请输入 1-60 之间的整数")).toBeVisible();

    await expect(page.getByRole("button", { name: "Start" })).toBeDisabled();
  });

  test("Meditation pause freezes elapsed; resume increases", async ({ page }) => {
    await page.goto("/meditation?durationMin=10&__testDurationSec=60&__testSeed=1");

    const elapsed = page.getByLabel("elapsed-seconds");
    await expect(elapsed).toHaveText(/\d+/);

    await page.getByRole("button", { name: "Pause" }).click();
    const frozen = await elapsed.textContent();

    await page.waitForTimeout(250);
    await expect(elapsed).toHaveText(frozen ?? "0");

    await page.getByRole("button", { name: "Resume" }).click();
    await page.waitForTimeout(250);

    const after = Number(await elapsed.textContent());
    const before = Number(frozen);
    expect(after).toBeGreaterThanOrEqual(before);
  });

  test("Meditation restart resets elapsed and phase label", async ({ page }) => {
    await page.goto("/meditation?durationMin=10&__testDurationSec=60&__testSeed=1");
    await page.mouse.move(10, 10);

    const elapsed = page.getByLabel("elapsed-seconds");
    await page.waitForTimeout(250);

    await page.getByRole("button", { name: "Restart" }).click();
    await expect(elapsed).toHaveText("0");
    await expect(page.getByTestId("phase-text")).toHaveText("Breathe in");
  });

  test("End navigates to completion with early reason and dual info", async ({ page }) => {
    await page.goto("/meditation?durationMin=10&__testDurationSec=60&__testSeed=1");
    await page.mouse.move(10, 10);

    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "End" }).click();

    await expect(page).toHaveURL(/\/completion/);
    await expect(page.getByRole("heading", { name: "Ended early" })).toBeVisible();
    await expect(page.getByText("提前结束")).toBeVisible();
    await expect(page.getByLabel("completed-cycles")).toBeVisible();
  });

  test("Auto-complete with __testDurationSec navigates and shows normal completion", async ({ page }) => {
    await page.goto("/meditation?durationMin=10&__testDurationSec=1&__testSeed=1");

    await expect(page).toHaveURL(/\/completion/);
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible();
    await expect(page.getByLabel("completed-cycles")).toBeVisible();
  });

  test("Completion actions: 再来一次 keeps last duration, 返回首页 clears", async ({ page }) => {
    await page.goto("/meditation?durationMin=5&__testDurationSec=1");
    await expect(page).toHaveURL(/\/completion/);

    await page.getByRole("button", { name: "再来一次" }).click();
    await expect(page).toHaveURL(/\/meditation\?durationMin=5/);

    await page.goto("/completion?elapsedActiveSec=1&targetDurationSec=10&endReason=normal");
    await page.getByRole("button", { name: "返回首页" }).click();
    await expect(page).toHaveURL("/");
  });
});
