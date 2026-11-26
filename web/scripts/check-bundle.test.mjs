import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { DATA_FILES, LIMIT_BYTES, checkBundle, dataSentinel, readSentinels } from "./check-bundle.mjs";

const ITEMS = "Fires a laser that pierces every enemy in";
const CHARACTERS = "Tainted Magdalene";
const SENTINELS = { "items.json": ITEMS, "characters.json": CHARACTERS };
const made = [];

/** A fake `dist` folder: index.html with an entry script plus `head`, and the given files in assets/. */
function fakeDist(files, head = "") {
  const dist = mkdtempSync(path.join(os.tmpdir(), "bundle-check-"));
  made.push(dist);
  mkdirSync(path.join(dist, "assets"));
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dist, "assets", name), text);
  writeFileSync(
    path.join(dist, "index.html"),
    `<head><script type="module" crossorigin src="/assets/index-a1.js"></script>\n${head}</head>`,
  );
  return dist;
}
const preload = (...names) => names.map((n) => `<link rel="modulepreload" crossorigin href="/assets/${n}">`).join("\n");

afterEach(() => {
  for (const dist of made.splice(0)) rmSync(dist, { recursive: true, force: true });
});

describe("bundle check", () => {
  it("passes a build with every data file in its own preloaded chunk", () => {
    const dist = fakeDist(
      { "index-a1.js": "app", "data-b2.js": `var a = "${ITEMS} its path"; var b = "${CHARACTERS}"`, "vendor-c3.js": "react" },
      preload("data-b2.js", "vendor-c3.js"),
    );
    expect(checkBundle(dist, SENTINELS)).toEqual([]);
  });

  it("fails the single bundle this project shipped before the split", () => {
    const dist = fakeDist({ "index-a1.js": `${"x".repeat(LIMIT_BYTES)} "${ITEMS}" "${CHARACTERS}"` });
    expect(checkBundle(dist, SENTINELS)).toEqual([
      expect.stringMatching(/^index-a1\.js is 500\.\d kB, over 500 kB$/),
      "expected one data-*.js chunk, found 0",
      "the entry chunk index-a1.js carries data from items.json",
      "data from items.json is in index-a1.js, not in one data chunk",
      "the entry chunk index-a1.js carries data from characters.json",
      "data from characters.json is in index-a1.js, not in one data chunk",
    ]);
  });

  it("fails when one data file moves into the entry while the others stay in the data chunk", () => {
    const dist = fakeDist({ "index-a1.js": `app "${CHARACTERS}"`, "data-b2.js": ITEMS }, preload("data-b2.js"));
    expect(checkBundle(dist, SENTINELS)).toEqual([
      "the entry chunk index-a1.js carries data from characters.json",
      "data from characters.json is in index-a1.js, not in one data chunk",
    ]);
  });

  it("fails a data file found in no chunk at all", () => {
    const dist = fakeDist({ "index-a1.js": "app", "data-b2.js": ITEMS }, preload("data-b2.js"));
    expect(checkBundle(dist, SENTINELS)).toEqual(["data from characters.json is in no chunk, not in one data chunk"]);
  });

  it("fails a chunk one byte over the limit, and passes one at it", () => {
    const data = { "data-b2.js": `${ITEMS} ${CHARACTERS}` };
    const at = fakeDist({ "index-a1.js": "x".repeat(LIMIT_BYTES), ...data }, preload("data-b2.js"));
    expect(checkBundle(at, SENTINELS)).toEqual([]);
    const over = fakeDist({ "index-a1.js": "x".repeat(LIMIT_BYTES + 1), ...data }, preload("data-b2.js"));
    expect(checkBundle(over, SENTINELS)).toEqual(["index-a1.js is 500.0 kB, over 500 kB"]);
  });

  it("fails a data chunk that is only prefetched, or not linked at all, and data copied into a second chunk", () => {
    const both = `${ITEMS} ${CHARACTERS}`;
    const prefetched = fakeDist(
      { "index-a1.js": "app", "data-b2.js": both },
      `<link rel="prefetch" href="/assets/data-b2.js">\n<link rel="modulepreload" href="/assets/other.js">`,
    );
    expect(checkBundle(prefetched, SENTINELS)).toEqual(["index.html does not modulepreload data-b2.js"]);

    const copied = fakeDist({ "index-a1.js": "app", "data-b2.js": both, "vendor-c3.js": ITEMS }, preload("vendor-c3.js"));
    expect(checkBundle(copied, SENTINELS)).toEqual([
      "data from items.json is in data-b2.js, vendor-c3.js, not in one data chunk",
      "index.html does not modulepreload data-b2.js",
    ]);
  });

  it("accepts the attributes in any order", () => {
    const dist = fakeDist(
      { "index-a1.js": "app", "data-b2.js": `${ITEMS} ${CHARACTERS}` },
      `<link crossorigin href="/assets/data-b2.js" rel="modulepreload">`,
    );
    expect(checkBundle(dist, SENTINELS)).toEqual([]);
  });

  it("fails a page with no entry script", () => {
    const dist = fakeDist({ "data-b2.js": ITEMS });
    writeFileSync(path.join(dist, "index.html"), "<head></head>");
    expect(checkBundle(dist, SENTINELS)).toEqual(["index.html has no module entry script"]);
  });

  it("finds a run of plain text in every data file the app imports", () => {
    const data = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");
    const sentinels = readSentinels(data);
    expect(Object.keys(sentinels)).toEqual(DATA_FILES);
    for (const sentinel of Object.values(sentinels)) expect(sentinel).toMatch(/^[A-Za-z][A-Za-z0-9 ,.]{15,39}$/);
    expect(dataSentinel({ a: ["", { b: "Too short." }], c: "Blood of the Martyr, again" })).toBe("Blood of the Martyr, again");
    expect(() => dataSentinel({ a: "Fifteen letters", b: ["it's got a quote", "x"] })).toThrow(
      "No string has 16 characters",
    );
  });
});
