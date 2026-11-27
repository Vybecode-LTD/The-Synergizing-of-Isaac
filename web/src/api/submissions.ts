import type { Build, Rating } from "../engine/types";
import { buildBody } from "./analysis";
import { postJson } from "./http";

/** A synergy for the site's owner to review (POST /api/submissions). It joins the list only by pull request. */
export interface SubmissionBody {
  character: string | null;
  items: number[];
  trinkets: number[];
  rating: Rating;
  description: string;
  sourceUrl?: string | null;
  /** The form's honeypot: a person never sees it, so it is always empty from one. */
  website?: string;
}

export async function submitSynergy(body: SubmissionBody): Promise<void> {
  await postJson("/api/submissions", { ...body, website: body.website ?? "" });
}

/**
 * Send what the AI read found, by its place in the read's list. The server stores its own saved copy,
 * never words from this page, so a find marked "found by AI" really came from the AI.
 */
export async function submitFound(build: Build, picks: number[]): Promise<void> {
  await postJson("/api/submissions/from-analysis", { ...buildBody(build), picks });
}

/** At least two things: two pickups, or a pickup and a character. The server says the same. */
export function canSubmit(itemIds: number[], trinketIds: number[], characterSlugs: string[]): boolean {
  return itemIds.length + trinketIds.length > 0 && itemIds.length + trinketIds.length + characterSlugs.length >= 2;
}
