import type { Item, StatKey, Stats, Trinket } from "./types";

export const STAT_LABELS: Record<StatKey, string> = {
  damage: "Damage",
  damageMult: "Damage",
  tears: "Tears",
  tearsMult: "Tears",
  range: "Range",
  speed: "Speed",
  shotSpeed: "Shot speed",
  luck: "Luck",
  redHearts: "Red hearts",
  soulHearts: "Soul hearts",
  blackHearts: "Black hearts",
  boneHearts: "Bone hearts",
};

const MULTIPLIERS: ReadonlySet<StatKey> = new Set<StatKey>(["damageMult", "tearsMult"]);
const ORDER: StatKey[] = [
  "damage",
  "damageMult",
  "tears",
  "tearsMult",
  "range",
  "speed",
  "shotSpeed",
  "luck",
  "redHearts",
  "soulHearts",
  "blackHearts",
  "boneHearts",
];

function trim(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** "+1.5", "-0.4" or, for multipliers, "x2". */
export function formatStat(key: StatKey, value: number): string {
  if (MULTIPLIERS.has(key)) return `×${trim(value)}`;
  return `${value > 0 ? "+" : "−"}${trim(Math.abs(value))}`;
}

export interface StatLine {
  key: StatKey;
  label: string;
  value: number;
  text: string;
}

/** One entry per stat an item changes, in a fixed order. */
export function statLines(stats: Stats | undefined): StatLine[] {
  if (!stats) return [];
  return ORDER.filter((key) => stats[key] !== undefined && stats[key] !== 0).map((key) => {
    const value = stats[key]!;
    return { key, label: STAT_LABELS[key], value, text: formatStat(key, value) };
  });
}

/**
 * The raw stat changes of a build: flat changes added up, multipliers multiplied.
 * These are the items' own numbers, before the game's damage and fire-rate
 * formulas and caps, so they are a tally of what you picked up, not a final stat.
 */
export function totalStats(entries: readonly (Item | Trinket)[]): StatLine[] {
  const totals: Stats = {};
  for (const entry of entries) {
    for (const [k, value] of Object.entries(entry.stats ?? {})) {
      const key = k as StatKey;
      totals[key] = MULTIPLIERS.has(key) ? (totals[key] ?? 1) * value : (totals[key] ?? 0) + value;
    }
  }
  // To the two places that are shown, so changes that cancel out (0.1 + 0.2 - 0.3) are exactly nothing.
  for (const key of Object.keys(totals) as StatKey[]) totals[key] = Math.round(totals[key]! * 100) / 100;
  for (const key of MULTIPLIERS) if (totals[key] === 1) delete totals[key];
  return statLines(totals);
}

export const TRANSFORMATION_NAMES: Record<string, string> = {
  guppy: "Guppy",
  beelzebub: "Beelzebub",
  "fun-guy": "Fun Guy",
  seraphim: "Seraphim",
  bob: "Bob",
  spun: "Spun",
  "yes-mother": "Yes Mother?",
  conjoined: "Conjoined",
  leviathan: "Leviathan",
  "oh-crap": "Oh Crap",
  bookworm: "Bookworm",
  "spider-baby": "Spider Baby",
  "super-bum": "Super Bum",
};

/** Every transformation takes three of its items. */
export const TRANSFORMATION_NEEDS = 3;

export interface TransformationProgress {
  id: string;
  name: string;
  count: number;
  needs: number;
  done: boolean;
}

/** Progress toward each transformation the build has started, closest first. */
export function transformationProgress(items: readonly Item[]): TransformationProgress[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const id of item.transformations ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      name: TRANSFORMATION_NAMES[id] ?? id,
      count,
      needs: TRANSFORMATION_NEEDS,
      done: count >= TRANSFORMATION_NEEDS,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const POOL_NAMES: Record<string, string> = {
  treasure: "Treasure Room",
  shop: "Shop",
  boss: "Boss",
  devil: "Devil Room",
  angel: "Angel Room",
  secret: "Secret Room",
  library: "Library",
  curse: "Curse Room",
  planetarium: "Planetarium",
  goldenChest: "Golden Chest",
  redChest: "Red Chest",
  beggar: "Beggar",
  demonBeggar: "Devil Beggar",
  keyMaster: "Key Master",
  bombBum: "Bomb Bum",
  batteryBum: "Battery Bum",
  rottenBeggar: "Rotten Beggar",
  momsChest: "Mom's Chest",
  oldChest: "Old Chest",
  woodenChest: "Wooden Chest",
  shellGame: "Shell Game",
  craneGame: "Crane Game",
  ultraSecret: "Ultra Secret Room",
  babyShop: "Baby Shop",
};

export function poolNames(pools: readonly string[] | undefined): string[] {
  return (pools ?? []).map((p) => POOL_NAMES[p] ?? p).sort((a, b) => a.localeCompare(b));
}
