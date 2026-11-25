/** Lower-case, drop accents and punctuation, collapse spaces: "Mom's Knife" -> "moms knife". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’.!?]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}

/**
 * How well a name answers a query. 0 means no match; higher is better.
 * Exact > starts with > a word starts with > contains > letters in order.
 */
export function matchScore(query: string, name: string): number {
  const q = normalize(query);
  const n = normalize(name);
  if (!q) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (n.split(" ").some((word) => word.startsWith(q))) return 60;
  if (n.includes(q)) return 40;
  const squeezed = q.replace(/ /g, "");
  if (squeezed.length >= 3 && isSubsequence(squeezed, n.replace(/ /g, ""))) return 10;
  return 0;
}

export interface Searchable {
  name: string;
  /** Tie-break when two names match equally well: higher first. */
  weight?: number;
}

/** The best matches for a query, best first. An empty query matches nothing. */
export function search<T extends Searchable>(query: string, entries: readonly T[], limit = 8): T[] {
  const scored: { entry: T; score: number }[] = [];
  for (const entry of entries) {
    const score = matchScore(query, entry.name);
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (b.entry.weight ?? 0) - (a.entry.weight ?? 0) ||
      a.entry.name.length - b.entry.name.length ||
      a.entry.name.localeCompare(b.entry.name),
  );
  return scored.slice(0, limit).map((s) => s.entry);
}
