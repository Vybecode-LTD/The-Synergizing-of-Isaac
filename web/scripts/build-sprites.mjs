// Packs data/sprites/{items,trinkets}/NNN.png into one lossless WebP sheet each,
// in the same order as data/items.json and data/trinkets.json, so a sprite's
// position is just its index in the list (see src/components/Sprite.tsx).
// Output: public/sprites/ (git-ignored; rebuilt before `dev` and `build`).
import { mkdir, readFile, copyFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../../data");
const outDir = path.resolve(here, "../public/sprites");
const { cell, columns } = JSON.parse(await readFile(path.resolve(here, "../sprite-config.json"), "utf8"));

/** The source sprites are 64px: the game's 32px art doubled. Halve them back, and prove it loses nothing. */
async function loadCell(file) {
  const src = sharp(file).ensureAlpha();
  const { data: big, info } = await src.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== cell * 2 || info.height !== cell * 2) {
    throw new Error(`${file}: expected ${cell * 2}px, got ${info.width}x${info.height}`);
  }
  const small = Buffer.alloc(cell * cell * 4);
  let lossy = false;
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      const at = (px, py) => (py * info.width + px) * 4;
      const a = at(x * 2, y * 2);
      for (const b of [at(x * 2 + 1, y * 2), at(x * 2, y * 2 + 1), at(x * 2 + 1, y * 2 + 1)]) {
        if (big[a + 3] === 0 && big[b + 3] === 0) continue;
        if (big.compare(big, b, b + 4, a, a + 4) !== 0) lossy = true;
      }
      big.copy(small, (y * cell + x) * 4, a, a + 4);
    }
  }
  return { small, lossy };
}

async function sheet(kind) {
  const records = JSON.parse(await readFile(path.join(dataDir, `${kind}.json`), "utf8"));
  const rows = Math.ceil(records.length / columns);
  const composites = [];
  const notDoubled = [];
  for (const [index, record] of records.entries()) {
    const file = path.join(dataDir, "sprites", kind, `${String(record.id).padStart(3, "0")}.png`);
    const { small, lossy } = await loadCell(file);
    if (lossy) notDoubled.push(record.name);
    composites.push({
      input: small,
      raw: { width: cell, height: cell, channels: 4 },
      left: (index % columns) * cell,
      top: Math.floor(index / columns) * cell,
    });
  }
  const target = path.join(outDir, `${kind}.webp`);
  await sharp({
    create: { width: columns * cell, height: rows * cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .webp({ lossless: true, effort: 6 })
    .toFile(target);
  return { kind, count: records.length, notDoubled };
}

await mkdir(path.join(outDir, "characters"), { recursive: true });
const results = [await sheet("items"), await sheet("trinkets")];
const characters = await readdir(path.join(dataDir, "sprites", "characters"));
for (const file of characters) {
  await copyFile(path.join(dataDir, "sprites", "characters", file), path.join(outDir, "characters", file));
}
for (const r of results) {
  const note = r.notDoubled.length ? `; ${r.notDoubled.length} were not clean 2x art (sampled top-left)` : "";
  console.log(`sprites: ${r.kind} ${r.count} cells${note}`);
}
console.log(`sprites: ${characters.length} character portraits`);
