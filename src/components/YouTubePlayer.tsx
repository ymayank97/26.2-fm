"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type Ref,
} from "react";
import YouTube, { type YouTubeEvent } from "react-youtube";

export type NowPlayingTrack = { title: string; artist: string };
export type PlayerHandle = { next: () => void; prev: () => void };

/**
 * `youtube-player` ships Flow types but no .d.ts, so react-youtube's exported
 * player type is effectively `any`. This declares only the methods actually
 * called, so a typo becomes a compile error instead of a runtime one.
 *
 * Every method is promisified by youtube-player, hence the Promise returns.
 */
type PlaylistPlayer = {
  playVideo(): Promise<void>;
  pauseVideo(): Promise<void>;
  nextVideo(): Promise<void>;
  previousVideo(): Promise<void>;
  /**
   * Undocumented but long-standing: returns { video_id, title, author }.
   * Treated as best-effort — if it ever stops returning a title the UI simply
   * shows nothing rather than breaking.
   */
  getVideoData(): Promise<{ video_id?: string; title?: string; author?: string }>;
};

/**
 * Defined once at module scope: react-youtube rebuilds the iframe whenever
 * `opts` changes identity, which would restart playback on every render.
 *
 * The frame is a real 480x270 rather than 1px — a zero-size iframe is the most
 * likely shape to get playback refused outright. It is then visually hidden by
 * CSS (see .player-hidden), keeping audio while removing the video, per the
 * product decision to run this audio-only.
 */
function buildOpts(playlistId: string) {
  return {
    width: "480",
    height: "270",
    playerVars: {
      listType: "playlist" as const,
      list: playlistId,
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
    },
  };
}

export type YouTubePlayerProps = {
  playlistId: string;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onTrackChange: (track: NowPlayingTrack | null) => void;
  onError: (code: number) => void;
  ref?: Ref<PlayerHandle>;
};

export default function YouTubePlayer({
  playlistId,
  playing,
  onPlayingChange,
  onTrackChange,
  onError,
  ref,
}: YouTubePlayerProps) {
  const playerRef = useRef<PlaylistPlayer | null>(null);
  // Memoised rather than inlined: react-youtube rebuilds the iframe when `opts`
  // changes identity, so a fresh object each render would restart playback.
  const opts = useMemo(() => buildOpts(playlistId), [playlistId]);

  // Swallow rejections explicitly: every call rejects if the iframe is torn
  // down mid-flight, which would otherwise surface as an unhandled rejection.
  const call = useCallback((fn: (p: PlaylistPlayer) => Promise<unknown>) => {
    const player = playerRef.current;
    if (!player) return;
    void Promise.resolve(fn(player)).catch(() => {});
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      next: () => call((p) => p.nextVideo()),
      prev: () => call((p) => p.previousVideo()),
    }),
    [call],
  );

  const readTrack = useCallback(
    async (player: PlaylistPlayer) => {
      try {
        const data = await player.getVideoData();
        onTrackChange(
          data?.title ? { title: data.title, artist: data.author ?? "" } : null,
        );
      } catch {
        onTrackChange(null);
      }
    },
    [onTrackChange],
  );

  const handleReady = useCallback((event: YouTubeEvent) => {
    playerRef.current = event.target as unknown as PlaylistPlayer;
  }, []);

  useEffect(() => {
    if (playing) call((p) => p.playVideo());
    else call((p) => p.pauseVideo());
  }, [playing, call]);

  const handleStateChange = useCallback(
    (event: YouTubeEvent<number>) => {
      const player = event.target as unknown as PlaylistPlayer;
      const { PLAYING, PAUSED, CUED, ENDED } = YouTube.PlayerState;

      if (event.data === PLAYING || event.data === CUED) void readTrack(player);
      if (event.data === PLAYING) onPlayingChange(true);
      if (event.data === PAUSED) onPlayingChange(false);
      // The playlist advances on its own; ENDED only fires at the very end.
      if (event.data === ENDED) onPlayingChange(false);
    },
    [onPlayingChange, readTrack],
  );

  const handleError = useCallback(
    (event: YouTubeEvent<number>) => onError(event.data),
    [onError],
  );

  return (
    <div className="player-hidden" aria-hidden>
      <YouTube
        opts={opts}
        title="26.2 FM audio"
        onReady={handleReady}
        onStateChange={handleStateChange}
        onError={handleError}
      />
    </div>
  );
}
