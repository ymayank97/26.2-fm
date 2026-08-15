"use client";

import { motion } from "framer-motion";

export type PlayButtonProps = {
  playing: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

export default function PlayButton({ playing, disabled, onToggle }: PlayButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={playing ? "Pause" : "Play"}
      aria-pressed={playing}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      whileHover={disabled ? undefined : { scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-background shadow-lg shadow-accent-dim/50 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted disabled:shadow-none"
    >
      {playing ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.28-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
        </svg>
      )}
    </motion.button>
  );
}
