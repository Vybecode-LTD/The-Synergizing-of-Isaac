import parityJson from "@data/tests/parity.json";
import { describe, expect, it } from "vitest";
import { gameData } from "./engine/data";
import { awaitingCharacter, findSynergies, suggestAdditions } from "./engine/synergy";
import type { Build } from "./engine/types";
import { clamp, describePage, fitTitle, joinNames, longDate } from "./seo";

/**
 * data/tests/parity.json is written by the API (`python -m app.parity`). These tests compute the same
 * things in the browser's code. A difference means the server and the app would tell a crawler and a
 * person two different things.
 */
describe("the browser agrees with the server", () => {
  it("has cases to check", () => {
    expect(parityJson.pages.length).toBeGreaterThanOrEqual(12);
    expect(parityJson.builds.length).toBeGreaterThanOrEqual(8);
  });

  it.each(parityJson.pages.map((p) => [p.path, p] as const))("describes %s the same way", (path, expected) => {
    const page = describePage(path, gameData, parityJson.domain);
    expect({
      path,
      kind: page.kind,
      title: page.title,
      description: page.description,
      h1: page.h1,
      lede: page.lede,
      answer: page.answer,
    }).toEqual(expected);
  });

  it.each(parityJson.builds.map((b) => [JSON.stringify(b.build), b] as const))(
    "finds the same synergies for %s",
    (_, expected) => {
      const build = expected.build as Build;
      expect(findSynergies(build, gameData).map((s) => s.id)).toEqual(expected.matched);
      expect(awaitingCharacter(build, gameData).map((s) => s.id)).toEqual(expected.awaitingCharacter);
      expect(
        suggestAdditions(build, gameData).map((s) => ({
          kind: s.kind,
          id: s.id,
          best: s.best,
          completes: s.completes.map((c) => c.id),
        })),
      ).toEqual(expected.suggestions);
    },
  );
});

describe("page text rules", () => {
  it("keeps every title within 60 characters and every description within 160", () => {
    const paths = [
      "/",
      "/items",
      "/trinkets",
      "/characters",
      "/synergies",
      "/about",
      ...gameData.items.map((i) => `/items/${i.slug}`),
      ...gameData.trinkets.map((t) => `/trinkets/${t.slug}`),
      ...gameData.characters.map((c) => `/characters/${c.slug}`),
    ];
    const tooLong = paths.map((p) => describePage(p)).filter((p) => p.title.length > 60 || p.description.length > 160);
    expect(tooLong.map((p) => p.path)).toEqual([]);
    expect(new Set(paths.map((p) => describePage(p).title)).size).toBe(paths.length);
  });

  it("picks the first title that fits, or the last one", () => {
    expect(fitTitle(["{name} is long enough to overflow the sixty character limit for sure", "{name} short"], { name: "X" })).toBe(
      "X short",
    );
    expect(fitTitle(["{name} fits"], { name: "X" })).toBe("X fits");
  });

  it("cuts a long description at a word and marks the cut", () => {
    const long = `${"word ".repeat(40)}end`;
    const cut = clamp(long);
    expect(cut.length).toBeLessThanOrEqual(160);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut).not.toMatch(/ …$/);
    expect(clamp("short")).toBe("short");
  });

  it("joins names and writes dates the way the server does", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A and B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
    expect(longDate("2026-11-24")).toBe("24 November 2026");
  });

  it("sends an unknown address to the not-found page", () => {
    expect(describePage("/items/not-a-real-item").kind).toBe("notFound");
    expect(describePage("/items/brimstone/extra").kind).toBe("notFound");
    expect(describePage("/items/").kind).toBe("items");
  });
});
