// Checks that the built app keeps the game data in a chunk of its own. No JavaScript file may pass Vite's
// 500 kB warning. One `data-*.js` chunk must hold every data file the app imports, no other chunk may hold
// any of them, and index.html must modulepreload that chunk beside the entry. Run `npm run bundle:check`
// after `npm run build`; CI runs it.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Vite's `chunkSizeWarningLimit` counts kB of 1,000 bytes. */
export const LIMIT_BYTES = 500 * 1000;

/** Every file in data/ the app imports (`@data/...` in web/src, tests aside). */
export const DATA_FILES = [
  "items.json",
  "trinkets.json",
  "characters.json",
  "synergies.json",
  "transformations.json",
  "meta.json",
  "content/pages.json",
  "content/about.json",
];

function* strings(value) {
  if (typeof value === "string") yield value;
  else if (Array.isArray(value)) for (const v of value) yield* strings(v);
  else if (value && typeof value === "object") for (const v of Object.values(value)) yield* strings(v);
}

/** The first run of 16 or more plain characters in a data file's strings, cut to 40: it turns up only where that file is. */
export function dataSentinel(json) {
  for (const text of strings(json)) {
    const match = text.match(/[A-Za-z][A-Za-z0-9 ,.]{15,}/);
    if (match) return match[0].slice(0, 40);
  }
  throw new Error("No string has 16 characters of plain text to look for.");
}

/** A sentinel for each of DATA_FILES, read from the data folder. */
export function readSentinels(dataDir) {
  return Object.fromEntries(
    DATA_FILES.map((name) => [name, dataSentinel(JSON.parse(readFileSync(path.join(dataDir, name), "utf-8")))]),
  );
}

/** The `<link>` tags of a page, each as its rel tokens and its href, whatever order the attributes come in. */
function links(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => ({
    rel: (tag.match(/\srel="([^"]*)"/i)?.[1] ?? "").toLowerCase().split(/\s+/),
    href: tag.match(/\shref="([^"]*)"/i)?.[1],
  }));
}

/** Everything wrong with the build in `dist`, as sentences; an empty list means it holds. */
export function checkBundle(dist, sentinels) {
  const problems = [];
  const assets = path.join(dist, "assets");
  const scripts = readdirSync(assets).filter((name) => name.endsWith(".js"));
  for (const name of scripts) {
    const size = statSync(path.join(assets, name)).size;
    if (size > LIMIT_BYTES) problems.push(`${name} is ${(size / 1000).toFixed(1)} kB, over ${LIMIT_BYTES / 1000} kB`);
  }

  const html = readFileSync(path.join(dist, "index.html"), "utf-8");
  const entry = html.match(/<script type="module"[^>]*\ssrc="\/assets\/([^"]+\.js)"/)?.[1];
  if (!entry) return [...problems, "index.html has no module entry script"];

  const dataChunks = scripts.filter((name) => /^data-[\w-]+\.js$/.test(name));
  if (dataChunks.length !== 1) problems.push(`expected one data-*.js chunk, found ${dataChunks.length}`);
  const texts = new Map(scripts.map((name) => [name, readFileSync(path.join(assets, name), "utf-8")]));
  for (const [file, sentinel] of Object.entries(sentinels)) {
    const holders = scripts.filter((name) => texts.get(name).includes(sentinel));
    if (holders.includes(entry)) problems.push(`the entry chunk ${entry} carries data from ${file}`);
    if (holders.length !== 1 || holders[0] !== dataChunks[0]) {
      problems.push(`data from ${file} is in ${holders.join(", ") || "no chunk"}, not in one data chunk`);
    }
  }

  const tags = links(html);
  for (const name of dataChunks) {
    if (!tags.some((l) => l.rel.includes("modulepreload") && l.href === `/assets/${name}`)) {
      problems.push(`index.html does not modulepreload ${name}`);
    }
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const web = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const dist = path.join(web, "dist");
  const problems = checkBundle(dist, readSentinels(path.join(web, "..", "data")));
  if (problems.length > 0) {
    console.error(`Bundle check failed:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  const listed = readdirSync(path.join(dist, "assets"))
    .filter((name) => name.endsWith(".js"))
    .map((name) => `${name} ${(statSync(path.join(dist, "assets", name)).size / 1000).toFixed(1)} kB`);
  console.log(`Bundle check passed, ${DATA_FILES.length} data files in the data chunk: ${listed.join(", ")}`);
}
