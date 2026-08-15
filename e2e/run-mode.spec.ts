import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { chapters } from "@/data/chapters";
import { getChapterForMile, isWallMode } from "@/lib/pace";

/**
 * These specs assert an invariant rather than racing the clock to exact
 * timestamps: at every sampled instant, the chapter and Wall Mode shown must
 * agree with what the pure pace math says for the mile shown at that same
 * instant. That holds regardless of when sampling happens, so the suite does
 * not get flaky on a loaded machine.
 *
 * All chapters ship with zero tracks, so no YouTube iframe ever mounts and the
 * suite needs no network access.
 */

const TARGET = "1:30"; // 90 minutes, the shortest accepted target
const FAST = 500; // ?speed=500 replays the whole marathon in ~10.8s

type Sample = { mile: number; chapter: string; wall: boolean; status: string };

/** Reads every value in a single evaluate so they come from one render. */
async function sample(page: Page): Promise<Sample> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="app-root"]')!;
    const chapter = document.querySelector<HTMLElement>('[data-testid="chapter-name"]');
    return {
      mile: Number(root.dataset.mile),
      chapter: chapter?.textContent?.trim() ?? "",
      wall: root.dataset.wall === "true",
      status: root.dataset.status ?? "",
    };
  });
}

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.push(msg.text());
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
  return problems;
}

/** Hydration mismatches surface as warnings, not thrown errors. */
function hydrationProblems(problems: string[]) {
  return problems.filter((p) => /hydrat|did not match|server.*client|Warning:/i.test(p));
}

async function startRun(page: Page, speed: number) {
  await page.goto(`/?speed=${speed}`);
  await page.fill("#target", TARGET);
  await page.getByRole("button", { name: "Start run" }).click();
  await expect(page.locator('[data-testid="app-root"]')).toHaveAttribute(
    "data-status",
    /running|finished/,
  );
}

test.describe("landing", () => {
  test("renders every chapter with zero tracks and no console errors", async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /26\.2/ })).toBeVisible();
    await expect(page.getByText("The Spokane Marathon")).toBeVisible();
    await expect(page.getByText("10.11.26")).toBeVisible();

    // Both empty states, since no chapter has tracks yet.
    await expect(page.getByText("No tracks in this chapter yet")).toBeVisible();
    await expect(page.getByText("No tracks yet")).toBeVisible();

    for (const chapter of chapters) {
      await expect(page.getByRole("button", { name: new RegExp(chapter.name) })).toBeVisible();
    }

    // Transport controls are disabled with nothing to play.
    await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Next track" })).toBeDisabled();

    // innerText of the app root only - textContent("body") would sweep in Next's
    // RSC script payload, which legitimately contains the string "$undefined".
    const visible = await page.getByTestId("app-root").innerText();
    expect(visible).not.toContain("undefined");
    expect(visible).not.toContain("NaN");

    expect(problems, `console problems:\n${problems.join("\n")}`).toHaveLength(0);
  });

  test("rejects an out-of-range target time", async ({ page }) => {
    await page.goto("/");
    await page.fill("#target", "0:45"); // below the 1:30 minimum
    await expect(page.getByRole("button", { name: "Start run" })).toBeDisabled();

    await page.fill("#target", TARGET);
    await expect(page.getByRole("button", { name: "Start run" })).toBeEnabled();
  });
});

test.describe("run mode", () => {
  test("chapter and Wall Mode always agree with the mile", async ({ page }) => {
    const problems = collectProblems(page);
    await startRun(page, FAST);

    const samples: Sample[] = [];
    const deadline = Date.now() + 45_000;
    let last: Sample | null = null;

    while (Date.now() < deadline) {
      const s = await sample(page);
      samples.push(s);
      last = s;
      if (s.status === "finished") break;
      await page.waitForTimeout(80);
    }

    expect(samples.length, "expected multiple samples").toBeGreaterThan(5);

    // The invariant: display always matches the pure math for that same mile.
    for (const s of samples) {
      expect(s.chapter, `chapter wrong at mile ${s.mile}`).toBe(
        getChapterForMile(s.mile).name,
      );
      expect(s.wall, `wall mode wrong at mile ${s.mile}`).toBe(isWallMode(s.mile));
    }

    // Mile never runs backwards.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].mile).toBeGreaterThanOrEqual(samples[i - 1].mile - 1e-6);
    }

    // Every chapter is entered, in course order.
    const seen: string[] = [];
    for (const s of samples) {
      if (seen[seen.length - 1] !== s.chapter) seen.push(s.chapter);
    }
    expect(seen).toEqual(chapters.map((c) => c.name));

    // Wall Mode is actually reached, and its banner renders.
    expect(samples.some((s) => s.wall), "Wall Mode never engaged").toBe(true);

    // The run finishes cleanly at exactly 26.2.
    expect(last?.status).toBe("finished");
    expect(last?.mile).toBeCloseTo(26.2, 3);
    expect(last?.chapter).toBe("Finish Line");
    await expect(page.getByTestId("stat-mile")).toHaveText("26.20");

    expect(
      hydrationProblems(problems),
      `hydration problems:\n${problems.join("\n")}`,
    ).toHaveLength(0);
  });

  test("pause freezes the clock and resume restarts it", async ({ page }) => {
    await startRun(page, 60);
    await page.waitForTimeout(1200);

    await page.getByRole("button", { name: "Pause run" }).click();
    await expect(page.locator('[data-testid="app-root"]')).toHaveAttribute(
      "data-status",
      "paused",
    );

    const paused = await sample(page);
    expect(paused.mile).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    const stillPaused = await sample(page);
    expect(stillPaused.mile).toBeCloseTo(paused.mile, 6);

    await page.getByRole("button", { name: "Resume run" }).click();
    await page.waitForTimeout(1200);
    const resumed = await sample(page);
    expect(resumed.mile).toBeGreaterThan(paused.mile);
  });
});

test.describe("persistence", () => {
  test("a mid-run reload resumes without hydration warnings", async ({ page }) => {
    await startRun(page, 60);
    await page.waitForTimeout(1500);

    const before = await sample(page);
    expect(before.mile).toBeGreaterThan(0);

    // Listeners attach after the reload so warnings from it are captured.
    const problems = collectProblems(page);
    await page.reload();

    await expect(page.locator('[data-testid="app-root"]')).toHaveAttribute(
      "data-status",
      "running",
    );

    const after = await sample(page);
    // The race clock keeps running while away, so the mile advances, never resets.
    expect(after.mile).toBeGreaterThanOrEqual(before.mile);
    expect(after.chapter).toBe(getChapterForMile(after.mile).name);
    // The target-time input only renders when idle, so the restored target is
    // checked through the pace it produces: 90 min / 26.2 mi = 3:26 per mile.
    await expect(page.getByTestId("stat-pace")).toHaveText("3:26");

    expect(
      hydrationProblems(problems),
      `hydration problems:\n${problems.join("\n")}`,
    ).toHaveLength(0);
  });

  test("reset clears the saved run", async ({ page }) => {
    await startRun(page, 60);
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Reset" }).click();

    await expect(page.locator('[data-testid="app-root"]')).toHaveAttribute(
      "data-status",
      "idle",
    );

    await page.reload();
    await expect(page.locator('[data-testid="app-root"]')).toHaveAttribute(
      "data-status",
      "idle",
    );
    await expect(page.getByTestId("chapter-name")).toHaveText("Wake Up");
  });
});
