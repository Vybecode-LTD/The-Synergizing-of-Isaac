/** What every call to this site's API shares: JSON in and out, and one error with the server's reason. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** The server's `detail.code`, or null when it sent none (or nothing came back at all: status 0). */
    readonly code: string | null,
    /** The server's own sentence, fit to show, when it sent one. */
    readonly serverMessage: string | null,
  ) {
    super(serverMessage ?? `HTTP ${status}`);
  }
}

async function request(method: string, url: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, null, null);
  }
  const parsed: unknown = await response.json().catch(() => null);
  if (response.ok) return parsed;
  const detail = (parsed as { detail?: { code?: unknown; message?: unknown } } | null)?.detail;
  throw new ApiError(
    response.status,
    typeof detail?.code === "string" ? detail.code : null,
    typeof detail?.message === "string" ? detail.message : null,
  );
}

export const getJson = (url: string, signal?: AbortSignal) => request("GET", url, undefined, signal);
export const postJson = (url: string, body: unknown, signal?: AbortSignal) => request("POST", url, body, signal);
export const patchJson = (url: string, body: unknown) => request("PATCH", url, body);
export const deleteJson = (url: string) => request("DELETE", url);

/** A sentence for any failed call: the server's own, or a plain one when nothing usable came back. */
export function errorMessage(cause: unknown, fallback = "That didn't work. Try again in a moment."): string {
  return cause instanceof ApiError && cause.serverMessage ? cause.serverMessage : fallback;
}
