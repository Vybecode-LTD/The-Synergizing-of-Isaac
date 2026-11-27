import charactersJson from "@data/characters.json";
import itemsJson from "@data/items.json";
import synergiesJson from "@data/synergies.json";
import transformationsJson from "@data/transformations.json";
import trinketsJson from "@data/trinkets.json";
import type { Character, Item, Synergy, SynergyRecord, Transformation, Trinket } from "./types";

export interface GameData {
  items: Item[];
  trinkets: Trinket[];
  characters: Character[];
  synergies: Synergy[];
  transformations: Transformation[];
  itemById: Map<number, Item>;
  itemBySlug: Map<string, Item>;
  itemIndex: Map<number, number>;
  trinketById: Map<number, Trinket>;
  trinketBySlug: Map<string, Trinket>;
  trinketIndex: Map<number, number>;
  characterBySlug: Map<string, Character>;
}

/** Turn name-keyed records into id-keyed synergies. Names that match nothing are returned, never dropped silently. */
export function resolveSynergies(
  records: SynergyRecord[],
  items: Item[],
  trinkets: Trinket[],
  characters: Character[],
): { synergies: Synergy[]; unresolved: string[] } {
  const itemByName = new Map(items.map((i) => [i.name, i.id]));
  const trinketByName = new Map(trinkets.map((t) => [t.name, t.id]));
  const characterByName = new Map(characters.map((c) => [c.name, c.slug]));
  const unresolved: string[] = [];
  const synergies: Synergy[] = [];

  for (const record of records) {
    const lookup = <T,>(names: string[], table: Map<string, T>, kind: string): T[] => {
      const found: T[] = [];
      for (const name of names) {
        const value = table.get(name);
        if (value === undefined) unresolved.push(`${record.id}: ${kind} "${name}"`);
        else found.push(value);
      }
      return found;
    };
    const itemIds = lookup(record.items, itemByName, "item");
    const trinketIds = lookup(record.trinkets, trinketByName, "trinket");
    const characterSlugs = lookup(record.characters, characterByName, "character");
    const complete =
      itemIds.length === record.items.length &&
      trinketIds.length === record.trinkets.length &&
      characterSlugs.length === record.characters.length;
    if (!complete) continue;
    synergies.push({
      id: record.id,
      itemIds,
      trinketIds,
      characterSlugs,
      rating: record.rating,
      description: record.description,
    });
  }
  return { synergies, unresolved };
}

export function createGameData(
  items: Item[],
  trinkets: Trinket[],
  characters: Character[],
  records: SynergyRecord[],
  transformations: Transformation[] = [],
): GameData {
  const { synergies } = resolveSynergies(records, items, trinkets, characters);
  return {
    items,
    trinkets,
    characters,
    synergies,
    transformations,
    itemById: new Map(items.map((i) => [i.id, i])),
    itemBySlug: new Map(items.map((i) => [i.slug, i])),
    itemIndex: new Map(items.map((i, index) => [i.id, index])),
    trinketById: new Map(trinkets.map((t) => [t.id, t])),
    trinketBySlug: new Map(trinkets.map((t) => [t.slug, t])),
    trinketIndex: new Map(trinkets.map((t, index) => [t.id, index])),
    characterBySlug: new Map(characters.map((c) => [c.slug, c])),
  };
}

/** The element the server puts the live community synergies in (api/app/community.py, ELEMENT_ID). */
export const COMMUNITY_ELEMENT_ID = "community-synergies";

const RATING_SET: ReadonlySet<string> = new Set(["S", "A", "B", "C", "D"]);
const numbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((v): v is number => typeof v === "number") : [];
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/**
 * The community synergies the server sent with the page, kept only where they make sense against this
 * roster. Anything malformed is dropped: a bad entry must never stop the page.
 */
export function communitySynergies(raw: unknown, data: GameData): Synergy[] {
  if (!Array.isArray(raw)) return [];
  const out: Synergy[] = [];
  for (const entry of raw as Record<string, unknown>[]) {
    if (!entry || typeof entry.id !== "string" || typeof entry.description !== "string") continue;
    if (!RATING_SET.has(entry.rating as string)) continue;
    const itemIds = numbers(entry.itemIds).filter((id) => data.itemById.has(id));
    const trinketIds = numbers(entry.trinketIds).filter((id) => data.trinketById.has(id));
    const characterSlugs = strings(entry.characterSlugs).filter((slug) => data.characterBySlug.has(slug));
    if (itemIds.length + trinketIds.length === 0) continue;
    out.push({
      id: entry.id,
      itemIds,
      trinketIds,
      characterSlugs,
      rating: entry.rating as Synergy["rating"],
      description: entry.description,
      community: true,
    });
  }
  return out;
}

/** What the server put in the page, or nothing (the dev server, tests, a page served before this existed). */
export function readCommunity(doc: Document | undefined = globalThis.document): unknown {
  const text = doc?.getElementById(COMMUNITY_ELEMENT_ID)?.textContent;
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

const curated = createGameData(
  itemsJson as Item[],
  trinketsJson as Trinket[],
  charactersJson as Character[],
  synergiesJson as SynergyRecord[],
  transformationsJson.transformations as Transformation[],
);

/** The curated list, then the community synergies the owner approved: the same list the server rendered from. */
export const gameData: GameData = {
  ...curated,
  synergies: [...curated.synergies, ...communitySynergies(readCommunity(), curated)],
};
