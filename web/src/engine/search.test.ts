import { describe, expect, it } from "vitest";
import { matchScore, normalize, search } from "./search";

const names = (list: { name: string }[]) => list.map((e) => e.name);
const entries = [
  { name: "Mom's Knife", weight: 4 },
  { name: "Knife Piece 1", weight: 1 },
  { name: "Sacrificial Dagger", weight: 3 },
  { name: "Technology", weight: 3 },
  { name: "Technology 2", weight: 2 },
  { name: "Tech X", weight: 4 },
  { name: "Tech.5", weight: 2 },
  { name: "The Sad Onion", weight: 3 },
  { name: "Poké Go", weight: 1 },
];

describe("normalize", () => {
  it("ignores case, apostrophes, accents and punctuation", () => {
    expect(normalize("Mom's Knife")).toBe("moms knife");
    expect(normalize("  Poké Go ")).toBe("poke go");
    expect(normalize("Tech.5")).toBe("tech5");
    expect(normalize("20/20")).toBe("20 20");
  });
});

describe("matchScore", () => {
  it("ranks exact, prefix, word prefix, substring and loose matches in that order", () => {
    const scores = [
      matchScore("technology", "Technology"),
      matchScore("tech", "Technology"),
      matchScore("knife", "Mom's Knife"),
      matchScore("nolog", "Technology"),
      matchScore("tcx", "Tech X"),
    ];
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(new Set(scores).size).toBe(scores.length);
  });

  it("scores nothing for an empty query or no match", () => {
    expect(matchScore("", "Technology")).toBe(0);
    expect(matchScore("   ", "Technology")).toBe(0);
    expect(matchScore("zzz", "Technology")).toBe(0);
    // Two stray letters in order are not a match: that would match half the list.
    expect(matchScore("tx", "Tech X")).toBe(0);
  });
});

describe("search", () => {
  it("returns nothing for an empty query", () => {
    expect(search("", entries)).toEqual([]);
  });

  it("finds a name typed without its apostrophe", () => {
    expect(names(search("moms kn", entries))).toEqual(["Mom's Knife"]);
  });

  it("puts the exact name first, then prefixes by weight", () => {
    expect(names(search("technology", entries))).toEqual(["Technology", "Technology 2"]);
    expect(names(search("tech", entries))).toEqual(["Tech X", "Technology", "Tech.5", "Technology 2"]);
  });

  it("matches a word in the middle of a name", () => {
    expect(names(search("knife", entries))).toEqual(["Knife Piece 1", "Mom's Knife"]);
    expect(names(search("onion", entries))).toEqual(["The Sad Onion"]);
  });

  it("honours the limit", () => {
    expect(search("t", entries, 2)).toHaveLength(2);
  });
});
