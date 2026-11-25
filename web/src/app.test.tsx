import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("keeps the build when the Builder link or the logo is clicked on the builder itself", async () => {
    // Review finding: a link to "/" while the builder was already open read as "the build is now empty".
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("link", { name: "Builder" }));
    expect(within(shelf()).getByRole("link", { name: "Tammy's Head" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "1 synergy" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "isaac.toys, home" }));
    expect(within(shelf()).getByRole("link", { name: "Brimstone" })).toBeInTheDocument();

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

  it("sends only ids and shows the answer with what is left today", async () => {
    const fetchMock = answer({
      text: "How it plays:\n- Ten lasers at once.\n\nVerdict:\nS: it clears rooms.",
      cached: false,
      remaining: 4,
      limit: 5,
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = open("/?c=azazel&i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));

    expect(await screen.findByText("Ten lasers at once.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "How it plays" })).toBeInTheDocument();
    expect(screen.getByText(/4 of 5 analyses left today/)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/analyze");
    expect(JSON.parse(init.body)).toEqual({ character: "azazel", items: [118, 38], trinkets: [] });
  });

  it("says when a saved answer was reused", async () => {
    vi.stubGlobal("fetch", answer({ text: "Fine.", cached: true, remaining: 5, limit: 5 }));
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));
    expect(await screen.findByText(/analysed before/)).toBeInTheDocument();
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
    vi.stubGlobal("fetch", answer({ text: "Old answer.", cached: false, remaining: 4, limit: 5 }));
    const user = open("/?i=118.38");
    await user.click(screen.getByRole("button", { name: "Analyse this build" }));
    expect(await screen.findByText("Old answer.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Tammy's Head" }));
    expect(screen.queryByText("Old answer.")).not.toBeInTheDocument();
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
    expect(screen.getByRole("status")).toHaveTextContent("453 synergies");
    expect(screen.getAllByRole("article")).toHaveLength(40);
    await user.click(screen.getByRole("button", { name: "Show 40 more" }));
    expect(screen.getAllByRole("article")).toHaveLength(80);

    await user.type(screen.getByRole("searchbox", { name: "Search synergies" }), "tammy brimstone");
    expect(screen.getByRole("status")).toHaveTextContent(/of 453 synergies/);
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
