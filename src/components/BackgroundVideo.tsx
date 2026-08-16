"use client";

import { useState } from "react";

/**
 * Optional background footage. Point this at a file in /public
 * (e.g. "/background.mp4") or any absolute URL:
 *
 *   NEXT_PUBLIC_BACKGROUND_VIDEO=/background.mp4
 *
 * Left unset, the ambient gradient alone is the background — which keeps the
 * page's payload at zero for this feature. A full-screen video is by far the
 * heaviest thing that can go on this page, so prefer a short, compressed loop.
 */
const SRC = process.env.NEXT_PUBLIC_BACKGROUND_VIDEO || "";

export default function BackgroundVideo() {
  // A missing or undecodable file must not leave the page blank.
  const [failed, setFailed] = useState(false);
  const showVideo = SRC !== "" && !failed;

  return (
    <div className="bg-layer" aria-hidden data-testid="background">
      <div className="bg-ambient" />
      {showVideo && (
        <video
          className="bg-video absolute inset-0"
          src={SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      )}
      <div className="bg-scrim" />
    </div>
  );
}
