import { describe, expect, it } from "vitest";
import { ITEMS, TRINKETS } from "../test/fixtures";
import { formatStat, poolNames, statLines, totalStats, transformationProgress } from "./summary";

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

describe("transformationProgress", () => {
  it("counts toward each transformation and marks three as done", () => {
    expect(transformationProgress(pick(1, 8))).toEqual([
      { id: "leviathan", name: "Leviathan", count: 2, needs: 3, done: false },
    ]);
    expect(transformationProgress(pick(1, 3, 8, 9))).toEqual([
      { id: "leviathan", name: "Leviathan", count: 3, needs: 3, done: true },
      { id: "yes-mother", name: "Yes Mother?", count: 1, needs: 3, done: false },
    ]);
  });
});

describe("poolNames", () => {
  it("names pools for people, sorted", () => {
    expect(poolNames(["treasure", "devil", "ultraSecret"])).toEqual(["Devil Room", "Treasure Room", "Ultra Secret Room"]);
    expect(poolNames(undefined)).toEqual([]);
  });
});
