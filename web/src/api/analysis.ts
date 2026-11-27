import type { Build, Rating } from "../engine/types";
import { RATINGS } from "../engine/types";
import { postJson, ApiError } from "./http";

/** The AI read, in the sections the server checked (api/app/analysis.py, read_answer). */
export interface AnalysisRead {
  howItPlays: string[];
  bestInteractions: string[];
  watchOutFor: string[];
  verdict: { tier: Rating; why: string };
}

/** An interaction the AI found that the curated list lacks, already checked against the build. */
export interface FoundSynergy {
  /** The find's combination: what is sent back to pick it, so a pick never depends on its place in a list. */
  key: string;
  itemIds: number[];
  trinketIds: number[];
  characterSlugs: string[];
  rating: Rating;
  description: string;
}

export interface Analysis {
  read: AnalysisRead;
  found: FoundSynergy[];
  /** True when this exact build was analysed before and the saved answer was reused. */
  cached: boolean;
  /** Fresh analyses this visitor has left today. */
  remaining: number;
  limit: number;
}

export type AnalysisErrorCode = "rate_limited" | "budget_exhausted" | "not_configured" | "invalid" | "failed";

export class AnalysisError extends Error {
  constructor(
    readonly code: AnalysisErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const FALLBACK: Record<AnalysisErrorCode, string> = {
  rate_limited: "You've used today's AI analyses. They reset at midnight UTC.",
  budget_exhausted: "The site's AI budget for today is used up. It resets at midnight UTC.",
  not_configured: "AI analysis isn't switched on for this site yet.",
  invalid: "That build couldn't be analysed.",
  failed: "The AI didn't answer. Try again in a moment.",
};

function codeFor(status: number, code: string | null): AnalysisErrorCode {
  if (code === "rate_limited" || code === "budget_exhausted" || code === "not_configured") return code;
  if (status === 429) return "rate_limited";
  if (status === 503) return "not_configured";
  if (status === 400 || status === 422) return "invalid";
  return "failed";
}

const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((line) => typeof line === "string");
const numbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((n) => typeof n === "number");

/** One find, checked field by field: the panel reads every one of them as it draws. */
function isFind(value: unknown): value is FoundSynergy {
  const f = value as Partial<FoundSynergy> | null;
  return Boolean(
    f &&
      typeof f.key === "string" &&
      numbers(f.itemIds) &&
      numbers(f.trinketIds) &&
      strings(f.characterSlugs) &&
      RATINGS.includes(f.rating as Rating) &&
      typeof f.description === "string",
  );
}

/** Whether a response body is the shape this page can show. Anything else is treated as no answer. */
export function isAnalysis(body: unknown): body is Analysis {
  const a = body as Partial<Analysis> | null;
  const read = a?.read;
  return Boolean(
    read &&
      strings(read.howItPlays) &&
      strings(read.bestInteractions) &&
      strings(read.watchOutFor) &&
      RATINGS.includes(read.verdict?.tier as Rating) &&
      typeof read.verdict?.why === "string" &&
      Array.isArray(a.found) &&
      a.found.every(isFind) &&
      typeof a.cached === "boolean",
  );
}

/** Ask the server for an AI read on a build. Throws AnalysisError with a message fit to show. */
export async function analyzeBuild(build: Build, signal?: AbortSignal): Promise<Analysis> {
  try {
    const body = await postJson("/api/analyze", buildBody(build), signal);
    if (isAnalysis(body)) return body;
    throw new AnalysisError("failed", FALLBACK.failed);
  } catch (cause) {
    if (cause instanceof ApiError) {
      const code = codeFor(cause.status, cause.code);
      throw new AnalysisError(code, cause.serverMessage ?? FALLBACK[code]);
    }
    throw cause;
  }
}

/** The ids of a build, and nothing else: the only thing the server ever takes from the browser. */
export function buildBody(build: Build) {
  return { character: build.character, items: build.items, trinkets: build.trinkets };
}

export type Segment = { text: string } | { kind: "item" | "trinket"; id: number; name: string };

/**
 * Split a sentence into plain text and the build's pickups it names, so the page can show each name
 * with its sprite. Longest names first ("Brimstone" never eats "Brimstone Bombs"), whole words only.
 * Nothing in the text is ever treated as HTML.
 */
export function mentions(text: string, pieces: { kind: "item" | "trinket"; id: number; name: string }[]): Segment[] {
  const sorted = [...pieces].sort((a, b) => b.name.length - a.name.length);
  const out: Segment[] = [];
  let plain = "";
  const word = /[\p{L}\p{N}]/u;
  for (let at = 0; at < text.length; ) {
    const hit = sorted.find(
      (p) =>
        text.startsWith(p.name, at) &&
        !word.test(text[at - 1] ?? "") &&
        !word.test(text[at + p.name.length] ?? ""),
    );
    if (hit) {
      if (plain) out.push({ text: plain });
      plain = "";
      out.push({ kind: hit.kind, id: hit.id, name: hit.name });
      at += hit.name.length;
    } else {
      plain += text[at];
      at += 1;
    }
  }
  if (plain) out.push({ text: plain });
  return out;
}
