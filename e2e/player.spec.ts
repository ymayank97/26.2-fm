import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * These specs cover the unconfigured state, which is what ships until a real
 * playlist ID is pasted in. Playback itself cannot be asserted here without a
 * live public playlist and network access to YouTube; that is verified by hand
 * once the playlist exists.
 */

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.push(msg.text());
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
  return problems;
}

test("renders the shell with no playlist configured", async ({ page }) => {
  const problems = collectProblems(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /26\.2/ })).toBeVisible();
  await expect(page.getByText("The Spokane Marathon")).toBeVisible();
  await expect(page.getByText("10.11.26")).toBeVisible();

  // Clear, actionable setup state rather than a dead player.
  await expect(page.getByTestId("setup-notice")).toBeVisible();
  await expect(page.getByText("No playlist set yet.")).toBeVisible();

  // No iframe should be mounted when there is nothing to play.
  await expect(page.locator("iframe")).toHaveCount(0);

  // The ambient background always paints, so the page is never blank.
  await expect(page.getByTestId("background")).toBeAttached();

  const visible = await page.locator("main").innerText();
  expect(visible).not.toContain("undefined");
  expect(visible).not.toContain("null");

  expect(problems, `console problems:\n${problems.join("\n")}`).toHaveLength(0);
});

test("has no horizontal overflow on a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
