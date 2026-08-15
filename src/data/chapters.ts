export type Track = { title: string; artist: string; youtubeId: string };
export type Chapter = { name: string; startMile: number; endMile: number; tracks: Track[] };

export const MARATHON_MILES = 26.2;

/**
 * The six chapters of the run. `tracks` is intentionally empty — real titles,
 * artists, and YouTube IDs get filled in by hand. Nothing here is placeholder
 * data pretending to be real, and every screen renders correctly with zero tracks.
 */
export const chapters: Chapter[] = [
  { name: "Wake Up", startMile: 0, endMile: 5, tracks: [] },
  { name: "Cruise", startMile: 5, endMile: 10, tracks: [] },
  { name: "Locked In", startMile: 10, endMile: 15, tracks: [] },
  { name: "The Wall", startMile: 15, endMile: 20, tracks: [] },
  { name: "Don't Stop", startMile: 20, endMile: 23, tracks: [] },
  { name: "Finish Line", startMile: 23, endMile: MARATHON_MILES, tracks: [] },
];
