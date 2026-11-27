import { describe, expect, it, vi } from "vitest";
import { isAnalysis, mentions } from "./api/analysis";
import { canSubmit } from "./api/submissions";
import { readStored, writeStored } from "./hooks/storage";
import { sanitize } from "./hooks/useCustomSynergies";
import { wordmarkParts } from "./site";

const BRIM = { kind: "item" as const, id: 118, name: "Brimstone" };
const BOMBS = { kind: "item" as const, id: 443, name: "Brimstone Bombs" };
const PENNY = { kind: "trinket" as const, id: 1, name: "Swallowed Penny" };

describe("mentions", () => {
  it("finds the build's pickups in a sentence, longest name first", () => {
    expect(mentions("Brimstone Bombs and Brimstone, then Swallowed Penny.", [BRIM, BOMBS, PENNY])).toEqual([
      { kind: "item", id: 443, name: "Brimstone Bombs" },
      { text: " and " },
      { kind: "item", id: 118, name: "Brimstone" },
      { text: ", then " },
      { kind: "trinket", id: 1, name: "Swallowed Penny" },
      { text: "." },
    ]);
  });

  it("matches whole words only, and leaves everything else as text", () => {
    expect(mentions("Brimstones are not Brimstone's, xBrimstone.", [BRIM])).toEqual([
      { text: "Brimstones are not " },
      { kind: "item", id: 118, name: "Brimstone" },
      { text: "'s, xBrimstone." },
    ]);
    expect(mentions("<img src=x onerror=alert(1)>", [BRIM])).toEqual([{ text: "<img src=x onerror=alert(1)>" }]);
    expect(mentions("", [BRIM])).toEqual([]);
  });
});

describe("isAnalysis", () => {
  const good = {
    read: { howItPlays: ["a"], bestInteractions: [], watchOutFor: [], verdict: { tier: "S", why: "b" } },
    found: [],
    cached: false,
    remaining: 1,
    limit: 2,
  };

  it("accepts the server's shape and nothing else", () => {
    expect(isAnalysis(good)).toBe(true);
    expect(isAnalysis({ text: "the old plain-text answer", cached: false })).toBe(false);
    expect(isAnalysis({ ...good, read: { ...good.read, verdict: { tier: "Z", why: "b" } } })).toBe(false);
    expect(isAnalysis({ ...good, read: { ...good.read, howItPlays: [1] } })).toBe(false);
    expect(isAnalysis({ ...good, found: null })).toBe(false);
    expect(isAnalysis(null)).toBe(false);
  });
});

describe("canSubmit", () => {
  it("needs two things, and at least one pickup", () => {
    expect(canSubmit([118, 38], [], [])).toBe(true);
    expect(canSubmit([118], [], ["azazel"])).toBe(true);
    expect(canSubmit([], [1], ["azazel"])).toBe(true);
    expect(canSubmit([118], [], [])).toBe(false);
    expect(canSubmit([], [], ["azazel", "isaac"])).toBe(false);
  });
});

describe("saved synergies", () => {
  it("keeps valid entries and drops anything that no longer makes sense", () => {
    const good = { id: "mine-1", itemIds: [118, 99999], trinketIds: [], characterSlugs: ["azazel", "nobody"], rating: "A", description: "ok" };
    const out = sanitize([
      good,
      { id: "mine-2", itemIds: [99999], trinketIds: [], characterSlugs: [], rating: "A", description: "no known pieces" },
      { id: "mine-3", itemIds: [118], trinketIds: [], characterSlugs: [], rating: "Z", description: "bad rating" },
      { itemIds: [118], rating: "A", description: "no id" },
      null,
      "junk",
    ]);
    expect(out).toEqual([
      { id: "mine-1", itemIds: [118], trinketIds: [], characterSlugs: ["azazel"], rating: "A", description: "ok", custom: true },
    ]);
    expect(sanitize("not a list")).toEqual([]);
  });

  it("survives lists that were saved as something else", () => {
    // Review finding: a number or a string where a list belongs threw, and the page never rendered.
    const out = sanitize([
      { id: "mine-4", itemIds: 5, trinketIds: "39", characterSlugs: { a: 1 }, rating: "A", description: "not lists" },
      { id: "mine-5", itemIds: [118, "118", null], trinketIds: null, characterSlugs: [7, "azazel"], rating: "B", description: "mixed" },
      { id: "mine-6", itemIds: [], trinketIds: [39, "39", 99999], characterSlugs: [], rating: "C", description: "trinket only" },
    ]);
    expect(out).toEqual([
      { id: "mine-5", itemIds: [118], trinketIds: [], characterSlugs: ["azazel"], rating: "B", description: "mixed", custom: true },
      { id: "mine-6", itemIds: [], trinketIds: [39], characterSlugs: [], rating: "C", description: "trinket only", custom: true },
    ]);
  });
});

describe("storage", () => {
  it("round-trips a value and falls back when nothing or garbage is stored", () => {
    writeStored("k", { a: 1 });
    expect(readStored("k", null)).toEqual({ a: 1 });
    expect(readStored("missing", "fallback")).toBe("fallback");
    localStorage.setItem("broken", "{not json");
    expect(readStored("broken", 7)).toBe(7);
  });

  it("carries on when the browser refuses storage", () => {
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeStored("k", 1)).not.toThrow();
    set.mockRestore();
  });
});

describe("wordmark", () => {
  it("splits the domain at its first dot", () => {
    expect(wordmarkParts("isaac.toys")).toEqual(["isaac", ".toys"]);
    expect(wordmarkParts("localhost")).toEqual(["localhost", ""]);
  });
});
