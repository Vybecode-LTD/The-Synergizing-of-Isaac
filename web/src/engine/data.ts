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

export const gameData: GameData = createGameData(
  itemsJson as Item[],
  trinketsJson as Trinket[],
  charactersJson as Character[],
  synergiesJson as SynergyRecord[],
  transformationsJson.transformations as Transformation[],
);
