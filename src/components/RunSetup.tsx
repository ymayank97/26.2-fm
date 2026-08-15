"use client";

import type { RunStatus } from "@/hooks/useRunTimer";
import {
  MAX_TARGET_MINUTES,
  MIN_TARGET_MINUTES,
  formatClock,
  formatPace,
  formatTargetTime,
  paceMinPerMile,
} from "@/lib/pace";

export type RunSetupProps = {
  status: RunStatus;
  targetInput: string;
  targetMinutes: number | null;
  elapsedMs: number;
  mile: number;
  onTargetInputChange: (value: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
};

export default function RunSetup({
  status,
  targetInput,
  targetMinutes,
  elapsedMs,
  mile,
  onTargetInputChange,
  onStart,
  onPause,
  onResume,
  onReset,
}: RunSetupProps) {
  const touched = targetInput.trim().length > 0;
  const invalid = touched && targetMinutes === null;
  const pace = targetMinutes === null ? null : paceMinPerMile(targetMinutes);

  if (status === "idle") {
    return (
      <form
        className="w-full max-w-[480px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (targetMinutes !== null) onStart();
        }}
      >
        <label
          htmlFor="target"
          className="block text-xs uppercase tracking-[0.3em] text-muted"
        >
          Target finish
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="target"
            name="target"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4:15"
            value={targetInput}
            onChange={(e) => onTargetInputChange(e.target.value)}
            aria-invalid={invalid}
            aria-describedby="target-hint"
            className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-lg tabular-nums outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={targetMinutes === null}
            className="shrink-0 rounded-md bg-accent px-5 py-2 font-medium text-background disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted"
          >
            Start run
          </button>
        </div>
        <p id="target-hint" className="mt-2 text-xs text-muted">
          {invalid
            ? `Enter h:mm between ${formatTargetTime(MIN_TARGET_MINUTES)} and ${formatTargetTime(MAX_TARGET_MINUTES)}`
            : pace !== null
              ? `${formatPace(pace)} / mile`
              : "Sets the pace that drives your chapters"}
        </p>
      </form>
    );
  }

  return (
    <div className="w-full max-w-[480px]">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat testId="stat-elapsed" label="Elapsed" value={formatClock(elapsedMs)} />
        <Stat testId="stat-mile" label="Mile" value={mile.toFixed(2)} />
        <Stat
          testId="stat-pace"
          label="Pace"
          value={pace === null ? "--:--" : formatPace(pace)}
        />
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {status === "running" && (
          <SecondaryButton onClick={onPause}>Pause run</SecondaryButton>
        )}
        {status === "paused" && (
          <SecondaryButton onClick={onResume}>Resume run</SecondaryButton>
        )}
        <SecondaryButton onClick={onReset}>
          {status === "finished" ? "New run" : "Reset"}
        </SecondaryButton>
      </div>

      {status === "finished" && (
        <p className="mt-4 text-center text-sm text-accent">
          26.2. That&apos;s the whole thing.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-2 py-3">
      <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p data-testid={testId} className="mt-1 text-xl tabular-nums">
        {value}
      </p>
    </div>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-white/15 px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  );
}
