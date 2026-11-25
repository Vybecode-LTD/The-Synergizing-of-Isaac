// The share card's content, kept apart from the browser that draws it so a test can read it
// (og-card.test.mjs). build-og.mjs turns ogHtml() into public/og.png.
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** How many of each thing data/ holds right now: the numbers the card prints. */
export function ogCounts(dataDir) {
  const count = (name) => JSON.parse(readFileSync(path.join(dataDir, `${name}.json`), "utf8")).length;
  return {
    items: count("items"),
    trinkets: count("trinkets"),
    characters: count("characters"),
    synergies: count("synergies"),
  };
}

/** "isaac.toys" -> ["isaac", ".toys"]: the word, and the sticker. */
export function splitDomain(domain) {
  const dot = domain.indexOf(".");
  return dot < 1 ? [domain, ""] : [domain.slice(0, dot), domain.slice(dot)];
}

const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fileUrl = (file) => pathToFileURL(file).href;

// The light Toy Box's colours, as web/src/styles/tokens.css names them (sRGB, for a PNG).
const INK = "#1A1E3A"; // --neutral-900, the ink line
const MUTED = "#474D6E"; // --neutral-600
const CHALK = "#EEF1F8"; // --neutral-50, the ground
const TRAY = "#DCE2F0"; // --neutral-100
const TOMATO = "#C93A17"; // --accent-600
const SUN = "#FFC21A"; // --warning-500

/**
 * The card as a page Chrome can screenshot at 1200x630.
 * fonts: { display, sans } woff2 paths; sprites: [{ file, name, width, height, feature? }] for the tray,
 * each drawn at a whole multiple of its pixels (width and height already scaled).
 */
export function ogHtml({ domain, counts, fonts, sprites }) {
  const [name, tld] = splitDomain(domain);
  const chips = [
    `${counts.items} items`,
    `${counts.trinkets} trinkets`,
    `${counts.characters} characters`,
    `${counts.synergies} synergies`,
  ];
  const tiles = sprites
    .map(
      (s) =>
        `<li class="tile${s.feature ? " tile--feature" : ""}"><img src="${fileUrl(s.file)}" width="${s.width}" height="${s.height}" alt=""><span>${esc(s.name)}</span></li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
@font-face { font-family: "Bricolage"; src: url("${fileUrl(fonts.display)}") format("woff2"); font-weight: 200 800; }
@font-face { font-family: "Figtree"; src: url("${fileUrl(fonts.sans)}") format("woff2"); font-weight: 300 900; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; background: ${CHALK}; color: ${INK}; font-family: "Figtree", sans-serif; }
.card { display: grid; grid-template-columns: 1fr 392px; gap: 48px; align-items: center; height: 100%; padding: 56px 64px; }
.word { display: flex; align-items: center; gap: 8px; font: 800 120px/1 "Bricolage", sans-serif; letter-spacing: -0.04em; }
.tld { padding: 2px 18px 12px; color: #fff; background: ${TOMATO}; border: 5px solid ${INK}; border-radius: 26px; box-shadow: 6px 6px 0 ${INK}; transform: rotate(-3deg); }
.tag { margin-top: 28px; font: 600 36px/1.25 "Figtree", sans-serif; color: ${MUTED}; max-width: 15em; }
.chips { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; list-style: none; }
.chips li { padding: 8px 18px; font: 800 24px/1.2 "Figtree", sans-serif; background: #fff; border: 3px solid ${INK}; border-radius: 999px; box-shadow: 3px 3px 0 ${INK}; }
.note { margin-top: 30px; font: 600 20px/1 "Figtree", sans-serif; color: ${MUTED}; }
.tray { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px 16px; padding: 22px; list-style: none; background: ${TRAY}; border: 4px solid ${INK}; border-radius: 34px; box-shadow: inset 0 6px 0 rgba(26, 30, 58, 0.08); }
.tile { display: flex; flex-direction: column; align-items: center; gap: 6px; height: 196px; padding: 12px 6px 12px; background: #fff; border: 4px solid ${INK}; border-radius: 24px; box-shadow: 5px 5px 0 ${INK}; }
.tile--feature { background: ${SUN}; }
.tile img { display: block; margin: auto 0; image-rendering: pixelated; }
.tile span { font: 700 20px/1.1 "Bricolage", sans-serif; text-align: center; white-space: nowrap; }
</style></head><body><main class="card">
<div>
<p class="word">${esc(name)}${tld ? `<span class="tld">${esc(tld)}</span>` : ""}</p>
<p class="tag">Synergy builder for The Binding of Isaac: Repentance</p>
<ul class="chips">${chips.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
<p class="note">Unofficial fan project</p>
</div>
<ul class="tray">${tiles}</ul>
</main></body></html>`;
}
