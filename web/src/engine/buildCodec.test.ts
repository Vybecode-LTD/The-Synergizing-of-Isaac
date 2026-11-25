import { describe, expect, it } from "vitest";
import { world } from "../test/fixtures";
import {
  MAX_ITEMS,
  addItem,
  addTrinket,
  builderPath,
  decodeBuild,
  encodeBuild,
  isEmpty,
  removeItem,
  removeTrinket,
} from "./buildCodec";
import { EMPTY_BUILD, type Build } from "./types";

const decode = (query: string) => decodeBuild(new URLSearchParams(query), world);

describe("encodeBuild / decodeBuild", () => {
  it("round-trips a full build", () => {
    const build: Build = { character: "zed", items: [1, 4, 3], trinkets: [2] };
    expect(encodeBuild(build)).toBe("c=zed&i=1.4.3&t=2");
    expect(decode(encodeBuild(build))).toEqual(build);
  });

  it("encodes an empty build as nothing", () => {
    expect(encodeBuild(EMPTY_BUILD)).toBe("");
    expect(builderPath(EMPTY_BUILD)).toBe("/");
    expect(builderPath({ ...EMPTY_BUILD, items: [1] })).toBe("/?i=1");
    expect(decode("")).toEqual(EMPTY_BUILD);
  });

  it("ignores unknown ids, repeats and junk, so an old link still opens", () => {
    expect(decode("c=nobody&i=1.999.1.abc.-3..4&t=77.2")).toEqual({ character: null, items: [1, 4], trinkets: [2] });
  });

  it("does not read ids longer than the game could have", () => {
    expect(decode("i=00001.1").items).toEqual([1]);
  });

  it("caps the number of items", () => {
    const many = Array.from({ length: 40 }, () => "1.2.3.4.5.6.7.8.9").join(".");
    expect(decode(`i=${many}`).items.length).toBeLessThanOrEqual(MAX_ITEMS);
  });
});

describe("editing a build", () => {
  it("adds once and removes", () => {
    let b = addItem(EMPTY_BUILD, 1);
    b = addItem(b, 1);
    b = addTrinket(b, 2);
    b = addTrinket(b, 2);
    expect(b).toEqual({ character: null, items: [1], trinkets: [2] });
    expect(isEmpty(b)).toBe(false);
    b = removeTrinket(removeItem(b, 1), 2);
    expect(isEmpty(b)).toBe(true);
  });

  it("never mutates the build it was given", () => {
    const before: Build = { character: null, items: [1], trinkets: [] };
    addItem(before, 2);
    removeItem(before, 1);
    expect(before).toEqual({ character: null, items: [1], trinkets: [] });
  });
});
