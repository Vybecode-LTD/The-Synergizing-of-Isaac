import { describe, expect, it } from "vitest";
import { ITEMS, TRINKETS } from "../test/fixtures";
import { gameData } from "./data";
import {
  type TransformationProgress,
  formatStat,
  poolNames,
  progressText,
  statLines,
  totalStats,
  transformationNames,
  transformationProgress,
} from "./summary";
import type { Item, Trinket } from "./types";

const pick = (...ids: number[]) => ITEMS.filter((i) => ids.includes(i.id));

describe("formatStat", () => {
  it("signs flat changes and marks multipliers", () => {
    expect(formatStat("damage", 1.5)).toBe("+1.5");
    expect(formatStat("tears", -0.4)).toBe("−0.4");
    expect(formatStat("damageMult", 2)).toBe("×2");
    expect(formatStat("tearsMult", 0.33)).toBe("×0.33");
  });
});

describe("statLines", () => {
  it("lists an item's changes in a fixed order and skips zeros", () => {
    const lines = statLines({ luck: 1, damage: 0, tears: 0.7, damageMult: 1.5 });
    expect(lines.map((l) => `${l.label} ${l.text}`)).toEqual(["Damage ×1.5", "Tears +0.7", "Luck +1"]);
  });

  it("is empty for an item with no stats", () => {
    expect(statLines(undefined)).toEqual([]);
  });
});

describe("totalStats", () => {
  it("adds flat changes and multiplies multipliers across items and trinkets", () => {
    const lines = totalStats([...pick(1, 8, 9), TRINKETS[0]!]);
    expect(lines.map((l) => `${l.key} ${l.text}`)).toEqual([
      "damage +3.5", // 0.5 + 1 + 2
      "damageMult ×1.5",
      "tears +0.2",
      "tearsMult ×0.33",
    ]);
  });

  it("is empty for nothing", () => {
    expect(totalStats([])).toEqual([]);
  });

  it("drops a stat whose changes cancel out", () => {
    // Review finding: 0.1 + 0.2 - 0.3 is 5.6e-17 in floating point, which was shown as "+0".
    const speed = (value: number) => ({ ...ITEMS[0]!, stats: { speed: value } });
    expect(totalStats([speed(0.1), speed(0.2), speed(-0.3)])).toEqual([]);
    // Controls: a real remainder is kept, and so is a small one.
    expect(totalStats([speed(0.1), speed(0.2), speed(-0.2)]).map((l) => l.text)).toEqual(["+0.1"]);
    expect(totalStats([speed(0.01)]).map((l) => l.text)).toEqual(["+0.01"]);
  });
});

// The real data: these facts are the wiki's Repentance lists (data/transformations.json, decision 0006).
const item = (name: string) => {
  const found = gameData.items.find((i) => i.name === name);
  if (!found) throw new Error(`no item ${name}`);
  return found;
};
const trinket = (name: string) => {
  const found = gameData.trinkets.find((t) => t.name === name);
  if (!found) throw new Error(`no trinket ${name}`);
  return found;
};
const progress = (...entries: (Item | Trinket)[]) => transformationProgress(entries, gameData.transformations);
const row = (rows: TransformationProgress[], id: string) => rows.find((r) => r.id === id);

describe("transformationProgress", () => {
  it("counts as Repentance does and keeps what Repentance+ adds apart", () => {
    // Infestation counts toward Beelzebub only in Repentance+ (the tracker counted it everywhere).
    const beelzebub = row(progress(item("Halo of Flies"), item("Skatole"), item("Infestation")), "beelzebub")!;
    expect(beelzebub).toMatchObject({ count: 2, plus: 1, needs: 3, done: false, doneInPlus: true, plusOnly: false });
    expect(progressText(beelzebub)).toBe("2 of 3; 3 of 3 in Repentance+");
  });

  it("counts Skatole toward Oh Crap, which the tracker left out", () => {
    const rows = progress(item("Skatole"));
    expect(rows.map((r) => [r.id, r.count])).toEqual([
      ["beelzebub", 1],
      ["oh-crap", 1],
    ]);
  });

  it("counts a trinket where the game does: Kid's Drawing toward Guppy", () => {
    const guppy = row(progress(item("Guppy's Head"), item("Guppy's Tail"), trinket("Kid's Drawing")), "guppy")!;
    expect(guppy).toMatchObject({ count: 3, done: true });
    expect(progressText(guppy)).toBe("3 of 3, transformed");
  });

  it("shows Necromancer as a Repentance+ transformation", () => {
    const rows = progress(item("The Necronomicon"), item("Missing Page 2"), trinket("A Missing Page"));
    const necromancer = row(rows, "necromancer")!;
    expect(necromancer).toMatchObject({ count: 0, plus: 3, plusOnly: true, done: false, doneInPlus: true });
    expect(progressText(necromancer)).toBe("Repentance+ only: 3 of 3, transformed");
    expect(progressText({ ...necromancer, plus: 1, doneInPlus: false })).toBe("Repentance+ only: 1 of 3");
    // The Necronomicon still counts toward Bookworm in Repentance.
    expect(row(rows, "bookworm")).toMatchObject({ count: 1, plus: 0 });
  });

  it("no longer counts Guardian Angel toward Seraphim", () => {
    expect(progress(item("Guardian Angel")).map((r) => r.id)).toEqual(["conjoined"]);
  });

  it("carries a note where pills count too (Stompy)", () => {
    expect(row(progress(item("Leo")), "stompy")).toMatchObject({ count: 1, note: "One Makes You Larger pills count too." });
  });

  it("lists the closest first and stops counting past three", () => {
    const rows = progress(item("Brimstone"), item("Abaddon"), item("The Pact"), item("The Mark"), item("Mom's Knife"));
    expect(rows.map((r) => [r.id, r.count])).toEqual([
      ["leviathan", 4],
      ["yes-mother", 1],
    ]);
    expect(progressText(rows[0]!)).toBe("3 of 3, transformed");
    expect(progressText(rows[1]!)).toBe("1 of 3");
  });

  it("counts nothing for pickups that count toward nothing", () => {
    expect(progress(item("The Sad Onion"))).toEqual([]);
  });
});

describe("transformationNames", () => {
  const names = (record: Item | Trinket) => transformationNames(record, gameData.transformations, "{name} (Repentance+ only)");
  it("writes the Repentance ones first, then those that count only in Repentance+", () => {
    expect(names(item("Seraphim"))).toBe("Conjoined, Seraphim (Repentance+ only)");
    expect(names(trinket("Bob's Bladder"))).toBe("Bob (Repentance+ only)");
    expect(names(item("Brimstone"))).toBe("Leviathan");
  });
  it("is empty for a pickup that counts toward nothing, and keeps an unknown id visible", () => {
    expect(names(item("The Sad Onion"))).toBe("");
    expect(transformationNames({ transformations: ["mystery"] }, [], "{name}+")).toBe("mystery");
  });
});

describe("poolNames", () => {
  it("names pools for people, sorted", () => {
    expect(poolNames(["treasure", "devil", "ultraSecret"])).toEqual(["Devil Room", "Treasure Room", "Ultra Secret Room"]);
    expect(poolNames(undefined)).toEqual([]);
  });
});
