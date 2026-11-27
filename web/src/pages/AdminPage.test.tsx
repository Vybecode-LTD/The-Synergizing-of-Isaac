import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Submission } from "../api/admin";
import { App } from "../App";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type Reply = [number, unknown] | ((body: unknown) => [number, unknown]);

/** A stand-in for the server: answers by "METHOD /path?query", records every call. */
function server(routes: Record<string, Reply>) {
  const calls: { key: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ key, body });
    const route = routes[key] ?? routes[key.split("?")[0]!];
    if (!route) return new Response(JSON.stringify({ detail: { code: "not_found", message: `no route ${key}` } }), { status: 404 });
    const [status, reply] = typeof route === "function" ? route(body) : route;
    return new Response(JSON.stringify(reply), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const SIGNED_IN = { configured: true, signedIn: true, username: "owner" };
const SIGNED_OUT = { configured: true, signedIn: false, username: null };
const COUNTS = { new: 1, approved: 0, rejected: 0, added: 0 };
const SUB: Submission = {
  id: 4,
  createdAt: "2026-11-27T18:00:00+00:00",
  origin: "ai",
  itemIds: [38, 118],
  trinketIds: [],
  characterSlugs: ["azazel"],
  rating: "A",
  description: "Ten lasers in a ring.",
  sourceUrl: "https://example.com/wiki",
  status: "new",
  note: null,
  reviewedAt: null,
  alsoSent: 2,
  onList: ["brimstone+tammys-head"],
};
const inbox = (subs: Submission[] = [SUB], counts = COUNTS) => [200, { submissions: subs, counts }] as Reply;

async function openAdmin() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <App />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { level: 1, name: "Synergy inbox" });
  return user;
}

describe("admin inbox", () => {
  it("explains how to set it up when the site has no admin", async () => {
    server({ "GET /api/admin/session": [200, { configured: false, signedIn: false, username: null }] });
    await openAdmin();
    expect(await screen.findByRole("heading", { name: "The inbox isn’t set up on this site" })).toBeInTheDocument();
    expect(screen.getByText("ADMIN_PASSWORD_HASH")).toBeInTheDocument();
    expect(document.title).toBe("Synergy Inbox | isaac.toys");
  });

  it("says so when the server doesn't answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await openAdmin();
    expect(await screen.findByText(/The inbox didn’t answer/)).toBeInTheDocument();
  });

  it("signs in, shows the wrong-login message, and clears the password", async () => {
    let tries = 0;
    const calls = server({
      "GET /api/admin/session": [200, SIGNED_OUT],
      "POST /api/admin/login": () =>
        ++tries === 1
          ? [401, { detail: { code: "wrong_login", message: "That username and password don't match." } }]
          : [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox(),
    });
    const user = await openAdmin();
    const form = await screen.findByRole("form", { name: "Sign in" });
    await user.type(within(form).getByLabelText("Username"), "owner");
    await user.type(within(form).getByLabelText("Password"), "wrong one");
    await user.click(within(form).getByRole("button", { name: "Sign in" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("That username and password don't match.");
    expect(within(form).getByLabelText("Password")).toHaveValue("");

    await user.type(within(form).getByLabelText("Password"), "the right one, long enough");
    await user.click(within(form).getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Ten lasers in a ring.")).toBeInTheDocument();
    expect(calls.find((c) => c.key === "POST /api/admin/login")?.body).toEqual({ username: "owner", password: "wrong one" });
  });

  it("shows what the owner needs to judge a submission", async () => {
    server({ "GET /api/admin/session": [200, SIGNED_IN], "GET /api/admin/submissions?status=new": inbox() });
    await openAdmin();
    const card = (await screen.findByText("Ten lasers in a ring.")).closest("article")!;
    expect(within(card).getByRole("heading", { level: 3 })).toHaveTextContent("Tammy's Head+BrimstoneasAzazel");
    expect(within(card).getByText("Found by the AI")).toBeInTheDocument();
    expect(within(card).getByText("Also sent 2 more times")).toBeInTheDocument();
    expect(within(card).getByText(/already has these pickups \(brimstone\+tammys-head\)/)).toBeInTheDocument();
    const link = within(card).getByRole("link", { name: "https://example.com/wiki" });
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
    expect(screen.getByRole("button", { name: /New\s*1/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("publishes, rejects and deletes (deleting takes a second click)", async () => {
    const calls = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox(),
      "PATCH /api/admin/submissions/4": [200, SUB],
      "DELETE /api/admin/submissions/4": [200, { deleted: 4 }],
    });
    const user = await openAdmin();
    await screen.findByText("Ten lasers in a ring.");
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(calls.some((c) => c.key.startsWith("DELETE"))).toBe(false);
    await user.click(screen.getByRole("button", { name: "Really delete" }));
    const writes = calls.filter((c) => !c.key.startsWith("GET"));
    expect(writes).toEqual([
      { key: "PATCH /api/admin/submissions/4", body: { status: "approved" } },
      { key: "PATCH /api/admin/submissions/4", body: { status: "rejected" } },
      { key: "DELETE /api/admin/submissions/4", body: undefined },
    ]);
  });

  it("edits the words and rating before publishing", async () => {
    const calls = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox(),
      "PATCH /api/admin/submissions/4": [200, SUB],
    });
    const user = await openAdmin();
    await screen.findByText("Ten lasers in a ring.");
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("radio", { name: "S" }));
    const text = screen.getByRole("textbox", { name: "Description" });
    await user.clear(text);
    await user.type(text, "Checked: ten lasers.");
    await user.type(screen.getByRole("textbox", { name: /Note to yourself/ }), "wiki, 2026-11");
    await user.click(screen.getByRole("button", { name: "Save and publish" }));
    expect(calls.at(-2)).toEqual({
      key: "PATCH /api/admin/submissions/4",
      body: { rating: "S", description: "Checked: ten lasers.", note: "wiki, 2026-11", status: "approved" },
    });
  });

  it("switches tabs, and offers the export once something is live", async () => {
    const approved = { ...SUB, id: 5, status: "approved" as const, onList: [], description: "Approved one." };
    const counts = { new: 1, approved: 1, rejected: 0, added: 0 };
    const calls = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox([SUB], counts),
      "GET /api/admin/submissions?status=approved": inbox([approved], counts),
      "GET /api/admin/export": [200, { entries: [{ id: "x" }], submissions: [] }],
      "PATCH /api/admin/submissions/5": [200, SUB],
    });
    const user = await openAdmin();
    expect(await screen.findByRole("heading", { name: "1 live on the site" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Live\s*1/ }));
    expect(await screen.findByText("Approved one.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy JSON" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    // user-event gives the page a clipboard of its own; read back what was copied.
    expect(JSON.parse(await navigator.clipboard.readText())).toEqual({ entries: [{ id: "x" }], submissions: [] });

    // A live one can be taken off the site again.
    await user.click(screen.getByRole("button", { name: "Unpublish" }));
    expect(calls.filter((c) => c.key === "PATCH /api/admin/submissions/5").map((c) => c.body)).toEqual([{ status: "new" }]);
  });

  it("downloads the export as a file", async () => {
    const counts = { new: 0, approved: 1, rejected: 0, added: 0 };
    server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox([], counts),
      "GET /api/admin/export": [200, { entries: [], submissions: [] }],
    });
    URL.createObjectURL = vi.fn(() => "blob:export");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = await openAdmin();
    expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Download export" }));
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^isaac-toys-submissions-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("goes back to the sign-in form when the session has ended", async () => {
    server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": [401, { detail: { code: "signed_out", message: "Sign in first." } }],
    });
    await openAdmin();
    expect(await screen.findByRole("form", { name: "Sign in" })).toBeInTheDocument();
  });

  it("signs out", async () => {
    const calls = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox([]),
      "POST /api/admin/logout": [200, SIGNED_OUT],
    });
    const user = await openAdmin();
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("form", { name: "Sign in" })).toBeInTheDocument();
    expect(calls.map((c) => c.key)).toContain("POST /api/admin/logout");
  });

  it("handles a reviewed submission with a trinket: back to new, plain save, cancel", async () => {
    const rejected: Submission = { ...SUB, id: 9, status: "rejected", itemIds: [118], trinketIds: [39], characterSlugs: [], onList: [] };
    const calls = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox([rejected]),
      "PATCH /api/admin/submissions/9": [200, rejected],
    });
    const user = await openAdmin();
    const card = (await screen.findByText("Ten lasers in a ring.")).closest("article")!;
    expect(within(card).getByRole("heading", { level: 3 })).toHaveTextContent("Brimstone+Cancer");
    expect(within(card).queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "Back to new" }));

    await user.click(within(card).getByRole("button", { name: "Edit" }));
    await user.click(within(card).getByRole("button", { name: "Cancel" }));
    expect(within(card).queryByRole("textbox", { name: "Description" })).not.toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "Edit" }));
    await user.click(within(card).getByRole("button", { name: "Save" }));
    expect(calls.filter((c) => c.key === "PATCH /api/admin/submissions/9").map((c) => c.body)).toEqual([
      { status: "new" },
      { rating: "A", description: "Ten lasers in a ring.", note: "" },
    ]);
  });

  it("goes back to the sign-in form when the session ends in the middle of a change", async () => {
    server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox(),
      "PATCH /api/admin/submissions/4": [401, { detail: { code: "signed_out", message: "Sign in first." } }],
    });
    const user = await openAdmin();
    await user.click(await screen.findByRole("button", { name: "Publish" }));
    expect(await screen.findByRole("form", { name: "Sign in" })).toBeInTheDocument();
  });

  it("stays signed in, and says so, when the sign-out never reached the server", async () => {
    // CodeRabbit, PR #12: showing the sign-in form here hid a session that was still valid.
    server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox([]),
      "POST /api/admin/logout": [500, null],
    });
    const user = await openAdmin();
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't confirm the sign-out. Your session may still be active.");
    expect(screen.queryByRole("form", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("says the same when the sign-out request never left", async () => {
    const routed = server({ "GET /api/admin/session": [200, SIGNED_IN], "GET /api/admin/submissions?status=new": inbox([]) });
    const base = vi.mocked(fetch);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) =>
        url.endsWith("/logout") ? Promise.reject(new TypeError("offline")) : base(url, init),
      ),
    );
    const user = await openAdmin();
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't confirm the sign-out.");
    expect(screen.queryByRole("form", { name: "Sign in" })).not.toBeInTheDocument();
    expect(routed.length).toBeGreaterThan(0);
  });

  it("refreshes the tab on screen when a change finishes, not the tab it started on", async () => {
    // CodeRabbit, PR #12 (follow-up): the refresh after a change used the tab captured when it began.
    let finish: (() => void) | undefined;
    const live = { ...SUB, id: 8, status: "approved" as const, description: "A live one." };
    const rejected = { ...SUB, id: 9, status: "rejected" as const, description: "A rejected one." };
    const counts = { new: 0, approved: 1, rejected: 1, added: 0 };
    const calls = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox([], counts),
      "GET /api/admin/submissions?status=approved": inbox([live], counts),
      "GET /api/admin/submissions?status=rejected": inbox([rejected], counts),
    });
    const base = vi.mocked(fetch);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          await new Promise<void>((resolve) => (finish = resolve));
          return new Response(JSON.stringify(live));
        }
        return base(url, init);
      }),
    );
    const user = await openAdmin();
    await user.click(await screen.findByRole("button", { name: /^Live/ }));
    await user.click(await screen.findByRole("button", { name: "Unpublish" }));
    await user.click(screen.getByRole("button", { name: /^Rejected/ }));
    expect(await screen.findByText("A rejected one.")).toBeInTheDocument();
    const before = calls.length;
    finish?.();
    // Wait for the refresh the finished change makes, then check which tab it asked for and what is shown.
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(before));
    expect(calls.at(-1)?.key).toBe("GET /api/admin/submissions?status=rejected");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("A rejected one.")).toBeInTheDocument();
    expect(screen.queryByText("A live one.")).not.toBeInTheDocument();
  });

  it("holds Edit and Delete too while a change is on its way", async () => {
    let finish: (() => void) | undefined;
    server({ "GET /api/admin/session": [200, SIGNED_IN], "GET /api/admin/submissions?status=new": inbox() });
    const base = vi.mocked(fetch);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          await new Promise<void>((resolve) => (finish = resolve));
          return new Response(JSON.stringify(SUB));
        }
        return base(url, init);
      }),
    );
    const user = await openAdmin();
    await user.click(await screen.findByRole("button", { name: "Publish" }));
    for (const name of ["Edit", "Delete"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-disabled", "true");
    }
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.queryByRole("textbox", { name: "Description" })).not.toBeInTheDocument();
    finish?.();
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-disabled", "false"));
  });

  it("drops the draft on Cancel", async () => {
    // CodeRabbit, PR #12: a cancelled edit came back on the next Edit and was sent by Save.
    const calls = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox(),
      "PATCH /api/admin/submissions/4": [200, SUB],
    });
    const user = await openAdmin();
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.type(screen.getByRole("textbox", { name: "Description" }), " cancelled words");
    await user.click(screen.getByRole("radio", { name: "D" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Ten lasers in a ring.");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(calls.find((c) => c.key.startsWith("PATCH"))?.body).toEqual({ rating: "A", description: "Ten lasers in a ring.", note: "" });
  });

  it("runs one change at a time", async () => {
    // CodeRabbit, PR #12: Publish then Reject could both be in flight, and the slower one won.
    let finish: (() => void) | undefined;
    const patches: unknown[] = [];
    const base = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox(),
    });
    const routed = vi.mocked(fetch);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          patches.push(JSON.parse(String(init.body)));
          await new Promise<void>((resolve) => (finish = resolve));
          return new Response(JSON.stringify(SUB));
        }
        return routed(url, init);
      }),
    );
    const user = await openAdmin();
    await user.click(await screen.findByRole("button", { name: "Publish" }));
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(patches).toEqual([{ status: "approved" }]);
    finish?.();
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Reject" })).not.toHaveAttribute("aria-disabled", "true"));
    expect(base.filter((c) => c.key.startsWith("GET /api/admin/submissions")).length).toBeGreaterThan(1);
  });

  it("ignores an answer for a tab that is no longer chosen", async () => {
    // CodeRabbit, PR #12: a slow Live list arriving after Rejected was chosen replaced it.
    let releaseLive: (() => void) | undefined;
    const live = { ...SUB, id: 8, status: "approved" as const, description: "A live one." };
    const rejected = { ...SUB, id: 9, status: "rejected" as const, description: "A rejected one." };
    const routed = server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox([]),
      "GET /api/admin/submissions?status=rejected": inbox([rejected]),
    });
    const base = vi.mocked(fetch);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("status=approved")) {
          await new Promise<void>((resolve) => (releaseLive = resolve));
          return new Response(JSON.stringify({ submissions: [live], counts: COUNTS }));
        }
        return base(url, init);
      }),
    );
    const user = await openAdmin();
    await screen.findByText(/Nothing here yet/);
    await user.click(screen.getByRole("button", { name: /Live/ }));
    await user.click(screen.getByRole("button", { name: /Rejected/ }));
    expect(await screen.findByText("A rejected one.")).toBeInTheDocument();
    releaseLive?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("A rejected one.")).toBeInTheDocument();
    expect(screen.queryByText("A live one.")).not.toBeInTheDocument();
    expect(routed.length).toBeGreaterThan(0);
  });

  it("says so when the inbox or the export can't be loaded", async () => {
    server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": [500, null],
      "GET /api/admin/submissions?status=all": inbox([], { new: 0, approved: 2, rejected: 0, added: 0 }),
      "GET /api/admin/export": [500, { detail: { code: "x", message: "Export broke." } }],
    });
    const user = await openAdmin();
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't work. Try again in a moment.");
    await user.click(screen.getByRole("button", { name: "All" }));
    await user.click(await screen.findByRole("button", { name: "Download export" }));
    expect(await screen.findByText("Export broke.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy JSON" }));
    expect(screen.getAllByText("Export broke.").length).toBeGreaterThan(0);
  });

  it("shows an error it didn't expect without losing the inbox", async () => {
    server({
      "GET /api/admin/session": [200, SIGNED_IN],
      "GET /api/admin/submissions?status=new": inbox(),
      "PATCH /api/admin/submissions/4": [500, null],
    });
    const user = await openAdmin();
    await screen.findByText("Ten lasers in a ring.");
    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't work. Try again in a moment.");
    expect(screen.getByText("Ten lasers in a ring.")).toBeInTheDocument();
  });
});
