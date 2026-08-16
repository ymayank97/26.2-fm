"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { NowPlayingTrack } from "@/components/YouTubePlayer";

export type NowPlayingProps = {
  track: NowPlayingTrack | null;
  playing: boolean;
  error: string | null;
};

export default function NowPlaying({ track, playing, error }: NowPlayingProps) {
  const label = !track ? (playing ? "Loading…" : "Press play") : null;

  return (
    <div className="min-h-[84px] w-full max-w-md text-center" data-testid="now-playing">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={track?.title ?? label ?? "idle"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
        >
          {track ? (
            <>
              <p className="truncate text-lg font-medium">{track.title}</p>
              {track.artist && (
                <p className="mt-1 truncate text-sm text-muted">{track.artist}</p>
              )}
            </>
          ) : (
            <p className="text-sm uppercase tracking-[0.3em] text-muted">{label}</p>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p role="status" className="mt-3 text-xs text-orange-400">
          {error}
        </p>
      )}
    </div>
  );
}
