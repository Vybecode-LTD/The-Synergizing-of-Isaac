// public/analytics.js: Google Tag Manager with Consent Mode (owner, 2026-11-28). The server adds it to the
// page only in production and never on /admin (api/app/main.py); here the file itself is run as a browser would.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = readFileSync(path.join(web, "public/analytics.js"), "utf8");
const indexHtml = readFileSync(path.join(web, "index.html"), "utf8");

// The European Economic Area, the UK and Switzerland: no analytics cookie by default, and no banner to change it.
const EEA_UK_CH = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU",
  "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

type Layer = unknown[] & { push: (entry: unknown) => number };
const layer = () => (window as unknown as { dataLayer: Layer }).dataLayer;
const entries = () => layer().map((entry) => Array.from(entry as ArrayLike<unknown>));

afterEach(() => {
  delete (window as unknown as { dataLayer?: Layer }).dataLayer;
  delete (window as unknown as { gtag?: unknown }).gtag;
  document.head.querySelectorAll("script[src*='googletagmanager']").forEach((s) => s.remove());
});

describe("analytics.js", () => {
  it("sets consent before anything else, off in the EEA, the UK and Switzerland, and ads off everywhere", () => {
    new Function(script)();
    const [regional, everywhere] = entries();
    expect(regional).toEqual([
      "consent",
      "default",
      {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        region: EEA_UK_CH,
      },
    ]);
    expect(everywhere).toEqual([
      "consent",
      "default",
      { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" },
    ]);
  });

  it("then starts Tag Manager for the site's container, once", () => {
    new Function(script)();
    const after = layer().slice(2);
    expect(Array.from(after[0] as ArrayLike<unknown>)[0]).toBe("js");
    expect(after[1]).toMatchObject({ event: "gtm.js" });
    expect((after[1] as { "gtm.start": number })["gtm.start"]).toBeTypeOf("number");
    const loaders = document.head.querySelectorAll<HTMLScriptElement>("script[src*='googletagmanager']");
    expect([...loaders].map((s) => [s.src, s.async])).toEqual([
      ["https://www.googletagmanager.com/gtm.js?id=GTM-KQ7CJK9M", true],
    ]);
  });

  it("keeps what was already in the data layer", () => {
    (window as unknown as { dataLayer: Layer }).dataLayer = [{ earlier: true }] as unknown as Layer;
    new Function(script)();
    expect(layer()[0]).toEqual({ earlier: true });
  });

  it("is not in the page the app ships: the server adds it in production only", () => {
    expect(indexHtml).not.toContain("analytics.js");
    expect(indexHtml).not.toContain("googletagmanager");
  });
});
