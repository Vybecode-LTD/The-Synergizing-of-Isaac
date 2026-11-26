// Checks that the built app keeps the game data in a chunk of its own. No JavaScript file may pass Vite's
// 500 kB warning. Every module from data/ that ships must sit in one `data-*.js` chunk and in no other, and
// index.html must modulepreload that chunk beside the entry. Which chunk holds which module comes from the
// report the build writes (the `chunk-report` plugin in vite.config.ts), not from searching for text:
// data files share words ("Repentance 1.7.9b" is in both meta.json and about.json), so text can't tell
// them apart. Run `npm run bundle:check` after `npm run build`; CI runs it.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Vite's `chunkSizeWarningLimit` counts kB of 1,000 bytes. */
export const LIMIT_BYTES = 500 * 1000;

/** Where the build writes its chunk report, relative to web/. Outside dist/, so the site never serves it. */
export const REPORT = "node_modules/.cache/isaac-toys/chunks.json";

/** The `<link>` tags of a page, each as its rel tokens and its href, whatever order the attributes come in. */
function links(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => ({
    rel: (tag.match(/\srel="([^"]*)"/i)?.[1] ?? "").toLowerCase().split(/\s+/),
    href: tag.match(/\shref="([^"]*)"/i)?.[1],
  }));
}

/**
 * Everything wrong with the build in `dist`, as sentences; an empty list means it holds.
 * `report` is the build's chunk report: `[{ file: "assets/x.js", modules: ["data/items.json", ...] }]`,
 * with module paths relative to the repository root, or null when there is none.
 */
export function checkBundle(dist, report) {
  const problems = [];
  const assets = path.join(dist, "assets");
  const scripts = readdirSync(assets).filter((name) => name.endsWith(".js")).sort();
  for (const name of scripts) {
    const size = statSync(path.join(assets, name)).size;
    if (size > LIMIT_BYTES) problems.push(`${name} is ${(size / 1000).toFixed(1)} kB, over ${LIMIT_BYTES / 1000} kB`);
  }

  const html = readFileSync(path.join(dist, "index.html"), "utf-8");
  const entry = html.match(/<script type="module"[^>]*\ssrc="\/assets\/([^"]+\.js)"/)?.[1];
  if (!entry) return [...problems, "index.html has no module entry script"];
  if (!report) return [...problems, "no chunk report: run npm run build"];

  const chunks = report.map((chunk) => ({ name: path.posix.basename(chunk.file), modules: chunk.modules }));
  const reported = chunks.map((c) => c.name).sort();
  if (reported.join() !== scripts.join()) {
    return [
      ...problems,
      `the chunk report (${reported.join(", ")}) does not match dist/assets (${scripts.join(", ")}): rebuild`,
    ];
  }

  const dataChunks = scripts.filter((name) => /^data-[\w-]+\.js$/.test(name));
  if (dataChunks.length !== 1) problems.push(`expected one data-*.js chunk, found ${dataChunks.length}`);
  const dataModules = [...new Set(chunks.flatMap((c) => c.modules.filter((m) => m.startsWith("data/"))))].sort();
  if (dataModules.length === 0) problems.push("no module from data/ is in any chunk");
  for (const module of dataModules) {
    const holders = chunks.filter((c) => c.modules.includes(module)).map((c) => c.name);
    if (holders.includes(entry)) problems.push(`the entry chunk ${entry} holds ${module}`);
    if (holders.length !== 1 || holders[0] !== dataChunks[0]) {
      problems.push(`${module} is in ${holders.join(", ")}, not in one data chunk`);
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
  const reportFile = path.join(web, REPORT);
  const report = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf-8")) : null;
  const problems = checkBundle(dist, report);
  if (problems.length > 0) {
    console.error(`Bundle check failed:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  const data = report.find((c) => /\/data-[\w-]+\.js$/.test(c.file));
  const listed = readdirSync(path.join(dist, "assets"))
    .filter((name) => name.endsWith(".js"))
    .map((name) => `${name} ${(statSync(path.join(dist, "assets", name)).size / 1000).toFixed(1)} kB`);
  console.log(`Bundle check passed. The data chunk holds ${data.modules.join(", ")}. Files: ${listed.join(", ")}`);
}
