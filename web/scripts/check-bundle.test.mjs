import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LIMIT_BYTES, checkBundle } from "./check-bundle.mjs";

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
/** The chunk report the build writes: which source files each chunk holds. */
const report = (chunks) => Object.entries(chunks).map(([name, modules]) => ({ file: `assets/${name}`, modules }));

const APP = ["web/src/main.tsx", "web/src/seo.ts"];
const DATA = ["data/items.json", "data/meta.json", "data/content/about.json"];
const VENDOR = ["web/node_modules/react/index.js"];
const SPLIT = { "index-a1.js": "app", "data-b2.js": "data", "vendor-c3.js": "react" };

afterEach(() => {
  for (const dist of made.splice(0)) rmSync(dist, { recursive: true, force: true });
});

describe("bundle check", () => {
  it("passes a build with every data module in its own preloaded chunk", () => {
    const dist = fakeDist(SPLIT, preload("data-b2.js", "vendor-c3.js"));
    const chunks = report({ "index-a1.js": APP, "data-b2.js": DATA, "vendor-c3.js": VENDOR });
    expect(checkBundle(dist, chunks)).toEqual([]);
  });

  it("fails the single bundle this project shipped before the split", () => {
    const dist = fakeDist({ "index-a1.js": "x".repeat(LIMIT_BYTES + 44) });
    expect(checkBundle(dist, report({ "index-a1.js": [...APP, ...DATA, ...VENDOR] }))).toEqual([
      "index-a1.js is 500.0 kB, over 500 kB",
      "expected one data-*.js chunk, found 0",
      "the entry chunk index-a1.js holds data/content/about.json",
      "data/content/about.json is in index-a1.js, not in one data chunk",
      "the entry chunk index-a1.js holds data/items.json",
      "data/items.json is in index-a1.js, not in one data chunk",
      "the entry chunk index-a1.js holds data/meta.json",
      "data/meta.json is in index-a1.js, not in one data chunk",
    ]);
  });

  it("fails meta.json in the entry even when the data chunk holds the same words from about.json", () => {
    // CodeRabbit's case on PR #10: "Repentance 1.7.9b" is in both files, so no text marker can tell them apart.
    const dist = fakeDist({ ...SPLIT, "data-b2.js": 'var about = "Repentance 1.7.9b"' }, preload("data-b2.js"));
    const chunks = report({
      "index-a1.js": [...APP, "data/meta.json"],
      "data-b2.js": ["data/items.json", "data/content/about.json"],
      "vendor-c3.js": VENDOR,
    });
    expect(checkBundle(dist, chunks)).toEqual([
      "the entry chunk index-a1.js holds data/meta.json",
      "data/meta.json is in index-a1.js, not in one data chunk",
    ]);
  });

  it("fails a data module copied into a second chunk", () => {
    const dist = fakeDist(SPLIT, preload("data-b2.js"));
    const chunks = report({ "index-a1.js": APP, "data-b2.js": DATA, "vendor-c3.js": [...VENDOR, "data/items.json"] });
    expect(checkBundle(dist, chunks)).toEqual(["data/items.json is in data-b2.js, vendor-c3.js, not in one data chunk"]);
  });

  it("fails without a chunk report, with one from another build, and with one that names no data", () => {
    const dist = fakeDist(SPLIT, preload("data-b2.js"));
    expect(checkBundle(dist, null)).toEqual(["no chunk report: run npm run build"]);
    const stale = report({ "index-zz.js": APP, "data-b2.js": DATA, "vendor-c3.js": VENDOR });
    expect(checkBundle(dist, stale)).toEqual([
      "the chunk report (data-b2.js, index-zz.js, vendor-c3.js) does not match dist/assets (data-b2.js, index-a1.js, vendor-c3.js): rebuild",
    ]);
    const empty = report({ "index-a1.js": APP, "data-b2.js": [], "vendor-c3.js": VENDOR });
    expect(checkBundle(dist, empty)).toEqual(["no module from data/ is in any chunk"]);
  });

  it("fails a chunk one byte over the limit, and passes one at it", () => {
    const chunks = report({ "index-a1.js": APP, "data-b2.js": DATA });
    const at = fakeDist({ "index-a1.js": "x".repeat(LIMIT_BYTES), "data-b2.js": "data" }, preload("data-b2.js"));
    expect(checkBundle(at, chunks)).toEqual([]);
    const over = fakeDist({ "index-a1.js": "x".repeat(LIMIT_BYTES + 1), "data-b2.js": "data" }, preload("data-b2.js"));
    expect(checkBundle(over, chunks)).toEqual(["index-a1.js is 500.0 kB, over 500 kB"]);
  });

  it("fails a data chunk that is only prefetched, and accepts the attributes in any order", () => {
    const chunks = report({ "index-a1.js": APP, "data-b2.js": DATA, "vendor-c3.js": VENDOR });
    const prefetched = fakeDist(
      SPLIT,
      `<link rel="prefetch" href="/assets/data-b2.js">\n<link rel="modulepreload" href="/assets/vendor-c3.js">`,
    );
    expect(checkBundle(prefetched, chunks)).toEqual(["index.html does not modulepreload data-b2.js"]);
    const reordered = fakeDist(SPLIT, `<link crossorigin href="/assets/data-b2.js" rel="modulepreload">`);
    expect(checkBundle(reordered, chunks)).toEqual([]);
  });

  it("fails a page with no entry script", () => {
    const dist = fakeDist({ "data-b2.js": "data" });
    writeFileSync(path.join(dist, "index.html"), "<head></head>");
    expect(checkBundle(dist, report({ "data-b2.js": DATA }))).toEqual(["index.html has no module entry script"]);
  });
});
