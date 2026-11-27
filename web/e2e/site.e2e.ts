// The site in a real browser, through the server that serves it: the build in the address bar, the theme
// switch and its memory, the logo, Back, the pages, a real 404, the footer, the phone layout, and no
// console error or CSP refusal anywhere. `npm run e2e`; how to run it is in docs/TESTING.md.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const data = (name: string): unknown[] =>
  JSON.parse(readFileSync(new URL(`../../data/${name}`, import.meta.url), "utf-8")) as unknown[];
const SYNERGIES = data("synergies.json").length;

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const h1 = (page: Page) => page.getByRole("heading", { level: 1 });

/** The footer's brandmark has loaded, is decorative, is `size` wide, and sits left of the credit, notice and link. */
async function expectBrandmark(page: Page, size: number) {
  const footer = page.getByRole("contentinfo");
  const mark = footer.locator("img.site-footer__mark");
  await expect(mark).toHaveAttribute("alt", "");
  await expect.poll(() => mark.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const markBox = (await mark.boundingBox())!;
  const textBox = (await footer.locator(".site-footer__text").boundingBox())!;
  expect(markBox.width).toBe(size);
  expect(markBox.x + markBox.width).toBeLessThan(textBox.x);
  expect(markBox.y).toBeLessThan(textBox.y + textBox.height);
  expect(markBox.y + markBox.height).toBeGreaterThan(textBox.y);
}
const results = (page: Page) => page.locator("#synergies-title");
const startHeading = (page: Page) => page.getByRole("heading", { name: "Start with what’s in your run" });
const theme = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const canvas = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const logo = (page: Page) => page.getByRole("link", { name: "isaac.toys, home" });

test.describe("desktop", () => {
  test.use({ viewport: DESKTOP, colorScheme: "light" });

  test("home is an empty builder, served with its CSP, and the footer credits CarbonDSP beside its brandmark", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-security-policy"]).toContain("script-src 'self'");
    await expect(h1(page)).toHaveText("Binding of Isaac synergy builder");
    await expect(startHeading(page)).toBeVisible();
    await expect(page).toHaveTitle("Binding of Isaac Synergy Builder for Repentance | isaac.toys");

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByText("Built by CarbonDSP for the TBOI community.")).toBeVisible();
    await expect(footer.getByRole("link", { name: "CarbonDSP" })).toHaveAttribute("href", "https://carbondsp.com/");
    await expect(footer.getByText(/is an unofficial fan project/)).toBeVisible();
    await expect(footer.getByRole("link", { name: "About, sources and credits" })).toHaveAttribute("href", "/about");
    await expectBrandmark(page, 128);
  });

  test("builds from the search box with the keyboard, and the address is the build", async ({ page }) => {
    await page.goto("/");
    const picker = page.getByRole("combobox", { name: "Add an item or trinket" });
    await picker.fill("brimst");
    await expect(page.getByRole("option").first()).toContainText("Brimstone");
    await picker.press("Enter");
    await expect(results(page)).toHaveText("No known synergy yet");
    await picker.fill("tammy");
    await picker.press("Enter");
    await expect(results(page)).toHaveText("1 synergy");
    await expect(page.getByText(/fires 10 Brimstone lasers in all directions/)).toBeVisible();

    const ids = new URL(page.url()).searchParams.get("i")?.split(".").sort();
    expect(ids).toEqual(["118", "38"]);
    await page.reload();
    await expect(results(page)).toHaveText("1 synergy");
  });

  test("the theme switch pins dark before the app runs, and switches back", async ({ page }) => {
    await page.goto("/?i=118.38");
    await expect(results(page)).toHaveText("1 synergy");
    expect(await theme(page)).toBeNull();
    const light = await canvas(page);

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    expect(await theme(page)).toBe("dark");
    const bars = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => `${m.dataset.themeColor}: ${m.media}`),
    );
    expect(bars).toEqual(["light: not all", "dark: all"]);
    const dark = await canvas(page);
    expect(dark).not.toBe(light);

    // theme.js runs before the app: read the attribute at the earliest point the page allows.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { themeAtDomReady: string | null }).themeAtDomReady =
          document.documentElement.getAttribute("data-theme");
      });
    });
    await page.reload();
    await expect(results(page)).toHaveText("1 synergy");
    expect(await page.evaluate(() => (window as unknown as { themeAtDomReady: string | null }).themeAtDomReady)).toBe("dark");
    expect(await canvas(page)).toBe(dark);

    await page.getByRole("button", { name: "Switch to light theme" }).click();
    expect(await theme(page)).toBe("light");
    expect(await canvas(page)).toBe(light);
  });

  test("the logo goes home to an empty builder, and Back brings the build back", async ({ page }) => {
    await page.goto("/?i=118.38");
    await expect(results(page)).toHaveText("1 synergy");
    await logo(page).click();
    await expect(startHeading(page)).toBeVisible();
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe("/");
    await page.goBack();
    await expect(results(page)).toHaveText("1 synergy");

    await nav(page).getByRole("link", { name: "Items" }).click();
    await expect(h1(page)).toHaveText("All Repentance items");
    await logo(page).click();
    await expect(startHeading(page)).toBeVisible();
  });

  test("an item opens from the item list with its own title", async ({ page }) => {
    await page.goto("/items");
    await expect(h1(page)).toHaveText("All Repentance items");
    await page.locator('a[href="/items/brimstone"]').first().click();
    await expect(page).toHaveURL(/\/items\/brimstone$/);
    await expect(h1(page)).toHaveText("Brimstone");
    await expect(page).toHaveTitle("Brimstone Synergies in The Binding of Isaac | isaac.toys");
  });

  test("the synergy list shows every synergy in data/", async ({ page }) => {
    await page.goto("/synergies");
    await expect(h1(page)).toHaveText("All Repentance synergies");
    await expect(page.getByText(`${SYNERGIES} synergies`, { exact: true })).toBeVisible();
  });

  test("the owner's inbox loads on its own, is never indexed, and asks for a sign-in or the set-up", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toBe("noindex");
    await expect(h1(page)).toHaveText("Synergy inbox");
    await expect(page).toHaveTitle("Synergy Inbox | isaac.toys");
    // Either the site has an admin set (Railway variables) or it explains how to set one; never the inbox itself.
    const signIn = page.getByRole("form", { name: "Sign in" });
    const setUp = page.getByRole("heading", { name: "The inbox isn’t set up on this site" });
    await expect(signIn.or(setUp)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
    // A visitor's pages never load the inbox's code.
    await page.goto("/");
    const scripts = await page.evaluate(() => performance.getEntriesByType("resource").map((r) => r.name));
    expect(scripts.filter((name) => /AdminPage-[\w-]+\.js$/.test(name))).toEqual([]);
  });

  test("an address that leads nowhere is a real 404, and so is one in the wrong case", async ({ page, problems }) => {
    for (const path of ["/no-such-room", "/Items"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(h1(page)).toHaveText("This room is empty");
    }
    // Chrome reports the 404 document itself as a failed load; that one is the point of the test.
    const expected = problems.filter((p) => /status of 404/.test(p));
    expect(expected.length).toBeLessThanOrEqual(2);
    problems.splice(0, problems.length, ...problems.filter((p) => !expected.includes(p)));
  });
});

test.describe("phone", () => {
  test.use({ viewport: PHONE, colorScheme: "dark" });

  test("the header keeps the switch beside the wordmark, and a light choice overrides a dark system", async ({ page }) => {
    await page.goto("/items");
    await expect(h1(page)).toHaveText("All Repentance items");
    const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
    const mark = await box(".wordmark");
    const toggle = await box(".theme-toggle");
    const navBox = await box(".site-nav");
    expect(Math.abs(mark.y + mark.height / 2 - (toggle.y + toggle.height / 2))).toBeLessThan(12);
    expect(toggle.x + toggle.width).toBeGreaterThan(PHONE.width - 40);
    expect(navBox.y).toBeGreaterThanOrEqual(toggle.y + toggle.height - 1);
    expect(toggle.width).toBeGreaterThanOrEqual(44);
    expect(toggle.height).toBeGreaterThanOrEqual(44);

    await page.getByRole("button", { name: "Switch to light theme" }).click();
    expect(await theme(page)).toBe("light");
  });

  for (const path of ["/", "/?i=118.38", "/items/brimstone", "/synergies", "/about", "/admin"]) {
    test(`no sideways scroll at phone width on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(h1(page)).toBeVisible();
      await expect(page.getByRole("contentinfo").getByRole("link", { name: "CarbonDSP" })).toBeVisible();
      await expectBrandmark(page, 80);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(PHONE.width);
    });
  }
});
