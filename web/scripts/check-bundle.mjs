// Checks that the built app keeps the game data in a chunk of its own. No JavaScript file may pass Vite's
// 500 kB warning. One `data-*.js` chunk must hold the data, and index.html must preload it beside the
// entry, which must not carry the data itself. Run `npm run bundle:check` after `npm run build`; CI runs it.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Vite's `chunkSizeWarningLimit` counts kB of 1,000 bytes. */
export const LIMIT_BYTES = 500 * 1000;

/** A run of plain text from the item data, long enough to turn up only where the data is. */
export function dataSentinel(items) {
  for (const item of items) {
    const match = (typeof item.effect === "string" ? item.effect : "").match(/[A-Za-z][A-Za-z0-9 ,]{39,}/);
    if (match) return match[0].slice(0, 40);
  }
  throw new Error("No item effect has 40 characters of plain text to look for.");
}

/** Everything wrong with the build in `dist`, as sentences; an empty list means it holds. */
export function checkBundle(dist, sentinel) {
  const problems = [];
  const assets = path.join(dist, "assets");
  const scripts = readdirSync(assets).filter((name) => name.endsWith(".js"));
  const sizes = new Map(scripts.map((name) => [name, statSync(path.join(assets, name)).size]));
  for (const [name, size] of sizes) {
    if (size > LIMIT_BYTES) problems.push(`${name} is ${(size / 1000).toFixed(1)} kB, over ${LIMIT_BYTES / 1000} kB`);
  }

  const html = readFileSync(path.join(dist, "index.html"), "utf-8");
  const entry = html.match(/<script type="module"[^>]*\ssrc="\/assets\/([^"]+\.js)"/)?.[1];
  if (!entry) return [...problems, "index.html has no module entry script"];

  const dataChunks = scripts.filter((name) => /^data-[\w-]+\.js$/.test(name));
  if (dataChunks.length !== 1) problems.push(`expected one data-*.js chunk, found ${dataChunks.length}`);
  const holders = scripts.filter((name) => readFileSync(path.join(assets, name), "utf-8").includes(sentinel));
  if (holders.includes(entry)) problems.push(`the entry chunk ${entry} still carries the game data`);
  if (holders.length !== 1 || holders[0] !== dataChunks[0]) {
    problems.push(`the game data is in ${holders.join(", ") || "no chunk"}, not in one data chunk`);
  }
  for (const name of dataChunks) {
    if (!html.includes(`href="/assets/${name}"`)) problems.push(`index.html does not preload ${name}`);
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const web = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const items = JSON.parse(readFileSync(path.join(web, "..", "data", "items.json"), "utf-8"));
  const dist = path.join(web, "dist");
  const problems = checkBundle(dist, dataSentinel(items));
  if (problems.length > 0) {
    console.error(`Bundle check failed:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  const listed = readdirSync(path.join(dist, "assets"))
    .filter((name) => name.endsWith(".js"))
    .map((name) => `${name} ${(statSync(path.join(dist, "assets", name)).size / 1000).toFixed(1)} kB`);
  console.log(`Bundle check passed: ${listed.join(", ")}`);
}
