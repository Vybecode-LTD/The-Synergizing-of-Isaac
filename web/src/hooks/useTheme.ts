import { useCallback, useEffect, useState } from "react";
import { readStored, writeStored } from "./storage";

export type Theme = "light" | "dark";

/** Also read by public/theme.js, which applies a saved choice before the first paint. */
export const THEME_KEY = "isaac-toys:theme:v1";

const DARK = "(prefers-color-scheme: dark)";

function systemTheme(): Theme {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK).matches ? "dark" : "light";
}

export function savedTheme(): Theme | null {
  const value = readStored<unknown>(THEME_KEY, null);
  return value === "light" || value === "dark" ? value : null;
}

/**
 * Pins the page to one theme, or with null hands it back to the system setting. The browser's own bar
 * follows: each theme-color tag applies to its own theme only. Kept in step with public/theme.js.
 */
export function applyTheme(theme: Theme | null): void {
  const root = document.documentElement;
  if (theme) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][data-theme-color]')) {
    const own = meta.getAttribute("data-theme-color");
    meta.setAttribute("media", theme ? (own === theme ? "all" : "not all") : `(prefers-color-scheme: ${own})`);
  }
}

/** Light or dark: the visitor's own choice once they make one, until then their system setting. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [saved, setSaved] = useState<Theme | null>(savedTheme);
  const [system, setSystem] = useState<Theme>(systemTheme);

  // Until the visitor chooses, the page follows the system setting as it changes.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(DARK);
    const onChange = () => setSystem(query.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => applyTheme(saved), [saved]);

  const theme = saved ?? system;
  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    writeStored(THEME_KEY, next);
    setSaved(next);
  }, [theme]);
  return { theme, toggle };
}
