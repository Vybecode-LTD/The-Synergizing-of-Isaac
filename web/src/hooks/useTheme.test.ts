// The light/dark switch has two ways in: public/theme.js before the first paint, and applyTheme once the
// app runs. Both are run here against the theme-color tags from the real index.html, so they cannot drift.
import { act, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_KEY, applyTheme, useTheme, type Theme } from "./useTheme";

const web = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const indexHtml = readFileSync(path.join(web, "index.html"), "utf8");
const themeScript = readFileSync(path.join(web, "public/theme.js"), "utf8");
const metaTags = indexHtml.match(/<meta name="theme-color"[^>]*>/g) ?? [];
const runThemeScript = () => new Function(themeScript)();

const pinned = () => document.documentElement.getAttribute("data-theme");
const bars = () =>
  [...document.querySelectorAll('meta[name="theme-color"]')].map(
    (m) => `${m.getAttribute("data-theme-color")}: ${m.getAttribute("media")}`,
  );
const SYSTEM = ["light: (prefers-color-scheme: light)", "dark: (prefers-color-scheme: dark)"];

beforeEach(() => {
  document.head.innerHTML = metaTags.join("");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("index.html", () => {
  it("tags each theme-color with its theme and runs theme.js before the app", () => {
    expect(bars()).toEqual(SYSTEM);
    const script = indexHtml.indexOf('<script src="/theme.js"></script>');
    expect(script).toBeGreaterThan(indexHtml.lastIndexOf('<meta name="theme-color"'));
    expect(script).toBeLessThan(indexHtml.indexOf("/src/main.tsx"));
  });
});

const ways: [string, (theme: Theme) => void][] = [
  ["applyTheme", (theme) => applyTheme(theme)],
  [
    "public/theme.js",
    (theme) => {
      localStorage.setItem(THEME_KEY, JSON.stringify(theme));
      runThemeScript();
    },
  ],
];

describe.each(ways)("%s", (_, apply) => {
  it("pins dark, and the browser's bar takes the dark colour", () => {
    apply("dark");
    expect(pinned()).toBe("dark");
    expect(bars()).toEqual(["light: not all", "dark: all"]);
  });

  it("pins light, and the browser's bar takes the light colour", () => {
    apply("light");
    expect(pinned()).toBe("light");
    expect(bars()).toEqual(["light: all", "dark: not all"]);
  });
});

describe("public/theme.js", () => {
  it("leaves the system setting in charge with nothing saved, junk saved or storage blocked", () => {
    runThemeScript();
    localStorage.setItem(THEME_KEY, JSON.stringify("purple"));
    runThemeScript();
    localStorage.setItem(THEME_KEY, "{not json");
    runThemeScript();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(runThemeScript).not.toThrow();
    expect(pinned()).toBeNull();
    expect(bars()).toEqual(SYSTEM);
  });
});

describe("applyTheme(null)", () => {
  it("hands the page and the bar back to the system setting", () => {
    applyTheme("dark");
    applyTheme(null);
    expect(pinned()).toBeNull();
    expect(bars()).toEqual(SYSTEM);
  });
});

describe("useTheme", () => {
  function stubSystem(dark: boolean) {
    const system = { dark, listeners: new Set<() => void>() };
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return system.dark;
      },
      addEventListener: (_: string, listener: () => void) => system.listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => system.listeners.delete(listener),
    }));
    return (next: boolean) =>
      act(() => {
        system.dark = next;
        system.listeners.forEach((listener) => listener());
      });
  }

  it("follows the system setting until the visitor chooses, then keeps the choice", () => {
    const setSystem = stubSystem(true);
    const first = renderHook(() => useTheme());
    expect(first.result.current.theme).toBe("dark");
    expect(pinned()).toBeNull();
    setSystem(false);
    expect(first.result.current.theme).toBe("light");

    act(() => first.result.current.toggle());
    expect(first.result.current.theme).toBe("dark");
    expect(pinned()).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe('"dark"');
    // Once chosen, the system setting no longer decides.
    setSystem(true);
    setSystem(false);
    expect(first.result.current.theme).toBe("dark");

    first.unmount();
    document.documentElement.removeAttribute("data-theme");
    const next = renderHook(() => useTheme());
    expect(next.result.current.theme).toBe("dark");
    expect(pinned()).toBe("dark");
  });

  it("starts light where the browser cannot say, as the stylesheet does", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    act(() => result.current.toggle());
    expect(pinned()).toBe("dark");
  });
});
