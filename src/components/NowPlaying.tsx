"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Track } from "@/data/chapters";

export type NowPlayingProps = {
  chapterName: string;
  track: Track | null;
  trackIndex: number;
  trackCount: number;
  error: string | null;
};

export default function NowPlaying({
  chapterName,
  track,
  trackIndex,
  trackCount,
  error,
}: NowPlayingProps) {
  return (
    <div className="min-h-[92px] w-full text-center">
      <p
        data-testid="chapter-name"
        className="text-xs uppercase tracking-[0.3em] text-accent"
      >
        {chapterName}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={track ? `${track.youtubeId}-${trackIndex}` : "empty"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="mt-2"
        >
          {track ? (
            <>
              <p className="truncate text-lg font-medium">{track.title}</p>
              <p className="truncate text-sm text-muted">{track.artist}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-muted">No tracks yet</p>
              <p className="text-sm text-muted">
                Add YouTube IDs to this chapter in{" "}
                <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
                  src/data/chapters.ts
                </code>
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {trackCount > 0 && (
        <p className="mt-2 text-xs tabular-nums text-muted">
          {trackIndex + 1} / {trackCount}
        </p>
      )}

      {error && (
        <p role="status" className="mt-2 text-xs text-orange-400">
          {error}
        </p>
      )}
    </div>
  );
}
