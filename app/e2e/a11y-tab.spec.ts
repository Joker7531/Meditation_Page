import { test, expect } from "@playwright/test";

function outlineNotNone(outlineStyle: string | null) {
  if (!outlineStyle) return false;
  return outlineStyle !== "none" && outlineStyle !== "0px" && outlineStyle !== "0px none";
}

test.describe("Step 6.1 keyboard navigation", () => {
  test("Landing: Tab reaches presets, custom input, Start", async ({ page }) => {
    await page.goto("/");

    // Start tabbing from the top.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "5 min", exact: true })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "10 min", exact: true })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "15 min", exact: true })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Custom (1–60 minutes)")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Start" })).toBeFocused();

    // Focus visibility (heuristic): either outline is set or focus ring (box-shadow) exists.
    const styles = await page.getByRole("button", { name: "Start" }).evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { outlineStyle: cs.outlineStyle, boxShadow: cs.boxShadow };
    });
    const hasOutline = outlineNotNone(styles.outlineStyle);
    const hasRing = Boolean(styles.boxShadow && styles.boxShadow !== "none");
    expect(hasOutline || hasRing).toBeTruthy();
  });

  test("Meditation: Tab reaches controls", async ({ page }) => {
    await page.goto("/meditation?durationMin=10&__testDurationSec=60&__testSeed=1");

    // keep chrome visible before tabbing
    await page.mouse.move(10, 10);

    await page.getByRole("button", { name: /Pause|Resume/ }).focus();
    await expect(page.getByRole("button", { name: /Pause|Resume/ })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "End" })).toBeFocused();
  });

  test("Completion: Tab reaches 再来一次 and 返回首页", async ({ page }) => {
    await page.goto("/completion?elapsedActiveSec=1&targetDurationSec=10&endReason=normal");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "再来一次" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "返回首页" })).toBeFocused();
  });
});
