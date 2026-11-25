// The share card prints what data/ holds, not numbers someone typed (contract: toy-box-redesign, §7).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { ogCounts, ogHtml, splitDomain } from "./og-card.mjs";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");
const length = (name) => JSON.parse(readFileSync(path.join(dataDir, `${name}.json`), "utf8")).length;
const fonts = { display: "/fonts/display.woff2", sans: "/fonts/sans.woff2" };

describe("ogCounts", () => {
  let work;
  afterEach(() => work && rmSync(work, { recursive: true, force: true }));

  it("counts each list in a data folder", () => {
    work = mkdtempSync(path.join(tmpdir(), "og-test-"));
    const lists = { items: 3, trinkets: 2, characters: 1, synergies: 5 };
    for (const [name, n] of Object.entries(lists)) {
      writeFileSync(path.join(work, `${name}.json`), JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: i }))));
    }
    expect(ogCounts(work)).toEqual(lists);
  });

  it("matches the real data/", () => {
    expect(ogCounts(dataDir)).toEqual({
      items: length("items"),
      trinkets: length("trinkets"),
      characters: length("characters"),
      synergies: length("synergies"),
    });
  });
});

describe("ogHtml", () => {
  const counts = { items: 719, trinkets: 188, characters: 34, synergies: 453 };
  const html = (over = {}) => ogHtml({ domain: "isaac.toys", counts, fonts, sprites: [], ...over });

  it("prints every count", () => {
    for (const text of ["719 items", "188 trinkets", "34 characters", "453 synergies"]) {
      expect(html()).toContain(`<li>${text}</li>`);
    }
  });

  it("prints a changed count, not a remembered one", () => {
    const changed = html({ counts: { ...counts, synergies: 454 } });
    expect(changed).toContain("<li>454 synergies</li>");
    expect(changed).not.toContain("453 synergies");
  });

  it("puts the top-level domain on the sticker and escapes names", () => {
    const page = html({ sprites: [{ file: "/a.png", name: "Mom's <Knife>", width: 64, height: 64 }] });
    expect(page).toContain('isaac<span class="tld">.toys</span>');
    expect(page).toContain("Mom's &lt;Knife&gt;");
  });
});

describe("splitDomain", () => {
  it("splits at the first dot", () => {
    expect(splitDomain("isaac.toys")).toEqual(["isaac", ".toys"]);
    expect(splitDomain("issac.toys")).toEqual(["issac", ".toys"]);
    expect(splitDomain("localhost")).toEqual(["localhost", ""]);
  });
});
