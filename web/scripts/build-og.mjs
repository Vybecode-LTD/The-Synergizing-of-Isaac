// Draws the 1200x630 image social sites show when a link is shared: public/og.png.
// Run by hand (`npm run og`) when the domain or tagline changes, and commit the result. It is not part of
// the build because the text is drawn with this machine's fonts, which a Linux build image does not have.
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const domain = process.argv[2] ?? "isaac.toys";
const [name, tld] = [domain.slice(0, domain.indexOf(".")), domain.slice(domain.indexOf("."))];

// Colours are the site's own: canvas, parchment, brass (src/styles/tokens.css, dark theme).
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#14110e"/>
  <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="#3a352e" stroke-width="2"/>
  <g transform="translate(112 150) scale(9)" fill="#d9bc7f" shape-rendering="crispEdges">
    <path d="M7 1h2v1h1v1h1v3h-1v1H6V6H5V3h1V2h1z"/>
    <path d="M5 9h6v2h-1v2h2v2H4v-2h2v-2H5z"/>
  </g>
  <text x="300" y="270" font-family="Georgia, 'Times New Roman', serif" font-size="112" font-weight="700" fill="#f5efe2">${name}<tspan fill="#d9bc7f">${tld}</tspan></text>
  <text x="304" y="340" font-family="'Segoe UI', Arial, sans-serif" font-size="40" fill="#d6cbb8">Synergy builder for</text>
  <text x="304" y="392" font-family="'Segoe UI', Arial, sans-serif" font-size="40" fill="#d6cbb8">The Binding of Isaac: Repentance</text>
  <text x="304" y="456" font-family="'Segoe UI', Arial, sans-serif" font-size="30" fill="#a89e8c">719 items · 188 trinkets · 34 characters · 458 synergies</text>
  <text x="112" y="540" font-family="'Segoe UI', Arial, sans-serif" font-size="24" fill="#a89e8c">Unofficial fan project</text>
</svg>`;

const target = path.resolve(here, "../public/og.png");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(target);
console.log(`og: wrote ${target} for ${domain}`);
