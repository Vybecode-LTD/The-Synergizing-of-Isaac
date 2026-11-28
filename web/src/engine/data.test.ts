import synergiesJson from "@data/synergies.json";
import { describe, expect, it } from "vitest";
import { CHARACTERS, ITEMS, TRINKETS } from "../test/fixtures";
import { gameData, resolveSynergies } from "./data";
import { findSynergies } from "./synergy";
import type { SynergyRecord } from "./types";

describe("resolveSynergies", () => {
  const record = (over: Partial<SynergyRecord>): SynergyRecord => ({
    id: "x",
    items: [],
    trinkets: [],
    characters: [],
    rating: "B",
    description: "d",
    ...over,
  });

  it("reports a name that matches nothing instead of dropping it quietly", () => {
    const { synergies, unresolved } = resolveSynergies(
      [
        record({ id: "ok", items: ["Brim", "Tammy"] }),
        record({ id: "bad-trinket", items: ["Brim"], trinkets: ["Cancer"] }),
        record({ id: "bad-char", items: ["Right"], characters: ["Zed & Lil"] }),
      ],
      ITEMS,
      TRINKETS,
      CHARACTERS,
    );
    expect(synergies.map((s) => s.id)).toEqual(["ok"]);
    expect(unresolved).toEqual(['bad-trinket: trinket "Cancer"', 'bad-char: character "Zed & Lil"']);
  });
});

describe("the shipped data", () => {
  const records = synergiesJson as SynergyRecord[];

  it("resolves every synergy against the roster", () => {
    const { unresolved } = resolveSynergies(records, gameData.items, gameData.trinkets, gameData.characters);
    expect(unresolved).toEqual([]);
    expect(gameData.synergies).toHaveLength(records.length);
    expect(records.length).toBeGreaterThanOrEqual(445);
  });

  it("uses the game's own ids", () => {
    // The desktop app's data had Birthright as 626 and no item 619 at all.
    expect(gameData.itemBySlug.get("brimstone")?.id).toBe(118);
    expect(gameData.itemBySlug.get("birthright")?.id).toBe(619);
    expect(gameData.itemBySlug.get("glitched-crown")?.id).toBe(689);
    expect(gameData.itemBySlug.get("the-sad-onion")?.quality).toBe(3);
  });

  it("keeps the synergies that used to point at names the old data lacked", () => {
    // Regression: these never matched in the desktop app.
    const cancer = gameData.trinketBySlug.get("cancer")!;
    expect(gameData.synergies.filter((s) => s.trinketIds.includes(cancer.id)).length).toBeGreaterThanOrEqual(3);
    expect(gameData.synergies.some((s) => s.characterSlugs.includes("jacob-and-esau"))).toBe(true);
    const bible = gameData.itemBySlug.get("the-satanic-bible")!;
    expect(gameData.synergies.filter((s) => s.itemIds.includes(bible.id)).length).toBeGreaterThanOrEqual(2);
  });

  it("finds the classic combination end to end", () => {
    const brimstone = gameData.itemBySlug.get("brimstone")!.id;
    const tammy = gameData.itemBySlug.get("tammys-head")!.id;
    const found = findSynergies({ character: null, items: [brimstone, tammy], trinkets: [] }, gameData);
    expect(found[0]?.id).toBe("brimstone+tammys-head");
    expect(found[0]?.rating).toBe("S");
  });

  it("has a sprite position for every item and trinket", () => {
    expect(gameData.itemIndex.size).toBe(gameData.items.length);
    expect(gameData.trinketIndex.size).toBe(gameData.trinkets.length);
    expect(gameData.items.length).toBe(719);
    expect(gameData.trinkets.length).toBe(188);
    expect(gameData.characters.length).toBe(34);
  });
});
