import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import synergiesJson from "@data/synergies.json";
import { App } from "./App";

function open(path: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return user;
}

const shelf = () => screen.getByRole("list", { name: "Your build" });
const picker = () => screen.getByRole("combobox", { name: "Add an item or trinket" });
const optionNames = () => screen.getAllByRole("option").map((o) => o.querySelector(".picker__name")?.textContent);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("builder", () => {
  it("starts empty with examples and says what the site does", () => {
    open("/");
    expect(screen.getByRole("heading", { level: 1, name: "Binding of Isaac synergy builder" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start with what’s in your run" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What does isaac.toys do?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Brimstone \+ Tammy's Head/ })).toHaveAttribute("href", "/?i=118.38");
    expect(document.title).toBe("Binding of Isaac Synergy Builder for Repentance | isaac.toys");
  });

  it("opens a build from a link and shows its synergy", () => {
    open("/?i=118.38");
    expect(screen.getByRole("heading", { level: 2, name: "1 synergy" })).toBeInTheDocument();
    expect(screen.getByText(/fires 10 Brimstone lasers in all directions/)).toBeInTheDocument();
    expect(within(shelf()).getByRole("link", { name: "Brimstone" })).toHaveAttribute("href", "/items/brimstone");
  });

  it("adds pickups from the search box with the keyboard alone", async () => {
    const user = open("/");
    await user.type(picker(), "brimst");
    expect(optionNames()[0]).toBe("Brimstone");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(within(shelf()).getByRole("link", { name: "Brimstone" })).toBeInTheDocument();
    expect(picker()).toHaveValue("");
    expect(screen.getByRole("heading", { level: 2, name: "No known synergy yet" })).toBeInTheDocument();

    await user.type(picker(), "tammy");
    await user.keyboard("{ArrowDown}{ArrowUp}{Enter}");
    expect(screen.getByRole("heading", { level: 2, name: "1 synergy" })).toBeInTheDocument();
  });

  it("leaves out what is already in the build and says when nothing matches", async () => {
    const user = open("/?i=118");
    await user.type(picker(), "brimstone");
    expect(optionNames().length).toBeGreaterThan(0);
    expect(optionNames()).not.toContain("Brimstone");
    await user.clear(picker());
    await user.type(picker(), "zzzzzz");
    expect(screen.getByText(/Nothing called/)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(picker()).toHaveValue("");
  });

  it("adds a trinket and shows its stat change", async () => {
    const user = open("/?i=118");
    await user.type(picker(), "cancer");
    // "Cancer" is both an item and a trinket; pick the trinket.
    await user.click(screen.getAllByRole("option").find((o) => within(o).queryByText("Trinket"))!);
    expect(within(shelf()).getByRole("link", { name: /Cancer/ })).toHaveAttribute("href", "/trinkets/cancer");
    const summary = screen.getByRole("region", { name: "Build summary" });
    expect(within(summary).getByText("Leviathan")).toBeInTheDocument();
    expect(within(summary).getByText("1 of 3")).toBeInTheDocument();
  });

  it("offers pickups that complete a synergy and adds one", async () => {
    const user = open("/?i=118");
    const section = screen.getByRole("region", { name: "One pickup away" });
    const first = within(section).getAllByRole("listitem")[0]!;
    const add = within(first).getByRole("button", { name: /^Add .+ to the build$/ });
    const name = add.getAttribute("aria-label")!.replace(/^Add (.+) to the build$/, "$1");
    await user.click(add);
    expect(within(shelf()).getByRole("link", { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /synerg/ })).not.toHaveTextContent("No known");

    await user.click(within(screen.getByRole("region", { name: "One pickup away" })).getByRole("button", { name: /Show all/ }));
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute("aria-expanded", "true");
  });

  it("removes a pickup and clears the build", async () => {
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Remove Tammy's Head" }));
    expect(screen.getByRole("heading", { level: 2, name: "No known synergy yet" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("heading", { name: "Start with what’s in your run" })).toBeInTheDocument();
  });

  it("asks for a character when synergies depend on one, and counts what the character starts with", async () => {
    const user = open("/?i=619");
    expect(screen.getByText(/more synergies depend on who you’re playing/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose character" }));
    const dialog = screen.getByRole("dialog", { name: "Who are you playing?" });
    await user.click(within(dialog).getByRole("button", { name: "Bethany" }));
    expect(screen.getByRole("heading", { level: 2, name: "2 synergies" })).toBeInTheDocument();
    expect(within(shelf()).getByText("Starts with")).toBeInTheDocument();

    await user.click(within(shelf()).getByRole("button", { name: /Bethany/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "No character" }));
    expect(within(shelf()).getByRole("button", { name: /Choose character/ })).toBeInTheDocument();
  });

  it("copies a link to the build", async () => {
    const user = open("/?c=azazel&i=118&t=39");
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(screen.getByRole("button", { name: "Copy link to this build" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/?c=azazel&i=118&t=39`);
    expect(await screen.findByRole("button", { name: "Link copied" })).toBeInTheDocument();
  });

  it("remembers the build when you come back to the builder", async () => {
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("link", { name: "Items" }));
    expect(screen.getByRole("heading", { level: 1, name: "All Repentance items" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Builder" }));
    expect(within(shelf()).getByRole("link", { name: "Tammy's Head" })).toBeInTheDocument();
  });

  it("keeps the build when the Builder link is clicked on the builder itself", async () => {
    // Review finding: a link to "/" while the builder was already open read as "the build is now empty".
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("link", { name: "Builder" }));
    expect(within(shelf()).getByRole("link", { name: "Tammy's Head" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "1 synergy" })).toBeInTheDocument();

    // An edit made after coming back is the one that is kept.
    await user.click(screen.getByRole("button", { name: "Remove Tammy's Head" }));
    await user.click(screen.getByRole("link", { name: "Builder" }));
    expect(within(shelf()).getByRole("link", { name: "Brimstone" })).toBeInTheDocument();
    expect(within(shelf()).queryByRole("link", { name: "Tammy's Head" })).not.toBeInTheDocument();

    // Control: clearing is still clearing, and the same click does not bring the old build back.
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("heading", { name: "Start with what’s in your run" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Builder" }));
    expect(screen.getByRole("heading", { name: "Start with what’s in your run" })).toBeInTheDocument();
    expect(within(shelf()).queryByRole("link", { name: "Brimstone" })).not.toBeInTheDocument();
  });

  it("goes home to an empty builder from the logo, on the builder and from any other page", async () => {
    // The owner, 2026-11-26: the logo goes to the home page, and it had kept the build on screen.
    const start = () => screen.queryByRole("heading", { name: "Start with what’s in your run" });
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("link", { name: "isaac.toys, home" }));
    expect(start()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "1 synergy" })).not.toBeInTheDocument();
    // It stays empty: the Builder link does not bring the old build back.
    await user.click(screen.getByRole("link", { name: "Builder" }));
    expect(start()).toBeInTheDocument();

    // From another page too. Control first: the example opens a build, so the empty start is not a default.
    await user.click(screen.getByRole("link", { name: /Brimstone \+ Tammy's Head/ }));
    expect(screen.getByRole("heading", { level: 2, name: "1 synergy" })).toBeInTheDocument();
    expect(start()).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Items" }));
    await user.click(screen.getByRole("link", { name: "isaac.toys, home" }));
    expect(start()).toBeInTheDocument();
  });

  it("switches between light and dark from the header, and says which way it goes", async () => {
    const user = open("/items");
    const header = within(document.querySelector<HTMLElement>(".site-header")!);
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    await user.click(header.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    await user.click(header.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(header.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("credits CarbonDSP in the footer beside its brandmark, and keeps the unofficial notice", () => {
    open("/items");
    const footer = within(screen.getByRole("contentinfo"));
    // The brandmark is decorative: the credit beside it names CarbonDSP, so a screen reader hears it once.
    const mark = screen.getByRole("contentinfo").querySelector("img.site-footer__mark");
    expect(mark).toHaveAttribute("alt", "");
    // Under test Vite keeps the import's `?no-inline`; the build gives a hashed file name instead.
    expect(mark?.getAttribute("src")).toMatch(/carbondsp-reverse-128\.png(\?\S*)?$/);
    expect(mark?.getAttribute("srcset")).toMatch(/carbondsp-reverse-256\.png(\?\S*)? 2x$/);
    expect(footer.queryByRole("img")).toBeNull();
    const credit = footer.getByRole("link", { name: "CarbonDSP" });
    expect(credit).toHaveAttribute("href", "https://carbondsp.com/");
    expect(credit.closest("p")).toHaveTextContent(/^Built by CarbonDSP for the TBOI community\.$/);
    expect(footer.getByText(/isaac\.toys is an unofficial fan project, not affiliated with or endorsed by/)).toBeInTheDocument();
    expect(footer.getByRole("link", { name: "About, sources and credits" })).toHaveAttribute("href", "/about");
  });

  it("empties the build when its last pickup is removed, and keeps it empty", async () => {
    const user = open("/?i=118");
    await user.click(screen.getByRole("button", { name: "Remove Brimstone" }));
    expect(screen.getByRole("heading", { name: "Start with what’s in your run" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Items" }));
    await user.click(screen.getByRole("link", { name: "Builder" }));
    expect(screen.getByRole("heading", { name: "Start with what’s in your run" })).toBeInTheDocument();
  });
});

describe("AI analysis", () => {
  const answer = (body: unknown, status = 200) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  const READ = {
    howItPlays: ["Ten lasers at once with Brimstone."],
    bestInteractions: ["Tammy's Head fires every laser you have."],
    watchOutFor: [],
    verdict: { tier: "S", why: "It clears rooms." },
  };
  const reply = (extra: Record<string, unknown> = {}) => ({ read: READ, found: [], cached: false, remaining: 4, limit: 5, ...extra });
  const line = (text: string) => (_: string, el: Element | null) => el?.tagName === "LI" && el.textContent === text;

  it("sends only ids and lays the read out in sections", async () => {
    const fetchMock = answer(reply());
    vi.stubGlobal("fetch", fetchMock);
    const user = open("/?c=azazel&i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));

    const plays = await screen.findByText(line("Ten lasers at once with Brimstone."));
    // The pickup it names is shown with its sprite.
    expect(within(plays).getByText("Brimstone").closest(".ai-mention")?.querySelector(".sprite")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Verdict: S tier, run-defining" })).toBeInTheDocument();
    expect(screen.getByText("It clears rooms.")).toBeInTheDocument();
    const sections = ["How it plays", "Best interactions"].map((name) => screen.getByRole("region", { name }));
    expect(sections.map((s) => s.dataset.tone)).toEqual(["light", "deep"]);
    // A section with nothing in it is left out.
    expect(screen.queryByRole("heading", { name: "Watch out for" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /New synergy found/ })).not.toBeInTheDocument();
    expect(screen.getByText(/4 of 5 analyses left today/)).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/analyze");
    expect(JSON.parse(init.body)).toEqual({ character: "azazel", items: [118, 38], trinkets: [] });
  });

  it("says when a saved answer was reused", async () => {
    vi.stubGlobal("fetch", answer(reply({ cached: true, remaining: 5 })));
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));
    expect(await screen.findByText(/analysed before/)).toBeInTheDocument();
  });

  it("treats an answer in a shape it can't show as no answer", async () => {
    vi.stubGlobal("fetch", answer({ text: "How it plays:\n- The old plain text.", cached: false, remaining: 4, limit: 5 }));
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));
    expect(await screen.findByText(/didn't answer/)).toBeInTheDocument();
    expect(screen.queryByText(/The old plain text/)).not.toBeInTheDocument();
  });

  it("shows the server's reason when the daily limit is reached, with no retry", async () => {
    vi.stubGlobal("fetch", answer({ detail: { code: "rate_limited", message: "Come back tomorrow." } }, 429));
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));
    expect(await screen.findByText("Come back tomorrow.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("offers a retry when the request itself fails, and explains an unconfigured site", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));
    expect(await screen.findByText(/didn't answer/)).toBeInTheDocument();

    vi.stubGlobal("fetch", answer({ detail: {} }, 503));
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/isn't switched on/)).toBeInTheDocument();
  });

  it("drops the answer when the build changes", async () => {
    vi.stubGlobal("fetch", answer(reply()));
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));
    expect(await screen.findByText("It clears rooms.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Tammy's Head" }));
    expect(screen.queryByText("It clears rooms.")).not.toBeInTheDocument();
  });

  describe("synergies found", () => {
    const FIND = {
      key: "i:1.2|t:|c:",
      itemIds: [1, 2],
      trinketIds: [],
      characterSlugs: [],
      rating: "B",
      description: "Three fast tears a shot.",
    };

    it("shows a find as a New synergy found card at the bottom, saves it, and sends it for review", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(reply({ found: [FIND] }))))
        .mockResolvedValueOnce(new Response(JSON.stringify({ received: true, ids: [7] })));
      vi.stubGlobal("fetch", fetchMock);
      const user = open("/?i=1.2");
      await user.click(screen.getByRole("button", { name: "Analyse this build" }));

      const card = await screen.findByRole("region", { name: /New synergy found/ });
      expect(within(card).getByRole("heading", { level: 3, name: "New synergy found" })).toBeInTheDocument();
      expect(within(card).getByText("Three fast tears a shot.")).toBeInTheDocument();
      expect(within(card).getByText("The Sad Onion")).toBeInTheDocument();
      // At the very bottom: after every section of the read.
      const sections = screen.getAllByRole("region").filter((r) => r.classList.contains("ai-read__section"));
      for (const section of sections) {
        expect(section.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }

      await user.click(within(card).getByRole("button", { name: "Save to my synergies" }));
      expect(within(card).getByText("Saved to your synergies")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "1 synergy" })).toBeInTheDocument();
      const [saved] = JSON.parse(localStorage.getItem("isaac-toys:my-synergies:v1")!);
      expect(saved).toMatchObject({ itemIds: [1, 2], rating: "B", description: "Three fast tears a shot.", custom: true });

      await user.click(within(card).getByRole("button", { name: "Send for review" }));
      expect(await within(card).findByText(/Sent for review/)).toBeInTheDocument();
      expect(within(card).queryByRole("button", { name: "Send for review" })).not.toBeInTheDocument();
      const [url, init] = fetchMock.mock.calls[1]!;
      expect(url).toBe("/api/submissions/from-analysis");
      // The find's key, never the words: the server stores its own copy.
      expect(JSON.parse(init.body)).toEqual({ character: null, items: [1, 2], trinkets: [], picks: ["i:1.2|t:|c:"] });
    });

    it("gives each find its own send button, and says why one failed on that card", async () => {
      const second = { ...FIND, key: "i:1|t:|c:azazel", itemIds: [1], characterSlugs: ["azazel"], description: "Only as Azazel." };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(reply({ found: [FIND, second] }))))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: { code: "submissions_limited", message: "More tomorrow." } }), { status: 429 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = open("/?c=azazel&i=1.2");
      await user.click(screen.getByRole("button", { name: "Analyse this build" }));
      const cards = await screen.findAllByRole("region", { name: /New synergy found/ });
      expect(cards).toHaveLength(2);
      expect(within(cards[1]!).getByText("Azazel")).toBeInTheDocument();

      await user.click(within(cards[1]!).getByRole("button", { name: "Send for review" }));
      expect(await within(cards[1]!).findByText("More tomorrow.")).toBeInTheDocument();
      expect(JSON.parse(fetchMock.mock.calls[1]![1].body).picks).toEqual(["i:1|t:|c:azazel"]);
      // The failure stays on its card; the other is untouched and can still be sent.
      expect(within(cards[1]!).getByRole("button", { name: "Send for review" })).toBeInTheDocument();
      expect(within(cards[0]!).queryByText("More tomorrow.")).not.toBeInTheDocument();
      expect(within(cards[0]!).getByRole("button", { name: "Send for review" })).toBeInTheDocument();
    });
  });
});

describe("your own synergies", () => {
  it("saves one for the build on screen, shows it, and deletes it", async () => {
    const user = open("/?c=azazel&i=118.38");
    await user.click(screen.getByRole("button", { name: "Add your own synergy" }));
    const dialog = screen.getByRole("dialog", { name: "Add your own synergy" });

    await user.click(within(dialog).getByRole("button", { name: "Save synergy" }));
    expect(within(dialog).getByText(/Say what the combination does/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("checkbox", { name: "Only when playing Azazel" }));
    await user.click(within(dialog).getByRole("radio", { name: "B" }));
    await user.type(within(dialog).getByRole("textbox", { name: "What happens?" }), "My own note about this pair.");
    await user.click(within(dialog).getByRole("button", { name: "Save synergy" }));

    expect(screen.getByText("My own note about this pair.")).toBeInTheDocument();
    expect(screen.getByText("Yours")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("isaac-toys:my-synergies:v1")!)).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("My own note about this pair.")).not.toBeInTheDocument();
  });

  it("can be cancelled without saving", async () => {
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Add your own synergy" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(localStorage.getItem("isaac-toys:my-synergies:v1")).toBeNull();
  });
});

describe("sending your synergy to the site", () => {
  const ok = () => new Response(JSON.stringify({ received: true, id: 3, duplicate: false }));

  it("saves it here and sends it, with an optional link", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", fetchMock);
    const user = open("/?i=1.2");
    await user.click(screen.getByRole("button", { name: "Add your own synergy" }));
    const dialog = screen.getByRole("dialog", { name: "Add your own synergy" });
    await user.type(within(dialog).getByRole("textbox", { name: "What happens?" }), "Three fast tears.");
    await user.click(within(dialog).getByRole("checkbox", { name: "Send it to isaac.toys for the shared list" }));
    await user.type(within(dialog).getByRole("textbox", { name: /Where did you see it/ }), "https://example.com/wiki");
    await user.click(within(dialog).getByRole("button", { name: "Save and send" }));

    expect(await within(dialog).findByText(/Saved to your synergies, and sent to isaac.toys/)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/submissions");
    expect(JSON.parse(init.body)).toEqual({
      character: null,
      items: [1, 2],
      trinkets: [],
      rating: "A",
      description: "Three fast tears.",
      sourceUrl: "https://example.com/wiki",
      website: "",
    });
    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.getByText("Sent for review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send to isaac.toys" })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("isaac-toys:my-synergies:v1")!)[0].submitted).toBe(true);
  });

  it("needs two things to send, and says so", async () => {
    const user = open("/?i=1");
    await user.click(screen.getByRole("button", { name: "Add your own synergy" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("checkbox", { name: "Send it to isaac.toys for the shared list" })).toBeDisabled();
    expect(within(dialog).getByText(/needs two things/)).toBeInTheDocument();
  });

  it("keeps the words when sending fails, and can save them without sending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: { code: "invalid", message: "Bad link." } }), { status: 422 })),
    );
    const user = open("/?i=1.2");
    await user.click(screen.getByRole("button", { name: "Add your own synergy" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: "What happens?" }), "Words to keep.");
    await user.click(within(dialog).getByRole("checkbox", { name: "Send it to isaac.toys for the shared list" }));
    await user.click(within(dialog).getByRole("button", { name: "Save and send" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Bad link.");
    expect(localStorage.getItem("isaac-toys:my-synergies:v1")).toBeNull();

    // Emptied after the failure, the fallback refuses too (CodeRabbit, PR #12).
    const words = within(dialog).getByRole("textbox", { name: "What happens?" });
    await user.clear(words);
    await user.click(within(dialog).getByRole("button", { name: "Save without sending" }));
    expect(within(dialog).getByText(/Say what the combination does/)).toBeInTheDocument();
    expect(localStorage.getItem("isaac-toys:my-synergies:v1")).toBeNull();
    await user.type(words, "Words to keep.");

    await user.click(within(dialog).getByRole("button", { name: "Save without sending" }));
    expect(screen.getByText("Words to keep.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send to isaac.toys" })).toBeInTheDocument();
  });

  it("sends one saved earlier from its card", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", fetchMock);
    const user = open("/?c=azazel&i=118");
    await user.click(screen.getByRole("button", { name: "Add your own synergy" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("checkbox", { name: "Only when playing Azazel" }));
    await user.type(within(dialog).getByRole("textbox", { name: "What happens?" }), "A pickup and a character.");
    await user.click(within(dialog).getByRole("button", { name: "Save synergy" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Send to isaac.toys" }));
    expect(await screen.findByText("Sent for review")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ character: "azazel", items: [118] });
  });

  it("says why a card couldn't be sent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const user = open("/?i=1.2");
    await user.click(screen.getByRole("button", { name: "Add your own synergy" }));
    await user.type(within(screen.getByRole("dialog")).getByRole("textbox", { name: "What happens?" }), "Offline one.");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save synergy" }));
    await user.click(screen.getByRole("button", { name: "Send to isaac.toys" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("It couldn't be sent. Try again in a moment.");
  });
});

describe("browse and detail pages", () => {
  it("filters items by name, quality and type", async () => {
    const user = open("/items");
    expect(screen.getByRole("status")).toHaveTextContent("719 items");
    await user.type(screen.getByRole("searchbox", { name: "Filter items by name" }), "brim");
    expect(screen.getByRole("status")).toHaveTextContent(/^\d+ of 719 items$/);
    expect(screen.getByRole("link", { name: /^Brimstone\s*Quality 4 of 4$/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Active" }));
    expect(screen.queryByRole("link", { name: /^Brimstone\s*Quality 4 of 4$/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: "Quality 0" }));
    expect(screen.getByText(/No item matches those filters/)).toBeInTheDocument();
  });

  it("shows an item with its facts and adds it to the build", async () => {
    const user = open("/items/brimstone");
    expect(screen.getByRole("heading", { level: 1, name: "Brimstone" })).toBeInTheDocument();
    expect(screen.getByText("Tears become blood laser, hits 9 times")).toBeInTheDocument();
    expect(screen.getByText("Devil Room, Ultra Secret Room")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "63 synergies with Brimstone" })).toBeInTheDocument();
    expect(screen.getByText(/The strongest are with Azazel, Crown of Light and Epic Fetus/)).toBeInTheDocument();
    expect(document.title).toBe("Brimstone Synergies in The Binding of Isaac | isaac.toys");

    await user.click(screen.getByRole("button", { name: "Add to my build" }));
    expect(within(shelf()).getByRole("link", { name: "Brimstone" })).toBeInTheDocument();
  });

  it("is honest about an item with nothing written for it", () => {
    open("/items/the-sad-onion");
    expect(screen.getByRole("heading", { level: 2, name: "No synergies written down yet" })).toBeInTheDocument();
    expect(screen.getByText(/That is a gap in the list/)).toBeInTheDocument();
    expect(screen.getByText("A stat item that only changes your numbers.")).toBeInTheDocument();
  });

  it("shows a trinket and a character, and builds as that character", async () => {
    const user = open("/trinkets");
    await user.type(screen.getByRole("searchbox", { name: "Filter trinkets by name" }), "cancer");
    await user.click(screen.getByRole("link", { name: "Cancer" }));
    expect(screen.getByRole("heading", { level: 1, name: "Cancer" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add to my build" }));
    expect(within(shelf()).getByRole("link", { name: /Cancer/ })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Characters" }));
    await user.click(screen.getByRole("link", { name: "Lilith" }));
    expect(screen.getAllByRole("link", { name: "Box of Friends" })[0]).toHaveAttribute("href", "/items/box-of-friends");
    await user.click(screen.getByRole("button", { name: /Build as Lilith/ }));
    expect(within(shelf()).getByRole("button", { name: /Lilith/ })).toBeInTheDocument();
  });

  it("searches and filters the full synergy list and pages through it", async () => {
    const user = open("/synergies");
    expect(screen.getByRole("status")).toHaveTextContent(`${synergiesJson.length} synergies`);
    expect(screen.getAllByRole("article")).toHaveLength(40);
    await user.click(screen.getByRole("button", { name: "Show 40 more" }));
    expect(screen.getAllByRole("article")).toHaveLength(80);

    await user.type(screen.getByRole("searchbox", { name: "Search synergies" }), "tammy brimstone");
    expect(screen.getByRole("status")).toHaveTextContent(`of ${synergiesJson.length} synergies`);
    expect(screen.getByRole("link", { name: "Open in builder" })).toHaveAttribute("href", "/?i=118.38");
    await user.click(screen.getByRole("button", { name: "D tier" }));
    expect(screen.getByText(/Nothing in the list matches/)).toBeInTheDocument();
  });

  it("renders the About page from the shared text", () => {
    open("/about");
    expect(screen.getByRole("heading", { level: 1, name: "About isaac.toys" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "How do the synergy ratings work?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rebirth Item Tracker" })).toHaveAttribute(
      "href",
      "https://github.com/Rchardon/RebirthItemTracker",
    );
    expect(screen.getByText(/last updated on \d+ \w+ \d{4}/)).toBeInTheDocument();
  });

  it("treats an address in the wrong case as not found, as the server does", () => {
    // Review finding: the router matched /Items while the server (and the page title) said 404.
    open("/Items");
    expect(screen.getByRole("heading", { level: 1, name: "This room is empty" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Brimstone/ })).not.toBeInTheDocument();
  });

  it("shows a not-found page for an address that leads nowhere", () => {
    open("/items/not-a-real-item");
    expect(screen.getByRole("heading", { level: 1, name: "This room is empty" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse all items" })).toHaveAttribute("href", "/items");
  });
});
