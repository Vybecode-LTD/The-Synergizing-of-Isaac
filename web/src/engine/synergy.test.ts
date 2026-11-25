import { describe, expect, it } from "vitest";
import { world } from "../test/fixtures";
import {
  awaitingCharacter,
  buildFor,
  effectiveItems,
  findSynergies,
  suggestAdditions,
  synergiesFor,
  tally,
} from "./synergy";
import type { Build } from "./types";

const build = (items: number[] = [], trinkets: number[] = [], character: string | null = null): Build => ({
  character,
  items,
  trinkets,
});
const ids = (list: { id: string }[]) => list.map((s) => s.id);

describe("findSynergies", () => {
  it("returns nothing for an empty build", () => {
    expect(findSynergies(build(), world)).toEqual([]);
  });

  it("needs every item of a synergy, not just one", () => {
    expect(ids(findSynergies(build([1]), world))).toEqual([]);
    expect(ids(findSynergies(build([1, 2]), world))).toEqual(["brim+tammy"]);
  });

  it("orders by rating, then by the more specific combination", () => {
    expect(ids(findSynergies(build([1, 2, 3, 4]), world))).toEqual([
      "brim+tammy", // S
      "brim+knife+tech", // A, three pieces
      "brim+tech", // A, two pieces
      "knife+tech", // B
    ]);
  });

  it("shows a character's synergy only for that character", () => {
    expect(ids(findSynergies(build([5]), world))).toEqual([]);
    expect(ids(findSynergies(build([5], [], "zed"), world))).toEqual(["right+c-zed"]);
    expect(ids(findSynergies(build([5], [], "lil"), world))).toEqual(["right+c-lil"]);
  });

  it("counts the items a character starts with", () => {
    expect(ids(findSynergies(build([4]), world))).toEqual([]);
    expect(ids(findSynergies(build([4], [], "lil"), world))).toEqual(["box+tech"]);
  });

  it("counts a character's pocket active item", () => {
    expect(ids(findSynergies(build([1], [], "tainted-zed"), world))).toEqual(["brim+tammy"]);
    expect([...effectiveItems(build([1], [], "tainted-zed"), world)].sort()).toEqual([1, 2]);
  });

  it("matches trinkets, alone and with items", () => {
    expect(ids(findSynergies(build([], [1]), world))).toEqual(["t-horn"]);
    expect(ids(findSynergies(build([1], [1]), world))).toEqual(["brim+t-horn", "t-horn"]);
    expect(ids(findSynergies(build([1], [2]), world))).toEqual([]);
  });

  it("can be given a different list, such as a visitor's own synergies", () => {
    const own = [{ ...world.synergies[0]!, id: "mine", itemIds: [6], custom: true }];
    expect(ids(findSynergies(build([6]), world, own))).toEqual(["mine"]);
  });
});

describe("awaitingCharacter", () => {
  it("lists character synergies the items already satisfy when no character is chosen", () => {
    expect(ids(awaitingCharacter(build([5]), world))).toEqual(["right+c-zed", "right+c-lil"]);
  });

  it("is empty once a character is chosen, and when the items are missing", () => {
    expect(awaitingCharacter(build([5], [], "zed"), world)).toEqual([]);
    expect(awaitingCharacter(build([1]), world)).toEqual([]);
  });
});

describe("suggestAdditions", () => {
  it("suggests nothing for an empty build", () => {
    // "t-horn" needs one trinket and nothing else; it must not be offered to everyone.
    expect(suggestAdditions(build(), world)).toEqual([]);
  });

  it("offers the single missing piece of synergies the build already touches", () => {
    const out = suggestAdditions(build([1]), world);
    expect(out.map((s) => [s.kind, s.id, s.best])).toEqual([
      ["item", 2, "S"], // Tammy completes brim+tammy
      ["item", 4, "A"], // Tech completes brim+tech
      ["trinket", 1, "B"], // Horn completes brim+t-horn
    ]);
  });

  it("does not offer a piece of a synergy that would still be incomplete", () => {
    // brim+knife+tech is two pieces away from [Brim], so Knife is not suggested.
    expect(suggestAdditions(build([1]), world).some((s) => s.kind === "item" && s.id === 3)).toBe(false);
  });

  it("groups everything one pickup completes and ranks by the best of them", () => {
    const out = suggestAdditions(build([1, 4]), world);
    const knife = out.find((s) => s.kind === "item" && s.id === 3)!;
    expect(ids(knife.completes)).toEqual(["brim+knife+tech", "knife+tech"]);
    expect(knife.best).toBe("A");
    expect(out.map((s) => `${s.kind}:${s.id}`)).toEqual(["item:2", "item:3", "trinket:1", "item:7"]);
  });

  it("offers the chosen character's own synergies and never another character's", () => {
    const out = suggestAdditions(build([], [], "zed"), world);
    expect(out).toHaveLength(1);
    expect(ids(out[0]!.completes)).toEqual(["right+c-zed"]);
  });

  it("does not suggest what the build already has through the character", () => {
    // Lil starts with Box, so with Tech the box+tech synergy is complete, not a suggestion.
    expect(suggestAdditions(build([4], [], "lil"), world).some((s) => s.id === 7)).toBe(false);
  });
});

describe("helpers", () => {
  it("tallies by rating in S to D order and skips empty ratings", () => {
    expect(tally(findSynergies(build([1, 2, 3, 4]), world))).toEqual([
      { rating: "S", count: 1 },
      { rating: "A", count: 2 },
      { rating: "B", count: 1 },
    ]);
  });

  it("finds every synergy for an item, a trinket and a character", () => {
    expect(ids(synergiesFor("item", 4, world.synergies))).toEqual([
      "brim+knife+tech",
      "brim+tech",
      "knife+tech",
      "box+tech",
    ]);
    expect(ids(synergiesFor("trinket", 1, world.synergies))).toEqual(["brim+t-horn", "t-horn"]);
    expect(ids(synergiesFor("character", "lil", world.synergies))).toEqual(["right+c-lil"]);
  });

  it("builds the loadout that shows a synergy", () => {
    const zed = world.synergies.find((s) => s.id === "right+c-zed")!;
    expect(buildFor(zed)).toEqual({ character: "zed", items: [5], trinkets: [] });
    const horned = world.synergies.find((s) => s.id === "brim+t-horn")!;
    expect(buildFor(horned)).toEqual({ character: null, items: [1], trinkets: [1] });
  });
});
