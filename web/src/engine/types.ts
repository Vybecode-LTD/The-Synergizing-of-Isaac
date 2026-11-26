export const RATINGS = ["S", "A", "B", "C", "D"] as const;
export type Rating = (typeof RATINGS)[number];

export type StatKey =
  | "damage"
  | "damageMult"
  | "tears"
  | "tearsMult"
  | "range"
  | "speed"
  | "shotSpeed"
  | "luck"
  | "redHearts"
  | "soulHearts"
  | "blackHearts"
  | "boneHearts";

export type Stats = Partial<Record<StatKey, number>>;

export interface Item {
  id: number;
  slug: string;
  name: string;
  dlc: string;
  /** One-line effect from the item tracker. Empty for pure stat items. */
  effect: string;
  quality: 0 | 1 | 2 | 3 | 4;
  type: "active" | "passive";
  stats?: Stats;
  /** Transformations it counts toward in Repentance (data/transformations.json, decision 0006). */
  transformations?: string[];
  /** Transformations it counts toward only in Repentance+. */
  transformationsPlus?: string[];
  pools?: string[];
}

export interface Trinket {
  id: number;
  slug: string;
  name: string;
  dlc: string;
  effect: string;
  stats?: Stats;
  transformations?: string[];
  transformationsPlus?: string[];
}

/** One entry of data/transformations.json: the wiki's Repentance list, with what counts only in Repentance+. */
export interface Transformation {
  id: string;
  name: string;
  needs: number;
  page: string;
  revision: number;
  items: number[];
  trinkets: number[];
  plusItems: number[];
  plusTrinkets: number[];
  note?: string;
}

export interface Character {
  slug: string;
  name: string;
  tainted: boolean;
  gameId: number;
  /** What the game itself calls the character when it differs ("???"). */
  gameName?: string;
  startingItems?: number[];
  pocketActive?: number;
}

/** A synergy as it is written in data/synergies.json: by name, for people. */
export interface SynergyRecord {
  id: string;
  items: string[];
  trinkets: string[];
  characters: string[];
  rating: Rating;
  description: string;
}

/** A synergy resolved against the roster: by id, for the engine. */
export interface Synergy {
  id: string;
  itemIds: number[];
  trinketIds: number[];
  characterSlugs: string[];
  rating: Rating;
  description: string;
  /** Added by this visitor and stored only in their browser. */
  custom?: boolean;
}

export interface Build {
  character: string | null;
  items: number[];
  trinkets: number[];
}

export const EMPTY_BUILD: Build = { character: null, items: [], trinkets: [] };
