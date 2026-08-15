"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NowPlaying from "@/components/NowPlaying";
import PlayButton from "@/components/PlayButton";
import ProgressBar from "@/components/ProgressBar";
import RunSetup from "@/components/RunSetup";
import YouTubePlayer from "@/components/YouTubePlayer";
import { chapters } from "@/data/chapters";
import { useRunTimer } from "@/hooks/useRunTimer";
import {
  formatTargetTime,
  getChapterIndexForMile,
  isValidTarget,
  isWallMode,
  mileAtElapsed,
  parseTargetTime,
} from "@/lib/pace";
import { clearRun, loadRun, saveRun } from "@/lib/storage";

export default function Home() {
  const [targetInput, setTargetInput] = useState("");
  const [manualChapterIndex, setManualChapterIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  const targetMinutes = useMemo(() => {
    const parsed = parseTargetTime(targetInput);
    return parsed !== null && isValidTarget(parsed) ? parsed : null;
  }, [targetInput]);

  const targetMs = targetMinutes === null ? null : targetMinutes * 60_000;
  const timer = useRunTimer(targetMs, speed);
  const { status, elapsedMs, hydrate } = timer;
  // Destructured to primitives so the persistence effect below depends on values
  // rather than an object identity that changes every render.
  const {
    status: savedStatus,
    startedAt: savedStartedAt,
    accumulatedMs: savedAccumulatedMs,
  } = timer.snapshot;

  // Guards against an infinite skip loop when every ID in a chapter is bad.
  const errorStreakRef = useRef(0);
  const skipChapterResetRef = useRef(false);

  const running = status !== "idle";
  const mile = running ? mileAtElapsed(elapsedMs / 60_000, targetMinutes ?? 0) : 0;
  const activeChapterIndex = running ? getChapterIndexForMile(mile) : manualChapterIndex;
  const chapter = chapters[activeChapterIndex];
  const tracks = chapter.tracks;
  const track = tracks[trackIndex] ?? null;
  const videoId = track?.youtubeId ?? null;
  const wall = running && isWallMode(mile);

  // Mount-time read of the two browser-only sources: the URL and localStorage.
  //
  // This deliberately sets state from an effect. Reading either during render
  // would make the server and client produce different markup and trigger a
  // hydration mismatch, so the post-mount effect is the correct place for it.
  // It runs exactly once and cannot cascade.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Dev-only time multiplier: ?speed=60 replays a 4-hour run in ~4 minutes.
    // Read from window rather than useSearchParams, which would force this page
    // out of static rendering and require a Suspense boundary.
    const raw = new URLSearchParams(window.location.search).get("speed");
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 500) setSpeed(parsed);

    const saved = loadRun();
    if (saved) {
      if (saved.targetMinutes !== null) setTargetInput(formatTargetTime(saved.targetMinutes));
      setManualChapterIndex(clampIndex(saved.chapterIndex));
      setTrackIndex(Math.max(0, saved.trackIndex));
      skipChapterResetRef.current = true;
      hydrate({
        status: saved.status,
        startedAt: saved.startedAt,
        accumulatedMs: saved.accumulatedMs,
      });
    }
    setHydrated(true);
  }, [hydrate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    if (status === "idle" && targetMinutes === null) {
      clearRun();
      return;
    }
    saveRun({
      targetMinutes,
      status: savedStatus,
      startedAt: savedStartedAt,
      accumulatedMs: savedAccumulatedMs,
      chapterIndex: activeChapterIndex,
      trackIndex,
    });
  }, [
    hydrated,
    targetMinutes,
    status,
    savedStatus,
    savedStartedAt,
    savedAccumulatedMs,
    activeChapterIndex,
    trackIndex,
  ]);

  // A new chapter starts at its first track. Skipped on the hydration pass so a
  // restored run resumes on the track it left off on.
  const prevChapterRef = useRef(activeChapterIndex);
  useEffect(() => {
    if (prevChapterRef.current === activeChapterIndex) return;
    prevChapterRef.current = activeChapterIndex;
    if (skipChapterResetRef.current) {
      skipChapterResetRef.current = false;
      return;
    }
    setTrackIndex(0);
    setError(null);
    errorStreakRef.current = 0;
  }, [activeChapterIndex]);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    setTrackIndex((i) => (i + 1) % tracks.length);
  }, [tracks.length]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    setTrackIndex((i) => (i - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  const handleEnded = useCallback(() => {
    setPlaying(true);
    nextTrack();
  }, [nextTrack]);

  const handleError = useCallback(
    (badId: string, code: number) => {
      errorStreakRef.current += 1;
      if (errorStreakRef.current >= Math.max(1, tracks.length)) {
        setPlaying(false);
        setError("No playable tracks in this chapter. Check the YouTube IDs.");
        return;
      }
      setError(`Skipped an unplayable track (YouTube error ${code}).`);
      nextTrack();
    },
    [nextTrack, tracks.length],
  );

  const handlePlayingChange = useCallback((isPlaying: boolean) => {
    if (isPlaying) {
      errorStreakRef.current = 0;
      setError(null);
    }
    setPlaying(isPlaying);
  }, []);

  const handleReset = useCallback(() => {
    timer.reset();
    setPlaying(false);
    setError(null);
    setManualChapterIndex(0);
    setTrackIndex(0);
    clearRun();
  }, [timer]);

  return (
    <main
      data-testid="app-root"
      data-wall={wall ? "true" : "false"}
      data-status={status}
      /* Full-precision mile for tests: the visible stat rounds to 2dp, which is
         ambiguous exactly on a chapter boundary. */
      data-mile={mile.toFixed(4)}
      className={`${wall ? "wall-mode" : ""} mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-6 px-5 py-10`}
    >
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          26.2 <span className="text-accent">FM</span>
        </h1>
        <p className="mt-2 text-[11px] uppercase tracking-[0.35em] text-muted">
          The Spokane Marathon
        </p>
        <p className="text-[11px] uppercase tracking-[0.35em] text-muted">10.11.26</p>
      </header>

      <YouTubePlayer
        videoId={videoId}
        playing={playing}
        onEnded={handleEnded}
        onError={handleError}
        onPlayingChange={handlePlayingChange}
      />

      <NowPlaying
        chapterName={chapter.name}
        track={track}
        trackIndex={trackIndex}
        trackCount={tracks.length}
        error={error}
      />

      <div className="flex items-center gap-6">
        <TransportButton label="Previous track" onClick={prevTrack} disabled={!videoId}>
          <path d="M7 6v12M19 6.5v11a1 1 0 0 1-1.6.8l-7-5.5a1 1 0 0 1 0-1.6l7-5.5a1 1 0 0 1 1.6.8z" />
        </TransportButton>

        <PlayButton
          playing={playing}
          disabled={!videoId}
          onToggle={() => setPlaying((p) => !p)}
        />

        <TransportButton label="Next track" onClick={nextTrack} disabled={!videoId}>
          <path d="M17 6v12M5 6.5v11a1 1 0 0 0 1.6.8l7-5.5a1 1 0 0 0 0-1.6l-7-5.5A1 1 0 0 0 5 6.5z" />
        </TransportButton>
      </div>

      <ProgressBar mile={mile} />

      <RunSetup
        status={status}
        targetInput={targetInput}
        targetMinutes={targetMinutes}
        elapsedMs={elapsedMs}
        mile={mile}
        onTargetInputChange={setTargetInput}
        onStart={timer.start}
        onPause={timer.pause}
        onResume={timer.resume}
        onReset={handleReset}
      />

      {!running && (
        <nav className="grid w-full max-w-[480px] grid-cols-2 gap-2 sm:grid-cols-3">
          {chapters.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setManualChapterIndex(i)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                i === activeChapterIndex
                  ? "border-accent text-accent"
                  : "border-white/10 text-muted hover:border-white/30"
              }`}
            >
              <span className="block">{c.name}</span>
              <span className="block text-[10px] tabular-nums opacity-70">
                mi {c.startMile}–{c.endMile}
              </span>
            </button>
          ))}
        </nav>
      )}

      {wall && (
        <p
          data-testid="wall-banner"
          className="text-center text-sm font-medium text-accent"
        >
          The Wall. Keep moving.
        </p>
      )}
    </main>
  );
}

function clampIndex(i: number): number {
  if (!Number.isFinite(i)) return 0;
  return Math.min(Math.max(Math.trunc(i), 0), chapters.length - 1);
}

function TransportButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}
