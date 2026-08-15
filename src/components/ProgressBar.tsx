"use client";

import { motion } from "framer-motion";
import { chapters, MARATHON_MILES } from "@/data/chapters";
import { clampMile, getChapterIndexForMile, raceProgress } from "@/lib/pace";

export default function ProgressBar({ mile }: { mile: number }) {
  const safeMile = clampMile(mile);
  const progress = raceProgress(safeMile);
  const activeIndex = getChapterIndexForMile(safeMile);

  return (
    <div className="w-full">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          animate={{ width: `${progress * 100}%` }}
          initial={false}
          transition={{ type: "tween", duration: 0.4, ease: "easeOut" }}
        />
        {/* Chapter boundaries, skipping mile 0 and the finish. */}
        {chapters.slice(1).map((chapter) => (
          <span
            key={chapter.name}
            aria-hidden
            className="absolute inset-y-0 w-px bg-background/70"
            style={{ left: `${(chapter.startMile / MARATHON_MILES) * 100}%` }}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted">
        {chapters.map((chapter, i) => (
          <span
            key={chapter.name}
            className={
              i === activeIndex ? "text-accent transition-colors" : "transition-colors"
            }
          >
            {chapter.startMile}
          </span>
        ))}
        <span>{MARATHON_MILES}</span>
      </div>
    </div>
  );
}
