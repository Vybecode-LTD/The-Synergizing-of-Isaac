import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { LIMIT_BYTES, checkBundle, dataSentinel } from "./check-bundle.mjs";

const SENTINEL = "Fires a laser that pierces every enemy in";
const made = [];

/** A fake `dist` folder: index.html with the given extra head lines, and the given files in assets/. */
function fakeDist(files, preload = []) {
  const dist = mkdtempSync(path.join(os.tmpdir(), "bundle-check-"));
  made.push(dist);
  mkdirSync(path.join(dist, "assets"));
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dist, "assets", name), text);
  const links = preload.map((name) => `<link rel="modulepreload" crossorigin href="/assets/${name}">`).join("\n");
  writeFileSync(
    path.join(dist, "index.html"),
    `<head><script type="module" crossorigin src="/assets/index-a1.js"></script>\n${links}</head>`,
  );
  return dist;
}

afterEach(() => {
  for (const dist of made.splice(0)) rmSync(dist, { recursive: true, force: true });
});

describe("bundle check", () => {
  it("passes a build with the data in its own preloaded chunk", () => {
    const dist = fakeDist(
      { "index-a1.js": "app", "data-b2.js": `var items = [{ effect: "${SENTINEL} its path" }]`, "vendor-c3.js": "react" },
      ["data-b2.js", "vendor-c3.js"],
    );
    expect(checkBundle(dist, SENTINEL)).toEqual([]);
  });

  it("fails the single bundle this project shipped before the split", () => {
    const dist = fakeDist({ "index-a1.js": `${"x".repeat(LIMIT_BYTES)} "${SENTINEL}"` });
    expect(checkBundle(dist, SENTINEL)).toEqual([
      expect.stringMatching(/^index-a1\.js is 500\.\d kB, over 500 kB$/),
      "expected one data-*.js chunk, found 0",
      "the entry chunk index-a1.js still carries the game data",
      "the game data is in index-a1.js, not in one data chunk",
    ]);
  });

  it("fails a chunk one byte over the limit, and passes one at it", () => {
    const at = fakeDist({ "index-a1.js": "x".repeat(LIMIT_BYTES), "data-b2.js": SENTINEL }, ["data-b2.js"]);
    expect(checkBundle(at, SENTINEL)).toEqual([]);
    const over = fakeDist({ "index-a1.js": "x".repeat(LIMIT_BYTES + 1), "data-b2.js": SENTINEL }, ["data-b2.js"]);
    expect(checkBundle(over, SENTINEL)).toEqual(["index-a1.js is 500.0 kB, over 500 kB"]);
  });

  it("fails a data chunk the page does not preload, and data copied into a second chunk", () => {
    const dist = fakeDist({ "index-a1.js": "app", "data-b2.js": SENTINEL, "vendor-c3.js": SENTINEL }, ["vendor-c3.js"]);
    expect(checkBundle(dist, SENTINEL)).toEqual([
      "the game data is in data-b2.js, vendor-c3.js, not in one data chunk",
      "index.html does not preload data-b2.js",
    ]);
  });

  it("fails a page with no entry script", () => {
    const dist = fakeDist({ "data-b2.js": SENTINEL });
    writeFileSync(path.join(dist, "index.html"), "<head></head>");
    expect(checkBundle(dist, SENTINEL)).toEqual(["index.html has no module entry script"]);
  });

  it("looks for 40 characters of plain text from the real item data", () => {
    const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/items.json");
    const items = JSON.parse(readFileSync(file, "utf-8"));
    const sentinel = dataSentinel(items);
    expect(sentinel).toMatch(/^[A-Za-z][A-Za-z0-9 ,]{39}$/);
    expect(items.some((item) => item.effect.includes(sentinel))).toBe(true);
    expect(() => dataSentinel([{ effect: "" }, { effect: "Too short, and it's got quotes." }])).toThrow(
      "No item effect has 40 characters",
    );
  });
});
