/**
 * ---------------------------------------------------------------------------
 * PASTE YOUR PLAYLIST HERE.
 *
 * Accepts a full URL or a bare ID, e.g.
 *   "https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *   "PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *
 * The playlist must be PUBLIC or UNLISTED. Private playlists, and some
 * auto-generated YouTube Music mixes, cannot be embedded at all.
 *
 * Setting NEXT_PUBLIC_YT_PLAYLIST_ID (locally in .env.local, or in the Vercel
 * dashboard) overrides this value without a code change.
 * ---------------------------------------------------------------------------
 */
const PLAYLIST_SOURCE = "";

/**
 * Known YouTube playlist ID shapes. `PL` playlists carry 16 or 32 trailing
 * characters; the length floor is what rejects a truncated ID such as
 * "PLTJ1PnzCWyFw", which would otherwise fail silently inside the player.
 */
export function isLikelyPlaylistId(id: string): boolean {
  return (
    /^(PL|UU|LL|FL|PU|OLAK5uy_|RDCLAK5uy_)[A-Za-z0-9_-]+$/.test(id) &&
    id.length >= 18 &&
    id.length <= 64
  );
}

/**
 * Pulls a playlist ID out of a URL or a bare ID.
 * Returns null for anything unrecognised — never a partial or guessed value.
 */
export function extractPlaylistId(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isLikelyPlaylistId(trimmed)) return trimmed;

  // Only bother with URL parsing once it actually looks like one.
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const list = new URL(trimmed).searchParams.get("list");
    return list && isLikelyPlaylistId(list) ? list : null;
  } catch {
    return null;
  }
}

/**
 * The playlist the app plays, or null when none is configured yet.
 * `process.env.NEXT_PUBLIC_*` is inlined at build time, so this must stay a
 * static reference rather than a computed lookup.
 */
export const PLAYLIST_ID: string | null = extractPlaylistId(
  process.env.NEXT_PUBLIC_YT_PLAYLIST_ID || PLAYLIST_SOURCE,
);
