"use client";

import { useCallback, useEffect, useRef } from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer as Player } from "react-youtube";

/**
 * Player options are defined once at module scope: react-youtube tears down and
 * rebuilds the iframe when `opts` changes, so a fresh object each render would
 * restart playback on every state update.
 *
 * The frame is deliberately visible. YouTube's IFrame API terms require the
 * player be at least 200x200 and unobscured, so a hidden/1px player is not an
 * option; the wrapper caps it at 480x270 (their recommended 16:9 size).
 */
const PLAYER_OPTS = {
  width: "100%",
  height: "100%",
  playerVars: {
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    modestbranding: 1,
    rel: 0,
    playsinline: 1,
  },
} as const;

export type YouTubePlayerProps = {
  /** null when the active chapter has no tracks — the player is not mounted. */
  videoId: string | null;
  playing: boolean;
  onEnded: () => void;
  /** Fired for removed / private / embedding-disabled videos. */
  onError: (videoId: string, code: number) => void;
  /** Reports playback state back when YouTube changes it on its own. */
  onPlayingChange: (playing: boolean) => void;
};

export default function YouTubePlayer({
  videoId,
  playing,
  onEnded,
  onError,
  onPlayingChange,
}: YouTubePlayerProps) {
  const playerRef = useRef<Player | null>(null);

  const handleReady = useCallback((event: YouTubeEvent) => {
    playerRef.current = event.target;
  }, []);

  // Drive the player from the `playing` prop. Every youtube-player method is
  // promisified, so rejections are swallowed explicitly — an unhandled rejection
  // fires whenever the iframe is torn down mid-call.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !videoId) return;
    if (playing) {
      void Promise.resolve(player.playVideo()).catch(() => {});
    } else {
      void Promise.resolve(player.pauseVideo()).catch(() => {});
    }
  }, [playing, videoId]);

  const handleStateChange = useCallback(
    (event: YouTubeEvent<number>) => {
      // With autoplay off, a new videoId lands in CUED. If the user is mid-run
      // and expects sound, start it; otherwise it would sit silent forever.
      // react-youtube reads this prop at call time, so the latest `playing` wins.
      if (event.data === YouTube.PlayerState.CUED && playing) {
        void Promise.resolve(event.target.playVideo()).catch(() => {});
      }
    },
    [playing],
  );

  const handleError = useCallback(
    (event: YouTubeEvent<number>) => {
      if (videoId) onError(videoId, event.data);
    },
    [onError, videoId],
  );

  if (!videoId) {
    return (
      <div
        className="flex aspect-video w-full max-w-[480px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 text-center text-sm text-white/40"
        data-testid="player-empty"
      >
        No tracks in this chapter yet
      </div>
    );
  }

  return (
    <div className="aspect-video w-full max-w-[480px] overflow-hidden rounded-lg bg-black">
      <YouTube
        videoId={videoId}
        opts={PLAYER_OPTS}
        className="h-full w-full"
        iframeClassName="h-full w-full"
        title="26.2 FM player"
        onReady={handleReady}
        onEnd={onEnded}
        onError={handleError}
        onStateChange={handleStateChange}
        onPlay={() => onPlayingChange(true)}
        onPause={() => onPlayingChange(false)}
      />
    </div>
  );
}
