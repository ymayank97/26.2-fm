import type { RunStatus } from "@/hooks/useRunTimer";

const KEY = "fm262:run";

export type PersistedRun = {
  targetMinutes: number | null;
  status: RunStatus;
  /** Epoch ms when the current running segment began; null unless running. */
  startedAt: number | null;
  /** Scaled elapsed ms banked from completed segments. */
  accumulatedMs: number;
  chapterIndex: number;
  trackIndex: number;
};

/**
 * Every accessor is defensive: localStorage throws in private-mode Safari and
 * when storage is full, and the stored blob can be stale or hand-edited. A bad
 * read must degrade to "no saved run" rather than break the app.
 *
 * Callers must only invoke these from inside useEffect. Reading storage during
 * render makes the server and client markup disagree and triggers a React
 * hydration mismatch.
 */
export function loadRun(): PersistedRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPersistedRun(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveRun(run: PersistedRun): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    // Storage full or blocked - persistence is a convenience, not a requirement.
  }
}

export function clearRun(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

const STATUSES: RunStatus[] = ["idle", "running", "paused", "finished"];

function isPersistedRun(value: unknown): value is PersistedRun {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const numberOrNull = (x: unknown) => x === null || typeof x === "number";
  return (
    numberOrNull(v.targetMinutes) &&
    typeof v.status === "string" &&
    STATUSES.includes(v.status as RunStatus) &&
    numberOrNull(v.startedAt) &&
    typeof v.accumulatedMs === "number" &&
    typeof v.chapterIndex === "number" &&
    typeof v.trackIndex === "number"
  );
}
