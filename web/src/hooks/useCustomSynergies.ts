import { useCallback, useState } from "react";
import { gameData } from "../engine/data";
import { RATINGS, type Rating, type Synergy } from "../engine/types";
import { readStored, writeStored } from "./storage";

const KEY = "isaac-toys:my-synergies:v1";
export const MAX_DESCRIPTION = 600;

export interface NewSynergy {
  itemIds: number[];
  trinketIds: number[];
  character: string | null;
  rating: Rating;
  description: string;
}

/** What was saved as a list, or nothing: storage can hold anything, and a bad entry must not stop the page. */
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Keep only entries that still make sense against today's roster. */
export function sanitize(raw: unknown): Synergy[] {
  if (!Array.isArray(raw)) return [];
  const out: Synergy[] = [];
  for (const entry of raw as Partial<Synergy>[]) {
    if (!entry || typeof entry.id !== "string" || typeof entry.description !== "string") continue;
    if (!RATINGS.includes(entry.rating as Rating)) continue;
    const itemIds = list(entry.itemIds).filter(
      (id): id is number => typeof id === "number" && gameData.itemById.has(id),
    );
    const trinketIds = list(entry.trinketIds).filter(
      (id): id is number => typeof id === "number" && gameData.trinketById.has(id),
    );
    const characterSlugs = list(entry.characterSlugs).filter(
      (slug): slug is string => typeof slug === "string" && gameData.characterBySlug.has(slug),
    );
    if (itemIds.length + trinketIds.length === 0) continue;
    out.push({
      id: entry.id,
      itemIds,
      trinketIds,
      characterSlugs,
      rating: entry.rating as Rating,
      description: entry.description.slice(0, MAX_DESCRIPTION),
      custom: true,
      ...(entry.submitted === true ? { submitted: true } : {}),
    });
  }
  return out;
}

/** Counts saves in this page's life, so two in the same millisecond still get different ids. */
let serial = 0;

/** Synergies this visitor wrote themselves. They live in this browser only. */
export function useCustomSynergies() {
  const [mine, setMine] = useState<Synergy[]>(() => sanitize(readStored<unknown>(KEY, [])));

  // Every change is made to the latest list, never to the one a callback's render saw: a send's completion
  // can run after the visitor deleted or added another, and must not undo that (CodeRabbit, PR #12).
  const update = useCallback((change: (list: Synergy[]) => Synergy[]) => {
    setMine((list) => {
      const next = change(list);
      writeStored(KEY, next);
      return next;
    });
  }, []);

  const add = useCallback(
    (entry: NewSynergy, submitted = false) => {
      const synergy: Synergy = {
        // Two saves in the same millisecond (saving several AI finds) must not share an id.
        id: `mine-${Date.now().toString(36)}-${(serial++).toString(36)}`,
        itemIds: entry.itemIds,
        trinketIds: entry.trinketIds,
        characterSlugs: entry.character ? [entry.character] : [],
        rating: entry.rating,
        description: entry.description.trim().slice(0, MAX_DESCRIPTION),
        custom: true,
        ...(submitted ? { submitted: true } : {}),
      };
      update((list) => [...list, synergy]);
    },
    [update],
  );

  const remove = useCallback((id: string) => update((list) => list.filter((s) => s.id !== id)), [update]);

  const markSubmitted = useCallback(
    (id: string) => update((list) => list.map((s) => (s.id === id ? { ...s, submitted: true } : s))),
    [update],
  );

  return { mine, add, remove, markSubmitted };
}
