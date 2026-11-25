// The stylesheet's own consistency, which neither the design audit nor check_roles.py checks:
// the dark Toy Box is written twice (system setting, data-theme="dark") and the copies must agree,
// and every custom property the CSS reads must be declared somewhere.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const styles = path.dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(path.join(styles, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const files = [
  ...readdirSync(styles).filter((f) => f.endsWith(".css")),
  ...readdirSync(path.join(styles, "components")).map((f) => `components/${f}`),
];

/** The declarations inside the first block that opens with `selector {`, after `from`. */
function block(css: string, selector: string, from = 0): Map<string, string> {
  const start = css.indexOf(`${selector} {`, from);
  if (start < 0) throw new Error(`no block for ${selector}`);
  let depth = 0;
  let end = start;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = css.slice(css.indexOf("{", start) + 1, end);
  return new Map([...body.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

describe("tokens.css dark theme", () => {
  const css = read("tokens.css");
  const media = css.indexOf("@media (prefers-color-scheme: dark)");

  it("is written the same for the system setting and for data-theme=dark", () => {
    const bySystem = block(css, ':root:not([data-theme="light"])', media);
    const byAttribute = block(css, '[data-theme="dark"]', media + 1);
    expect(bySystem.size).toBeGreaterThan(30);
    expect(Object.fromEntries(bySystem)).toEqual(Object.fromEntries(byAttribute));
  });

  it("re-points the inverse band the same way in both", () => {
    expect(Object.fromEntries(block(css, ':root:not([data-theme="light"]) .inverse', media))).toEqual(
      Object.fromEntries(block(css, '[data-theme="dark"] .inverse')),
    );
  });

  it("would notice a drifted copy (control)", () => {
    const drifted = css.replace(/(\[data-theme="dark"\] \{[^}]*?--bg-canvas:\s*)var\(--neutral-950\)/, "$1var(--neutral-900)");
    expect(drifted).not.toBe(css);
    const at = drifted.indexOf("@media (prefers-color-scheme: dark)");
    expect(Object.fromEntries(block(drifted, ':root:not([data-theme="light"])', at))).not.toEqual(
      Object.fromEntries(block(drifted, '[data-theme="dark"]', at + 1)),
    );
  });
});

describe("custom properties", () => {
  // Set inline by Sprite.tsx, not in a stylesheet.
  const INLINE = new Set(["--sprite-x", "--sprite-y", "--sprite-columns"]);
  const all = files.map(read).join("\n");
  const declared = new Set([...all.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));

  // A read with a fallback, var(--x, …), is a socket a parent may fill (layout.css, --sprite-zoom).
  it("are all declared somewhere when read without a fallback", () => {
    const read = new Set([...all.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]!));
    const missing = [...read].filter((name) => !declared.has(name) && !INLINE.has(name));
    expect(read.size).toBeGreaterThan(100);
    expect(missing).toEqual([]);
  });

  it("would notice one that is not (control)", () => {
    expect(declared.has("--width-build")).toBe(false);
    expect(declared.has("--bg-canvas")).toBe(true);
  });
});
