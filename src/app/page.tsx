"use client";

import { useCallback, useRef, useState } from "react";
import BackgroundVideo from "@/components/BackgroundVideo";
import NowPlaying from "@/components/NowPlaying";
import PlayButton from "@/components/PlayButton";
import YouTubePlayer, {
  type NowPlayingTrack,
  type PlayerHandle,
} from "@/components/YouTubePlayer";
import { PLAYLIST_ID } from "@/lib/playlist";

/** YouTube IFrame API error codes, mapped to something a listener can act on. */
function describeError(code: number): string {
  switch (code) {
    case 2:
      return "That playlist ID looks invalid. Check NEXT_PUBLIC_YT_PLAYLIST_ID.";
    case 5:
      return "The player hit an error. Try again.";
    case 100:
      return "That track is unavailable — it may have been removed.";
    case 101:
    case 150:
      return "The owner does not allow this track to be played outside YouTube.";
    default:
      return `Playback error (code ${code}).`;
  }
}

export default function Home() {
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<PlayerHandle>(null);

  const handlePlayingChange = useCallback((isPlaying: boolean) => {
    setPlaying(isPlaying);
    if (isPlaying) setError(null);
  }, []);

  const handleError = useCallback((code: number) => {
    setError(describeError(code));
    // A dead track inside a playlist should not stall the queue.
    playerRef.current?.next();
  }, []);

  // Aliased to a local so TypeScript narrows it to `string` inside the branch;
  // it will not narrow the imported binding directly.
  const playlistId = PLAYLIST_ID;

  return (
    <>
      <BackgroundVideo />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
        <header className="text-center">
          <h1 className="text-5xl font-bold tracking-tight">
            26.2 <span className="text-accent">FM</span>
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-[0.35em] text-muted">
            The Spokane Marathon
          </p>
          <p className="text-[11px] uppercase tracking-[0.35em] text-muted">10.11.26</p>
        </header>

        {playlistId !== null ? (
          <>
            <NowPlaying track={track} playing={playing} error={error} />

            <div className="flex items-center gap-8">
              <TransportButton
                label="Previous track"
                onClick={() => playerRef.current?.prev()}
              >
                <path d="M7 6v12M19 6.5v11a1 1 0 0 1-1.6.8l-7-5.5a1 1 0 0 1 0-1.6l7-5.5a1 1 0 0 1 1.6.8z" />
              </TransportButton>

              <PlayButton playing={playing} onToggle={() => setPlaying((p) => !p)} />

              <TransportButton
                label="Next track"
                onClick={() => playerRef.current?.next()}
              >
                <path d="M17 6v12M5 6.5v11a1 1 0 0 0 1.6.8l7-5.5a1 1 0 0 0 0-1.6l-7-5.5A1 1 0 0 0 5 6.5z" />
              </TransportButton>
            </div>

            <YouTubePlayer
              ref={playerRef}
              playlistId={playlistId}
              playing={playing}
              onPlayingChange={handlePlayingChange}
              onTrackChange={setTrack}
              onError={handleError}
            />
          </>
        ) : (
          <div
            data-testid="setup-notice"
            className="max-w-sm rounded-lg border border-dashed border-white/15 bg-black/30 p-5 text-center text-sm text-muted"
          >
            <p className="text-foreground">No playlist set yet.</p>
            <p className="mt-2">
              Paste a public or unlisted YouTube playlist into{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
                src/lib/playlist.ts
              </code>
              , or set{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
                NEXT_PUBLIC_YT_PLAYLIST_ID
              </code>
              .
            </p>
          </div>
        )}
      </main>
    </>
  );
}

function TransportButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-muted transition-colors hover:text-foreground"
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
