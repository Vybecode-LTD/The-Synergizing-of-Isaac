import type { Build } from "../engine/types";

export interface Analysis {
  text: string;
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

function codeFor(status: number, code: unknown): AnalysisErrorCode {
  if (code === "rate_limited" || code === "budget_exhausted" || code === "not_configured") return code;
  if (status === 429) return "rate_limited";
  if (status === 503) return "not_configured";
  if (status === 400 || status === 422) return "invalid";
  return "failed";
}

/** Ask the server for an AI read on a build. Throws AnalysisError with a message fit to show. */
export async function analyzeBuild(build: Build, signal?: AbortSignal): Promise<Analysis> {
  let response: Response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character: build.character, items: build.items, trinkets: build.trinkets }),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new AnalysisError("failed", FALLBACK.failed);
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok && body && typeof (body as Analysis).text === "string") return body as Analysis;

  const detail = (body as { detail?: { code?: unknown; message?: unknown } } | null)?.detail;
  const code = codeFor(response.status, detail?.code);
  throw new AnalysisError(code, typeof detail?.message === "string" ? detail.message : FALLBACK[code]);
}

export type AnalysisBlock = { kind: "heading" | "paragraph"; text: string } | { kind: "list"; items: string[] };

/**
 * Turn the model's plain-text answer into blocks we render ourselves.
 * Nothing in the answer is ever treated as HTML.
 */
export function analysisBlocks(text: string): AnalysisBlock[] {
  const blocks: AnalysisBlock[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
    if (!line) continue;
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") last.items.push(bullet[1]!);
      else blocks.push({ kind: "list", items: [bullet[1]!] });
    } else if (line.endsWith(":") && line.length <= 40) {
      blocks.push({ kind: "heading", text: line.slice(0, -1) });
    } else {
      blocks.push({ kind: "paragraph", text: line });
    }
  }
  return blocks;
}
