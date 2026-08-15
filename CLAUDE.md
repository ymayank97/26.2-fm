# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

**26.2 FM — "The soundtrack to the long run."** A client-side Next.js app that plays a marathon soundtrack through YouTube IFrame embeds. Music is split into 6 mile-range "chapters"; Run Mode derives your current mile from target pace + elapsed time and auto-selects the matching chapter. No backend, no API key, no database.

Stack: Next.js 16 (App Router, `src/`), React 19, Tailwind v4, TypeScript, Vitest. Deploys to Vercel from the repo root.

## Commands

```bash
npm run dev            # dev server on :3000
npm run build          # production build (also typechecks)
npm run lint           # eslint (flat config, react-hooks rules are strict — see below)
npm run test           # vitest unit tests, single run
npm run test:watch     # vitest watch
npm run e2e            # playwright end-to-end (starts/reuses the dev server)
npx tsc --noEmit       # typecheck alone

# single tests
npx vitest run -t "getChapterForMile"
npx playwright test -g "Wall Mode"
```

`npm run build` is the only typecheck in CI terms — `next build` runs TypeScript. Lint, unit, and e2e are separate gates.

## Architecture

Data flows in one direction: **elapsed time → mile → chapter → track → videoId → player.**

- `src/data/chapters.ts` — the 6 chapters and their mile ranges. Single source of truth for course structure.
- `src/lib/pace.ts` — all time/mile/chapter math, pure and fully unit-tested. Put new race logic here, not in components.
- `src/hooks/useRunTimer.ts` — the race clock state machine (`idle → running → paused → finished`).
- `src/app/page.tsx` — the only stateful orchestrator. Owns target time, chapter/track selection, and playback state; every component under it is presentational.
- `src/components/YouTubePlayer.tsx` — the sole `react-youtube` boundary.
- `src/lib/storage.ts` — localStorage, namespaced `fm262:`.
- `e2e/run-mode.spec.ts` — asserts an *invariant* rather than racing the clock: at every sampled instant the chapter and Wall Mode on screen must match what `pace.ts` says for the mile shown at that same instant. Keep new run-mode assertions in that style; timestamp-based waits go flaky. The `data-mile` / `data-wall` / `data-status` attributes on `[data-testid="app-root"]` exist for this.

## Constraints that will bite you

These are load-bearing. Changing them reintroduces bugs that were already fixed once.

- **`getChapterForMile` must never return `undefined`.** The obvious `chapters.find(c => mile >= c.startMile && mile < c.endMile)` returns undefined at exactly 26.2, because the last chapter's end is exclusive. Clamp first; the finish belongs to the last chapter.
- **Never divide by an unvalidated target time.** `targetMinutes / 26.2` yields `Infinity`/`NaN` for a zero or unparsed target. `paceMinPerMile` returns `null` outside 90–480 minutes; handle the null.
- **Elapsed time is always a `Date.now()` delta, never a per-tick accumulator.** `setInterval` drifts by seconds per minute in a backgrounded tab, which over 4 hours puts the mile counter minutes off. The interval only triggers re-renders.
- **localStorage and `window.location` are read only inside the mount effect in `page.tsx`.** Reading either during render makes server and client markup disagree → hydration mismatch. That effect carries a scoped `eslint-disable` explaining exactly this.
- **The YouTube player must stay visible and ≥200×200.** YouTube's IFrame API terms require it, so a hidden or 1px player is not an option. The wrapper is a responsive 16:9 frame capped at 480×270.
- **`PLAYER_OPTS` is module-scope on purpose.** react-youtube rebuilds the iframe when `opts` changes identity, so an inline object restarts playback on every render.
- **`onError` must always advance.** User-supplied IDs include removed and embed-disabled videos; without the skip the app dead-ends silently. `errorStreakRef` stops the skip loop when every ID in a chapter is bad.
- ESLint runs React 19's `react-hooks/set-state-in-effect`. Prefer deriving values during render over `setState` in an effect — that is why `finished` is computed, not stored.

## Track data

**Do not invent YouTube video IDs, track titles, or artists.** All 6 chapters ship with `tracks: []` and every screen is built to render correctly with zero tracks. Real values get pasted in by the repo owner.

Likewise, the landing copy `THE SPOKANE MARATHON` / `10.11.26` is given verbatim — don't add or alter event details.

## Dev aid

`?speed=N` (1–500) multiplies elapsed time so a 4-hour run replays in minutes: `localhost:3000/?speed=60`. Chapters should switch at miles 5 / 10 / 15 / 20 / 23, Wall Mode engages 18–20, and the run finishes at 26.2.

## Known limitations of the embed approach

Mobile browsers pause a YouTube iframe when the tab is backgrounded or the screen locks, so V1 is a screen-on app rather than a phone-in-pocket player. Autoplay also requires a user gesture, so the first play must be a tap. Both are inherent to embeds; escaping them means native or a licensed audio SDK.
