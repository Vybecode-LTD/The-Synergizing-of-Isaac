// Draws the 1200x630 image social sites show when a link is shared: public/og.png, in the Toy Box look
// (docs/decisions/0005), with the counts data/ holds right now. Run by hand (`npm run og -- isaac.toys`)
// when the domain, the look or the data changes, and commit the result.
//
// It draws in the installed Chrome (headless), so the card uses the site's own fonts from node_modules.
// That is why it is not part of the build: a Linux build image has no Chrome. Set CHROME_PATH if Chrome
// is somewhere unusual.
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { ogCounts, ogHtml } from "./og-card.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, "..");
const dataDir = path.resolve(web, "../data");
const domain = process.argv[2] ?? "isaac.toys";

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((file) => file && existsSync(file));
if (!CHROME) throw new Error("og: no Chrome found; set CHROME_PATH");

const font = (pkg, file) => path.resolve(web, "node_modules/@fontsource-variable", pkg, "files", file);
const fonts = {
  display: font("bricolage-grotesque", "bricolage-grotesque-latin-opsz-normal.woff2"),
  sans: font("figtree", "figtree-latin-wght-normal.woff2"),
};

/** A tray tile: the sprite at a whole multiple of its pixels, as large as fits in 128px. */
async function tile(file, name, feature = false) {
  const { width, height } = await sharp(file).metadata();
  const scale = Math.max(1, Math.floor(128 / Math.max(width, height)));
  return { file, name, feature, width: width * scale, height: height * scale };
}
const item = (id) => path.join(dataDir, "sprites/items", `${String(id).padStart(3, "0")}.png`);

// The board's sample build: Azazel with Brimstone, Tammy's Head and Sacred Heart.
const sprites = [
  await tile(path.join(dataDir, "sprites/characters/azazel.png"), "Azazel", true),
  await tile(item(118), "Brimstone"),
  await tile(item(38), "Tammy's Head"),
  await tile(item(182), "Sacred Heart"),
];

const counts = ogCounts(dataDir);
const work = mkdtempSync(path.join(tmpdir(), "isaac-og-"));
try {
  const page = path.join(work, "og.html");
  const shot = path.join(work, "og.png");
  writeFileSync(page, ogHtml({ domain, counts, fonts, sprites }));
  execFileSync(CHROME, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    "--virtual-time-budget=4000",
    `--user-data-dir=${path.join(work, "profile")}`,
    `--screenshot=${shot}`,
    page,
  ], { stdio: "ignore" });
  const { width, height } = await sharp(shot).metadata();
  if (width !== 1200 || height !== 630) throw new Error(`og: Chrome drew ${width}x${height}, not 1200x630`);
  const target = path.resolve(web, "public/og.png");
  await sharp(shot).png({ compressionLevel: 9, palette: true, quality: 100 }).toFile(target);
  console.log(`og: wrote ${target} for ${domain}: ${JSON.stringify(counts)}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
