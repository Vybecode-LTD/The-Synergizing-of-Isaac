import { describe, expect, it, vi } from "vitest";
import { analysisBlocks } from "./api/analysis";
import { readStored, writeStored } from "./hooks/storage";
import { sanitize } from "./hooks/useCustomSynergies";
import { wordmarkParts } from "./site";

describe("analysisBlocks", () => {
  it("splits the model's plain text into headings, lists and paragraphs", () => {
    const text = "How it plays:\n- First point\n* Second point\n\nA plain sentence.\n**Verdict:**\nS: strong.";
    expect(analysisBlocks(text)).toEqual([
      { kind: "heading", text: "How it plays" },
      { kind: "list", items: ["First point", "Second point"] },
      { kind: "paragraph", text: "A plain sentence." },
      { kind: "heading", text: "Verdict" },
      { kind: "paragraph", text: "S: strong." },
    ]);
  });

  it("treats markup as text, never as HTML", () => {
    expect(analysisBlocks("<img src=x onerror=alert(1)>")).toEqual([
      { kind: "paragraph", text: "<img src=x onerror=alert(1)>" },
    ]);
  });

  it("does not mistake a long sentence ending in a colon for a heading", () => {
    const long = "This is a long sentence that happens to end with a colon:";
    expect(analysisBlocks(long)).toEqual([{ kind: "paragraph", text: long }]);
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
    expect(wordmarkParts("issac.toys")).toEqual(["issac", ".toys"]);
    expect(wordmarkParts("localhost")).toEqual(["localhost", ""]);
  });
});
