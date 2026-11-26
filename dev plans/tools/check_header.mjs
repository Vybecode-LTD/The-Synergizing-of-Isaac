// Drives the locally built site in real Chrome: the theme switch, its memory across a reload, the logo,
// Back, and the header at desktop and phone widths. Screenshots land next to this file.
import { chromium } from "file:///C:/Users/vybec/.claude/skills/verify-real-pass/scripts/node_modules/playwright/index.mjs";
import os from "node:os";
import path from "node:path";

const here = os.tmpdir(); // screenshots go to the temp folder, never into the repo
const SITE = process.env.SITE ?? "http://localhost:8001";
const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);

const browser = await chromium.launch({ channel: "chrome" });
const problems = [];
async function newPage(options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
  page.on("pageerror", (e) => problems.push(String(e)));
  return { context, page };
}
const theme = (page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const bars = (page) =>
  page.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => `${m.dataset.themeColor}: ${m.media}`).join(", "));
const canvas = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const h2 = (page) => page.locator("h2").first().textContent();

// Desktop, system light.
{
  const { context, page } = await newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  await page.goto(`${SITE}/?i=118.38`);
  await page.getByRole("heading", { name: "1 synergy" }).waitFor();
  check("opens the build", (await h2(page)) === "1 synergy");
  check("no theme pinned on a first visit", (await theme(page)) === null);
  const lightCanvas = await canvas(page);
  await page.locator(".site-header").screenshot({ path: path.join(here, "header-1440-light.png") });

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  check("switch pins dark", (await theme(page)) === "dark");
  check("browser bar follows", (await bars(page)) === "light: not all, dark: all", await bars(page));
  const darkCanvas = await canvas(page);
  check("the page really turns dark", darkCanvas !== lightCanvas, `${lightCanvas} -> ${darkCanvas}`);
  await page.locator(".site-header").screenshot({ path: path.join(here, "header-1440-dark.png") });

  // theme.js runs before the app: check the attribute at the earliest point the page lets us.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      window.__themeAtDomReady = document.documentElement.getAttribute("data-theme");
    });
  });
  await page.reload();
  await page.getByRole("heading", { name: "1 synergy" }).waitFor();
  check("dark survives a reload", (await theme(page)) === "dark");
  check("dark is on before the app runs", (await page.evaluate(() => window.__themeAtDomReady)) === "dark");

  await page.getByRole("link", { name: "isaac.toys, home" }).click();
  await page.getByRole("heading", { name: "Start with what’s in your run" }).waitFor();
  check("logo goes home to an empty builder", page.url() === `${SITE}/`, page.url());
  await page.goBack();
  await page.getByRole("heading", { name: "1 synergy" }).waitFor({ timeout: 5000 }).catch(() => {});
  check("Back returns to the build", (await h2(page)) === "1 synergy", page.url());

  await page.getByRole("link", { name: "Items" }).click();
  await page.getByRole("link", { name: "isaac.toys, home" }).click();
  await page.getByRole("heading", { name: "Start with what’s in your run" }).waitFor();
  check("logo from another page goes home too", page.url() === `${SITE}/`, page.url());

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  check("switch back pins light", (await theme(page)) === "light");
  check("light canvas is the light one", (await canvas(page)) === lightCanvas);
  await context.close();
}

// Phone, system dark: the header's two rows, and a light choice overriding the system.
{
  const { context, page } = await newPage({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  await page.goto(`${SITE}/items`);
  await page.locator(".site-header").screenshot({ path: path.join(here, "header-390-dark.png") });
  const box = async (selector) => page.locator(selector).first().boundingBox();
  const mark = await box(".wordmark");
  const toggle = await box(".theme-toggle");
  const nav = await box(".site-nav");
  check("phone: switch shares the wordmark's row", Math.abs(mark.y + mark.height / 2 - (toggle.y + toggle.height / 2)) < 12);
  check("phone: switch at the right edge", toggle.x + toggle.width > 390 - 40, `${toggle.x + toggle.width}`);
  check("phone: nav on its own row below", nav.y >= toggle.y + toggle.height - 1);
  check("phone: switch is a full tap target", toggle.width >= 44 && toggle.height >= 44, `${toggle.width}x${toggle.height}`);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  check("phone: no sideways page scroll", scrollWidth <= 390, String(scrollWidth));
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  check("light choice overrides a dark system", (await theme(page)) === "light");
  await page.locator(".site-header").screenshot({ path: path.join(here, "header-390-light.png") });
  await context.close();
}

await browser.close();
check("no console errors or CSP refusals", problems.length === 0, problems.join(" | "));
console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`${results.length - failed} of ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
