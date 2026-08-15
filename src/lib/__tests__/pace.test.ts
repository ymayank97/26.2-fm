import { describe, expect, it } from "vitest";
import { chapters, MARATHON_MILES } from "@/data/chapters";
import {
  clampMile,
  formatClock,
  formatPace,
  formatTargetTime,
  getChapterForMile,
  getChapterIndexForMile,
  isValidTarget,
  isWallMode,
  mileAtElapsed,
  paceMinPerMile,
  parseTargetTime,
  raceProgress,
} from "@/lib/pace";

describe("getChapterForMile", () => {
  const cases: Array<[number, string]> = [
    [0, "Wake Up"],
    [4.99, "Wake Up"],
    [5, "Cruise"],
    [9.99, "Cruise"],
    [10, "Locked In"],
    [15, "The Wall"],
    [18, "The Wall"],
    [19.99, "The Wall"],
    [20, "Don't Stop"],
    [22.99, "Don't Stop"],
    [23, "Finish Line"],
    [26.19, "Finish Line"],
    [26.2, "Finish Line"],
    [30, "Finish Line"],
    [-1, "Wake Up"],
  ];

  it.each(cases)("mile %p -> %s", (mile, expected) => {
    expect(getChapterForMile(mile).name).toBe(expected);
  });

  it("never returns undefined across the full range, including out of bounds", () => {
    const probes = [-100, -1, 0, 26.2, 26.3, 1000, NaN, Infinity, -Infinity];
    for (let m = 0; m <= 27; m += 0.01) probes.push(m);
    for (const m of probes) {
      const chapter = getChapterForMile(m);
      expect(chapter).toBeDefined();
      expect(typeof chapter.name).toBe("string");
    }
  });

  it("returns an in-bounds index for every probe", () => {
    for (const m of [-5, 0, 13.1, 26.2, 99, NaN]) {
      const idx = getChapterIndexForMile(m);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(chapters.length);
    }
  });

  it("covers the whole course with no gaps between chapters", () => {
    expect(chapters[0].startMile).toBe(0);
    expect(chapters[chapters.length - 1].endMile).toBe(MARATHON_MILES);
    for (let i = 1; i < chapters.length; i++) {
      expect(chapters[i].startMile).toBe(chapters[i - 1].endMile);
    }
  });
});

describe("clampMile", () => {
  it.each([
    [-1, 0],
    [0, 0],
    [13.1, 13.1],
    [26.2, 26.2],
    [30, 26.2],
    [NaN, 0],
    [Infinity, 26.2],
    [-Infinity, 0],
  ])("clampMile(%p) -> %p", (input, expected) => {
    expect(clampMile(input)).toBe(expected);
  });
});

describe("paceMinPerMile / isValidTarget", () => {
  it("rejects a zero target instead of returning Infinity", () => {
    expect(paceMinPerMile(0)).toBeNull();
    expect(isValidTarget(0)).toBe(false);
  });

  it.each([-10, 0, 89, 481, NaN, Infinity])("rejects %p", (target) => {
    expect(paceMinPerMile(target)).toBeNull();
  });

  it.each([90, 240, 480])("accepts %p", (target) => {
    expect(paceMinPerMile(target)).not.toBeNull();
  });

  it("computes a 4:00 marathon at ~9:09/mi", () => {
    expect(paceMinPerMile(240)).toBeCloseTo(9.1603, 3);
  });
});

describe("mileAtElapsed", () => {
  it("is 0 at the start", () => {
    expect(mileAtElapsed(0, 240)).toBe(0);
  });

  it("is halfway at half the target time", () => {
    expect(mileAtElapsed(120, 240)).toBeCloseTo(13.1, 6);
  });

  it("is exactly 26.2 at the target time", () => {
    expect(mileAtElapsed(240, 240)).toBeCloseTo(26.2, 6);
  });

  it("clamps past the target time rather than overrunning", () => {
    expect(mileAtElapsed(600, 240)).toBe(26.2);
  });

  it.each([
    [60, 0],
    [60, NaN],
    [-5, 240],
    [NaN, 240],
  ])("returns 0 for elapsed=%p target=%p", (elapsed, target) => {
    expect(mileAtElapsed(elapsed, target)).toBe(0);
  });
});

describe("isWallMode", () => {
  it.each([
    [0, false],
    [17.99, false],
    [18, true],
    [19.99, true],
    [20, false],
    [26.2, false],
    [-1, false],
  ])("mile %p -> %p", (mile, expected) => {
    expect(isWallMode(mile)).toBe(expected);
  });
});

describe("raceProgress", () => {
  it.each([
    [0, 0],
    [13.1, 0.5],
    [26.2, 1],
    [40, 1],
    [-3, 0],
  ])("mile %p -> %p", (mile, expected) => {
    expect(raceProgress(mile)).toBeCloseTo(expected, 6);
  });
});

describe("formatClock", () => {
  it.each([
    [0, "0:00:00"],
    [1000, "0:00:01"],
    [61_000, "0:01:01"],
    [3_661_000, "1:01:01"],
    [-500, "0:00:00"],
    [NaN, "0:00:00"],
  ])("%p ms -> %s", (ms, expected) => {
    expect(formatClock(ms)).toBe(expected);
  });
});

describe("formatPace", () => {
  it.each([
    [9.1603, "9:10"],
    [8, "8:00"],
    [7.999, "8:00"],
    [0, "--:--"],
    [NaN, "--:--"],
  ])("%p -> %s", (pace, expected) => {
    expect(formatPace(pace)).toBe(expected);
  });
});

describe("parseTargetTime / formatTargetTime", () => {
  it.each([
    ["4:15", 255],
    ["3:00", 180],
    ["3:59:30", 239.5],
    [" 4:15 ", 255],
  ])("parses %p -> %p", (input, expected) => {
    expect(parseTargetTime(input)).toBeCloseTo(expected, 6);
  });

  it.each(["", "abc", "4", "4:75", "4:15:99", "-4:15", "4:15:30:20"])(
    "rejects %p",
    (input) => {
      expect(parseTargetTime(input)).toBeNull();
    },
  );

  it("round-trips through formatTargetTime", () => {
    expect(formatTargetTime(255)).toBe("4:15");
    expect(parseTargetTime(formatTargetTime(255)!)).toBe(255);
  });
});
