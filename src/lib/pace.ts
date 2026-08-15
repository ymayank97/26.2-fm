import { chapters, MARATHON_MILES, type Chapter } from "@/data/chapters";

/** Accepted target-finish range, in minutes. Guards every division by pace. */
export const MIN_TARGET_MINUTES = 90; // 1:30
export const MAX_TARGET_MINUTES = 480; // 8:00

/** Wall Mode is a visual state only — it never changes which track plays. */
export const WALL_START_MILE = 18;
export const WALL_END_MILE = 20;

export function clampMile(mile: number): number {
  // Only NaN means "unknown" -> 0. Infinities clamp to the ends like any other
  // out-of-range value, so +Infinity lands at the finish rather than the start.
  if (Number.isNaN(mile)) return 0;
  return Math.min(Math.max(mile, 0), MARATHON_MILES);
}

export function isValidTarget(targetMinutes: number): boolean {
  return (
    Number.isFinite(targetMinutes) &&
    targetMinutes >= MIN_TARGET_MINUTES &&
    targetMinutes <= MAX_TARGET_MINUTES
  );
}

/**
 * Minutes per mile for a target finish time.
 * Returns null rather than Infinity/NaN for an invalid target, so callers are
 * forced to handle it instead of silently propagating a bad number.
 */
export function paceMinPerMile(targetMinutes: number): number | null {
  if (!isValidTarget(targetMinutes)) return null;
  return targetMinutes / MARATHON_MILES;
}

/** Current mile from elapsed time, always clamped to [0, 26.2]. */
export function mileAtElapsed(elapsedMinutes: number, targetMinutes: number): number {
  const pace = paceMinPerMile(targetMinutes);
  if (pace === null || pace <= 0) return 0;
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes <= 0) return 0;
  return clampMile(elapsedMinutes / pace);
}

/**
 * Index of the chapter covering a mile. Always a valid index.
 * The naive `find(m >= start && m < end)` returns undefined at exactly 26.2
 * because the final chapter's end is exclusive — this clamps first and treats
 * the finish as belonging to the last chapter.
 */
export function getChapterIndexForMile(mile: number): number {
  const m = clampMile(mile);
  if (m >= MARATHON_MILES) return chapters.length - 1;
  const idx = chapters.findIndex((c) => m >= c.startMile && m < c.endMile);
  return idx === -1 ? chapters.length - 1 : idx;
}

/** Never returns undefined. */
export function getChapterForMile(mile: number): Chapter {
  return chapters[getChapterIndexForMile(mile)];
}

export function isWallMode(mile: number): boolean {
  const m = clampMile(mile);
  return m >= WALL_START_MILE && m < WALL_END_MILE;
}

/** Fraction of the marathon completed, 0..1. */
export function raceProgress(mile: number): number {
  return clampMile(mile) / MARATHON_MILES;
}

/** Milliseconds -> "h:mm:ss". */
export function formatClock(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const total = Math.floor(safe / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Minutes per mile -> "9:09". */
export function formatPace(minPerMile: number): string {
  if (!Number.isFinite(minPerMile) || minPerMile <= 0) return "--:--";
  const m = Math.floor(minPerMile);
  const s = Math.round((minPerMile - m) * 60);
  // Rounding 59.6s up must roll over into the next minute, not render ":60".
  if (s === 60) return `${m + 1}:00`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Parses "4:15" or "4:15:30" into minutes. Returns null if unparseable. */
export function parseTargetTime(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(trimmed)) return null;
  const [h, m, s = "0"] = trimmed.split(":");
  const hours = Number(h);
  const mins = Number(m);
  const secs = Number(s);
  if (mins > 59 || secs > 59) return null;
  return hours * 60 + mins + secs / 60;
}

/** Minutes -> "4:15", for rendering a stored target back into the input. */
export function formatTargetTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (m === 60) return `${h + 1}:00`;
  return `${h}:${String(m).padStart(2, "0")}`;
}
