/**
 * The site's name in one place. The owner registered issac.toys on 2026-11-24;
 * if the spelling changes, change it here and in the API's SITE_URL (api/app/settings.py).
 */
export const SITE = {
  domain: "issac.toys",
  tagline: "Synergy builder for The Binding of Isaac: Repentance",
  game: "The Binding of Isaac: Repentance",
} as const;

/** "issac" and ".toys", for the two-tone wordmark. */
export function wordmarkParts(domain: string = SITE.domain): [string, string] {
  const dot = domain.indexOf(".");
  return dot === -1 ? [domain, ""] : [domain.slice(0, dot), domain.slice(dot)];
}
