import type { Item, StatKey, Stats, Transformation, Trinket } from "./types";

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

export interface TransformationProgress {
  id: string;
  name: string;
  /** Pickups that count in Repentance. */
  count: number;
  /** Pickups that count only in Repentance+, on top of `count`. */
  plus: number;
  needs: number;
  done: boolean;
  doneInPlus: boolean;
  /** The transformation exists only in Repentance+ (Necromancer). */
  plusOnly: boolean;
  note?: string;
}

/**
 * Progress toward each transformation the build has started, counted as Repentance counts it, with what
 * Repentance+ adds (decision 0006). Items and trinkets both count where the game counts them. Closest first.
 */
export function transformationProgress(
  entries: readonly (Item | Trinket)[],
  transformations: readonly Transformation[],
): TransformationProgress[] {
  const counts = new Map<string, { count: number; plus: number }>();
  const tally = (id: string) => counts.get(id) ?? counts.set(id, { count: 0, plus: 0 }).get(id)!;
  for (const entry of entries) {
    for (const id of entry.transformations ?? []) tally(id).count += 1;
    for (const id of entry.transformationsPlus ?? []) tally(id).plus += 1;
  }
  return transformations
    .filter((t) => counts.has(t.id))
    .map((t) => {
      const { count, plus } = counts.get(t.id)!;
      const plusOnly = t.items.length === 0 && t.trinkets.length === 0;
      return {
        id: t.id,
        name: t.name,
        count,
        plus,
        needs: t.needs,
        done: !plusOnly && count >= t.needs,
        doneInPlus: count + plus >= t.needs,
        plusOnly,
        ...(t.note ? { note: t.note } : {}),
      };
    })
    .sort((a, b) => b.count - a.count || b.plus - a.plus || a.name.localeCompare(b.name));
}

/** "2 of 3; 3 of 3 in Repentance+", "3 of 3, transformed", "Repentance+ only: 1 of 3". */
export function progressText(t: TransformationProgress): string {
  const of = (n: number) => `${Math.min(n, t.needs)} of ${t.needs}`;
  if (t.plusOnly) return `Repentance+ only: ${of(t.plus)}${t.doneInPlus ? ", transformed" : ""}`;
  if (t.done) return `${of(t.count)}, transformed`;
  return t.plus > 0 ? `${of(t.count)}; ${of(t.count + t.plus)} in Repentance+` : of(t.count);
}

/**
 * What a pickup counts toward, as both sides write it: "Conjoined, Seraphim (Repentance+ only)".
 * Mirrors `GameData.transformation_names` in api/app/gamedata.py; checked through data/tests/parity.json.
 */
export function transformationNames(
  record: Pick<Item, "transformations" | "transformationsPlus">,
  transformations: readonly Transformation[],
  plusOnlyTemplate: string,
): string {
  const names = new Map(transformations.map((t) => [t.id, t.name]));
  const name = (id: string) => names.get(id) ?? id;
  return [
    ...(record.transformations ?? []).map(name),
    ...(record.transformationsPlus ?? []).map((id) => plusOnlyTemplate.replace("{name}", name(id))),
  ].join(", ");
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
