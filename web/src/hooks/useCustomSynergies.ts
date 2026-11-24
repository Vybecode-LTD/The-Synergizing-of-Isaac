import { useCallback, useState } from "react";
import { gameData } from "../engine/data";
import { RATINGS, type Rating, type Synergy } from "../engine/types";
import { readStored, writeStored } from "./storage";

const KEY = "issac-toys:my-synergies:v1";
export const MAX_DESCRIPTION = 600;

export interface NewSynergy {
  itemIds: number[];
  trinketIds: number[];
  character: string | null;
  rating: Rating;
  description: string;
}

/** Keep only entries that still make sense against today's roster. */
export function sanitize(raw: unknown): Synergy[] {
  if (!Array.isArray(raw)) return [];
  const out: Synergy[] = [];
  for (const entry of raw as Partial<Synergy>[]) {
    if (!entry || typeof entry.id !== "string" || typeof entry.description !== "string") continue;
    if (!RATINGS.includes(entry.rating as Rating)) continue;
    const itemIds = (entry.itemIds ?? []).filter((id) => gameData.itemById.has(id));
    const trinketIds = (entry.trinketIds ?? []).filter((id) => gameData.trinketById.has(id));
    const characterSlugs = (entry.characterSlugs ?? []).filter((slug) => gameData.characterBySlug.has(slug));
    if (itemIds.length + trinketIds.length === 0) continue;
    out.push({
      id: entry.id,
      itemIds,
      trinketIds,
      characterSlugs,
      rating: entry.rating as Rating,
      description: entry.description.slice(0, MAX_DESCRIPTION),
      custom: true,
    });
  }
  return out;
}

/** Synergies this visitor wrote themselves. They live in this browser only. */
export function useCustomSynergies() {
  const [mine, setMine] = useState<Synergy[]>(() => sanitize(readStored<unknown>(KEY, [])));

  const save = useCallback((next: Synergy[]) => {
    setMine(next);
    writeStored(KEY, next);
  }, []);

  const add = useCallback(
    (entry: NewSynergy) => {
      const synergy: Synergy = {
        id: `mine-${Date.now().toString(36)}`,
        itemIds: entry.itemIds,
        trinketIds: entry.trinketIds,
        characterSlugs: entry.character ? [entry.character] : [],
        rating: entry.rating,
        description: entry.description.trim().slice(0, MAX_DESCRIPTION),
        custom: true,
      };
      save([...mine, synergy]);
    },
    [mine, save],
  );

  const remove = useCallback((id: string) => save(mine.filter((s) => s.id !== id)), [mine, save]);

  return { mine, add, remove };
}
