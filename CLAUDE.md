# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

**26.2 FM — "The soundtrack to the long run."** A deliberately minimal, single-screen Next.js app that plays one YouTube playlist as audio over an ambient background. No backend, no database, no API key.

Stack: Next.js 16 (App Router, `src/`), React 19, Tailwind v4, TypeScript, Vitest, Playwright. Deploys to Vercel from the repo root.

**Scope discipline matters here.** An earlier version had six mile-range "chapters," pace math, a race clock, and localStorage persistence. All of it was deliberately removed — no categorization, no time fields. If you're about to add a feature with state that outlives a page load, that's a signal to stop and ask.

## Commands

```bash
npm run dev            # dev server on :3000
npm run build          # production build (also typechecks)
npm run lint           # eslint (React 19 hooks rules are strict — see below)
npm run test           # vitest unit tests
npm run e2e            # playwright (starts/reuses the dev server)
npx tsc --noEmit       # typecheck alone

# single tests
npx vitest run -t "extractPlaylistId"
npx playwright test -g "phone viewport"
```

## Architecture

Four components and one lib module. The whole data flow is: a playlist ID → a hidden YouTube iframe → track metadata back out.

- `src/lib/playlist.ts` — the playlist ID, and URL/ID parsing. **The one place to paste a playlist.**
- `src/components/YouTubePlayer.tsx` — the sole `react-youtube` boundary. Hidden; exposes `next`/`prev` via an imperative handle.
- `src/components/BackgroundVideo.tsx` — ambient gradient, with an optional video layered over it.
- `src/components/NowPlaying.tsx`, `PlayButton.tsx` — presentational.
- `src/app/page.tsx` — owns `playing`, `track`, and `error`. That's the entire app state.

## Configuration

Both are optional and read at **build time** (`NEXT_PUBLIC_*` is inlined, so they must stay static references, and changing them in Vercel requires a redeploy).

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_YT_PLAYLIST_ID` | Playlist to play. Overrides `PLAYLIST_SOURCE` in `playlist.ts`. |
| `NEXT_PUBLIC_BACKGROUND_VIDEO` | e.g. `/background.mp4`. Unset → ambient gradient only. |

The playlist must be **public or unlisted**. Private playlists and some auto-generated YouTube Music mixes cannot be embedded at all.

## Constraints that will bite you

- **Never invent a playlist or video ID.** With none configured the app shows a setup notice, and that state is covered by tests — keep it working.
- **`isLikelyPlaylistId` enforces a length floor on purpose.** A truncated ID like `PLTJ1PnzCWyFw` (13 chars; real ones are `PL` + 16 or 32) otherwise fails silently inside the player with no useful error. Don't loosen it without a reason.
- **`opts` must be memoised.** react-youtube tears down and rebuilds the iframe whenever `opts` changes identity, which restarts playback on every render.
- **`getVideoData()` is undocumented.** It's how now-playing text works without an API key. Treat it as best-effort: if it returns nothing, render nothing — never throw.
- **`onError` must advance the queue.** A removed or embedding-disabled track inside a playlist would otherwise stall it permanently.
- **`youtube-player` ships no TypeScript types** (Flow only), so react-youtube's player type is effectively `any`. `PlaylistPlayer` in `YouTubePlayer.tsx` declares the handful of methods actually used — add to it rather than casting inline.
- ESLint runs React 19's `react-hooks/refs` and `set-state-in-effect`. Reading `ref.current` during render is an error; derive during render or use `useMemo`.

## The hidden player

The iframe is mounted at a real 480×270 and hidden via `.player-hidden` (`opacity: 0`, behind the background), keeping audio only. This is a deliberate product decision by the repo owner.

Two things to keep in view rather than re-litigate:

- It's a **contract** question, not a copyright one. YouTube serves the audio, so there's no hosting/redistribution issue — but YouTube's API Services Terms govern player use regardless, specifying a minimum player size and prohibiting separating audio from video. The realistic downside is the embed being blocked, not a copyright claim.
- A **zero-size** iframe is the shape most likely to have playback refused outright, which is why it's 480×270 and hidden with CSS rather than sized to 1px. Don't "optimise" that down.

Mobile browsers also pause the iframe when the tab is backgrounded or the screen locks, and autoplay needs a user gesture, so the first play must be a tap. Both are inherent to embeds.

## Testing

`e2e/player.spec.ts` covers the unconfigured shell — the state that ships until a playlist is pasted in. Real playback can't be asserted without a live public playlist and network access; verify that by hand after setting one.
