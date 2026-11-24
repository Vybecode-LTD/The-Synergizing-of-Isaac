import type { GameData } from "./data";
import type { Build } from "./types";

/** A real run rarely holds more than this, and it bounds the AI prompt. Mirrored in api/app/settings.py. */
export const MAX_ITEMS = 16;
export const MAX_TRINKETS = 6;

function ids(raw: string | null, known: (id: number) => boolean, max: number): number[] {
  if (!raw) return [];
  const out: number[] = [];
  for (const part of raw.split(".")) {
    if (!/^\d{1,4}$/.test(part)) continue;
    const id = Number(part);
    if (known(id) && !out.includes(id)) out.push(id);
    if (out.length === max) break;
  }
  return out;
}

/**
 * Read a build from the address bar: ?c=azazel&i=118.114&t=39.
 * Anything unknown is ignored, so an old or hand-edited link still opens.
 */
export function decodeBuild(params: URLSearchParams, data: GameData): Build {
  const c = params.get("c");
  return {
    character: c && data.characterBySlug.has(c) ? c : null,
    items: ids(params.get("i"), (id) => data.itemById.has(id), MAX_ITEMS),
    trinkets: ids(params.get("t"), (id) => data.trinketById.has(id), MAX_TRINKETS),
  };
}

/** The query string for a build. Empty parts are left out, so an empty build is "". */
export function encodeBuild(build: Build): string {
  const parts: string[] = [];
  if (build.character) parts.push(`c=${build.character}`);
  if (build.items.length) parts.push(`i=${build.items.join(".")}`);
  if (build.trinkets.length) parts.push(`t=${build.trinkets.join(".")}`);
  return parts.join("&");
}

export function builderPath(build: Build): string {
  const query = encodeBuild(build);
  return query ? `/?${query}` : "/";
}

export function isEmpty(build: Build): boolean {
  return !build.character && build.items.length === 0 && build.trinkets.length === 0;
}

export function addItem(build: Build, id: number): Build {
  if (build.items.includes(id) || build.items.length >= MAX_ITEMS) return build;
  return { ...build, items: [...build.items, id] };
}

export function addTrinket(build: Build, id: number): Build {
  if (build.trinkets.includes(id) || build.trinkets.length >= MAX_TRINKETS) return build;
  return { ...build, trinkets: [...build.trinkets, id] };
}

export function removeItem(build: Build, id: number): Build {
  return { ...build, items: build.items.filter((i) => i !== id) };
}

export function removeTrinket(build: Build, id: number): Build {
  return { ...build, trinkets: build.trinkets.filter((t) => t !== id) };
}
