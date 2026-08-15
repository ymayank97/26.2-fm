"use client";

import { useCallback, useEffect, useState } from "react";

export type RunStatus = "idle" | "running" | "paused" | "finished";

export type TimerState = {
  status: RunStatus;
  /** Epoch ms the current running segment began; null unless running. */
  startedAt: number | null;
  /** Scaled elapsed ms banked from previously completed segments. */
  accumulatedMs: number;
};

const IDLE: TimerState = { status: "idle", startedAt: null, accumulatedMs: 0 };

/** Re-render cadence. Only drives display; it never accumulates time itself. */
const TICK_MS = 500;

export type RunTimer = {
  status: RunStatus;
  elapsedMs: number;
  /** Canonical state to persist — already reconciled with an auto-finish. */
  snapshot: TimerState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  hydrate: (state: TimerState) => void;
};

/**
 * Race clock.
 *
 * Elapsed time is always derived from `Date.now()` deltas, never by adding a
 * fixed amount per tick: setInterval drifts by seconds per minute under load or
 * in a backgrounded tab, which over a four-hour marathon would put the mile
 * counter minutes off.
 *
 * Finishing is derived during render rather than written back with setState in
 * an effect, which would cost an extra render pass on every tick near the end.
 *
 * @param targetMs total race duration; the run auto-finishes here. null disables.
 * @param speed    dev-only time multiplier (see ?speed=N) so a 4-hour run can be
 *                 replayed in minutes. Always 1 in normal use.
 */
export function useRunTimer(targetMs: number | null, speed: number = 1): RunTimer {
  const [state, setState] = useState<TimerState>(IDLE);
  // null until the first client tick, so server and client agree on first paint.
  const [nowTs, setNowTs] = useState<number | null>(null);

  const rawElapsedMs =
    state.status === "running" && state.startedAt !== null && nowTs !== null
      ? state.accumulatedMs + Math.max(0, nowTs - state.startedAt) * speed
      : state.accumulatedMs;

  const overrun = targetMs !== null && rawElapsedMs >= targetMs;
  const status: RunStatus = state.status === "running" && overrun ? "finished" : state.status;
  // Pin elapsed to the target so the mile lands exactly on 26.2, not past it.
  const elapsedMs = overrun && targetMs !== null ? targetMs : rawElapsedMs;

  const snapshot: TimerState =
    status === "finished" && state.status === "running"
      ? { status: "finished", startedAt: null, accumulatedMs: elapsedMs }
      : state;

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => setNowTs(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [status]);

  const start = useCallback(() => {
    const now = Date.now();
    setNowTs(now);
    setState({ status: "running", startedAt: now, accumulatedMs: 0 });
  }, []);

  const pause = useCallback(() => {
    const now = Date.now();
    setState((prev) => {
      if (prev.status !== "running" || prev.startedAt === null) return prev;
      const banked = prev.accumulatedMs + Math.max(0, now - prev.startedAt) * speed;
      return { status: "paused", startedAt: null, accumulatedMs: banked };
    });
  }, [speed]);

  const resume = useCallback(() => {
    const now = Date.now();
    setNowTs(now);
    setState((prev) =>
      prev.status === "paused" ? { ...prev, status: "running", startedAt: now } : prev,
    );
  }, []);

  const reset = useCallback(() => {
    setState(IDLE);
    setNowTs(null);
  }, []);

  const hydrate = useCallback((next: TimerState) => {
    setState(next);
    if (next.status === "running") setNowTs(Date.now());
  }, []);

  return { status, elapsedMs, snapshot, start, pause, resume, reset, hydrate };
}
