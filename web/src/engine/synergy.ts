import type { GameData } from "./data";
import { RATINGS, type Build, type Rating, type Synergy } from "./types";

const RATING_ORDER: Record<Rating, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

export function compareRating(a: Rating, b: Rating): number {
  return RATING_ORDER[a] - RATING_ORDER[b];
}

/** Items the build really has: what was picked plus what the character starts with. */
export function effectiveItems(build: Build, data: GameData): Set<number> {
  const owned = new Set(build.items);
  const character = build.character ? data.characterBySlug.get(build.character) : undefined;
  for (const id of character?.startingItems ?? []) owned.add(id);
  if (character?.pocketActive !== undefined) owned.add(character.pocketActive);
  return owned;
}

/** How many separate requirements a synergy has. A list of alternative characters is one requirement. */
function requirements(synergy: Synergy): number {
  return synergy.itemIds.length + synergy.trinketIds.length + (synergy.characterSlugs.length > 0 ? 1 : 0);
}

function byStrength(a: Synergy, b: Synergy): number {
  // Plain code-unit order, not localeCompare: the API sorts the same list in Python and must agree.
  return compareRating(a.rating, b.rating) || requirements(b) - requirements(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

interface Gap {
  missingItems: number[];
  missingTrinkets: number[];
  /** Items and trinkets of the synergy the build already has. */
  held: number;
  needsCharacter: boolean;
  characterOk: boolean;
}

function gap(synergy: Synergy, build: Build, items: Set<number>, trinkets: Set<number>): Gap {
  const missingItems = synergy.itemIds.filter((id) => !items.has(id));
  const missingTrinkets = synergy.trinketIds.filter((id) => !trinkets.has(id));
  const needsCharacter = synergy.characterSlugs.length > 0;
  return {
    missingItems,
    missingTrinkets,
    held: synergy.itemIds.length + synergy.trinketIds.length - missingItems.length - missingTrinkets.length,
    needsCharacter,
    characterOk: !needsCharacter || (build.character !== null && synergy.characterSlugs.includes(build.character)),
  };
}

/**
 * Every synergy the build satisfies in full: all of its items and trinkets are
 * present, and if it names characters, the chosen one is among them.
 * Best rating first, then the more specific combination.
 */
export function findSynergies(build: Build, data: GameData, synergies: Synergy[] = data.synergies): Synergy[] {
  const items = effectiveItems(build, data);
  const trinkets = new Set(build.trinkets);
  return synergies
    .filter((s) => {
      const g = gap(s, build, items, trinkets);
      return g.missingItems.length === 0 && g.missingTrinkets.length === 0 && g.characterOk;
    })
    .sort(byStrength);
}

/**
 * Synergies the build's items and trinkets satisfy but that depend on a
 * character, when no character is chosen yet. Shown as "pick your character".
 */
export function awaitingCharacter(build: Build, data: GameData, synergies: Synergy[] = data.synergies): Synergy[] {
  if (build.character !== null) return [];
  const items = effectiveItems(build, data);
  const trinkets = new Set(build.trinkets);
  return synergies
    .filter((s) => {
      const g = gap(s, build, items, trinkets);
      return g.needsCharacter && g.missingItems.length === 0 && g.missingTrinkets.length === 0;
    })
    .sort(byStrength);
}

export type PickupKind = "item" | "trinket";

export interface Suggestion {
  kind: PickupKind;
  id: number;
  /** The synergies this one pickup would complete, best first. */
  completes: Synergy[];
  best: Rating;
}

/**
 * What one more pickup would unlock: synergies missing exactly one item or
 * trinket, that the build already touches (it holds another piece, or it is
 * the chosen character's own synergy). Synergies for other characters are
 * left out: nobody changes character mid-run.
 */
export function suggestAdditions(build: Build, data: GameData, synergies: Synergy[] = data.synergies): Suggestion[] {
  const items = effectiveItems(build, data);
  const trinkets = new Set(build.trinkets);
  const found = new Map<string, Suggestion>();

  for (const s of synergies) {
    const g = gap(s, build, items, trinkets);
    if (!g.characterOk) continue;
    if (g.missingItems.length + g.missingTrinkets.length !== 1) continue;
    if (g.held === 0 && !g.needsCharacter) continue;

    const kind: PickupKind = g.missingItems.length === 1 ? "item" : "trinket";
    const id = kind === "item" ? g.missingItems[0]! : g.missingTrinkets[0]!;
    const key = `${kind}:${id}`;
    const entry = found.get(key) ?? { kind, id, completes: [], best: s.rating };
    entry.completes.push(s);
    if (compareRating(s.rating, entry.best) < 0) entry.best = s.rating;
    found.set(key, entry);
  }

  const suggestions = [...found.values()];
  for (const s of suggestions) s.completes.sort(byStrength);
  return suggestions.sort(
    (a, b) => compareRating(a.best, b.best) || b.completes.length - a.completes.length || a.id - b.id,
  );
}

export type SubjectKind = PickupKind | "character";

/** Every synergy that involves this item, trinket or character, best first. */
export function synergiesFor(kind: SubjectKind, key: number | string, synergies: Synergy[]): Synergy[] {
  return synergies
    .filter((s) =>
      kind === "item"
        ? s.itemIds.includes(key as number)
        : kind === "trinket"
          ? s.trinketIds.includes(key as number)
          : s.characterSlugs.includes(key as string),
    )
    .sort(byStrength);
}

/** Names of the other pieces in this subject's strongest synergies, without repeats. Mirrors top_partners in the API. */
export function topPartners(kind: SubjectKind, key: number | string, data: GameData, limit = 3): string[] {
  const own =
    kind === "item"
      ? data.itemById.get(key as number)?.name
      : kind === "trinket"
        ? data.trinketById.get(key as number)?.name
        : undefined;
  const names: string[] = [];
  for (const s of synergiesFor(kind, key, data.synergies)) {
    const partners = [
      ...s.itemIds.map((id) => data.itemById.get(id)!.name),
      ...s.trinketIds.map((id) => data.trinketById.get(id)!.name),
    ].filter((name) => name !== own);
    if (kind !== "character") partners.push(...s.characterSlugs.map((slug) => data.characterBySlug.get(slug)!.name));
    for (const name of partners) {
      if (!names.includes(name)) names.push(name);
      if (names.length === limit) return names;
    }
  }
  return names;
}

/** How many synergies sit at each rating, in S..D order, for a one-line tally. */
export function tally(synergies: Synergy[]): { rating: Rating; count: number }[] {
  return RATINGS.map((rating) => ({ rating, count: synergies.filter((s) => s.rating === rating).length })).filter(
    (t) => t.count > 0,
  );
}

/** The build that shows a synergy: its items and trinkets, and its character when it needs exactly one. */
export function buildFor(synergy: Synergy): Build {
  return {
    character: synergy.characterSlugs.length === 1 ? synergy.characterSlugs[0]! : null,
    items: [...synergy.itemIds],
    trinkets: [...synergy.trinketIds],
  };
}
