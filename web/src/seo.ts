import aboutJson from "@data/content/about.json";
import pagesJson from "@data/content/pages.json";
import metaJson from "@data/meta.json";
import { gameData, type GameData } from "./engine/data";
import { synergiesFor, topPartners, type SubjectKind } from "./engine/synergy";
import type { Character, Item, Trinket } from "./engine/types";
import { SITE } from "./site";

/**
 * What each public page is called and says about itself, filled from data/content/pages.json.
 * api/app/pages.py does the same on the server; both are checked against data/tests/parity.json.
 */

type Values = Record<string, string | number>;
type Template = { titles: string[]; description: string; h1: string; lede: string; answer?: string; answerNone?: string };

export type PageKind =
  | "home"
  | "items"
  | "item"
  | "trinkets"
  | "trinket"
  | "characters"
  | "character"
  | "synergies"
  | "about"
  | "notFound";

export interface PageMeta {
  kind: PageKind;
  path: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  answer: string;
  subject?: Item | Trinket | Character;
}

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;
const templates = pagesJson as unknown as Record<PageKind, Template>;
export const pageContent = pagesJson;
export const aboutContent = aboutJson;

export function fill(template: string, values: Values): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** Length in characters as Python counts them, so both sides cut in the same place. */
const chars = (text: string) => [...text];

export function fitTitle(titles: string[], values: Values): string {
  const filled = titles.map((t) => fill(t, values));
  return filled.find((t) => chars(t).length <= TITLE_LIMIT) ?? filled[filled.length - 1]!;
}

export function clamp(text: string, limit = DESCRIPTION_LIMIT): string {
  const all = chars(text);
  if (all.length <= limit) return text;
  let cut = all.slice(0, limit - 1).join("");
  if (cut.includes(" ")) cut = cut.slice(0, cut.lastIndexOf(" "));
  return `${cut.replace(/[ ,;:.]+$/, "")}…`;
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function siteValues(data: GameData = gameData, domain: string = SITE.domain): Values {
  return {
    domain,
    game: SITE.game,
    items: data.items.length,
    trinkets: data.trinkets.length,
    characters: data.characters.length,
    synergies: data.synergies.length,
    updated: longDate(metaJson.updated),
  };
}

function subjectValues(data: GameData, kind: SubjectKind, record: Item | Trinket | Character): Values {
  const key = kind === "character" ? (record as Character).slug : (record as Item | Trinket).id;
  const count = synergiesFor(kind, key, data.synergies).length;
  const top = topPartners(kind, key, data);
  const fallback = kind === "item" ? pagesJson.fallbacks.itemEffect : kind === "trinket" ? pagesJson.fallbacks.trinketEffect : "";
  const effect = "effect" in record ? record.effect.replace(/\.+$/, "") : "";
  return {
    name: record.name,
    effect: effect || fallback,
    quality: "quality" in record ? record.quality : "",
    n: count,
    synergyWord: count === 1 ? "synergy" : "synergies",
    isAre: top.length === 1 ? "is" : "are",
    top: joinNames(top),
  };
}

function page(
  data: GameData,
  domain: string,
  kind: PageKind,
  path: string,
  record?: Item | Trinket | Character,
): PageMeta {
  const template = templates[kind];
  const values = siteValues(data, domain);
  let answer = "";
  if (record) {
    Object.assign(values, subjectValues(data, kind as SubjectKind, record));
    answer = fill((values.n ? template.answer : template.answerNone) ?? "", values);
  }
  return {
    kind,
    path,
    title: fitTitle(template.titles, values),
    description: clamp(fill(template.description, values)),
    h1: fill(template.h1, values),
    lede: fill(template.lede, values),
    answer,
    subject: record,
  };
}

const LISTS: Record<string, PageKind> = {
  "/items": "items",
  "/trinkets": "trinkets",
  "/characters": "characters",
  "/synergies": "synergies",
  "/about": "about",
};

/** The page at a path. An address the site does not have gets the notFound page. */
export function describePage(path: string, data: GameData = gameData, domain: string = SITE.domain): PageMeta {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return page(data, domain, "home", "/");
  const list = LISTS[clean];
  if (list) return page(data, domain, list, clean);
  const parts = clean.replace(/^\/+/, "").split("/");
  if (parts.length === 2) {
    const [section, slug] = parts as [string, string];
    const record =
      section === "items"
        ? data.itemBySlug.get(slug)
        : section === "trinkets"
          ? data.trinketBySlug.get(slug)
          : section === "characters"
            ? data.characterBySlug.get(slug)
            : undefined;
    const kind = section === "items" ? "item" : section === "trinkets" ? "trinket" : "character";
    if (record) return page(data, domain, kind, clean, record);
  }
  return page(data, domain, "notFound", clean);
}
