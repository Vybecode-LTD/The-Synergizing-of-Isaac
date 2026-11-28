import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import synergiesJson from "@data/synergies.json";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMMUNITY_ELEMENT_ID, communitySynergies, gameData, readCommunity } from "./data";

const LIVE = {
  id: "community-7",
  itemIds: [1, 2],
  trinketIds: [],
  characterSlugs: [],
  rating: "A",
  description: "The Sad Onion's tears, three at a time.",
};

/** Put the server's data block in the page, as api/app/community.py does. */
function serverList(rows: unknown, raw?: string) {
  const el = document.createElement("script");
  el.type = "application/json";
  el.id = COMMUNITY_ELEMENT_ID;
  el.textContent = raw ?? JSON.stringify(rows);
  document.head.append(el);
}

afterEach(() => {
  document.getElementById(COMMUNITY_ELEMENT_ID)?.remove();
  vi.resetModules();
});

describe("community synergies from the page", () => {
  it("keeps what fits the roster and drops anything malformed", () => {
    const out = communitySynergies(
      [
        LIVE,
        { ...LIVE, id: "community-8", itemIds: [1, 999999], characterSlugs: ["azazel", "nobody"] },
        { ...LIVE, id: "community-9", itemIds: [999999] },
        { ...LIVE, rating: "Z" },
        { ...LIVE, description: 5 },
        null,
        "junk",
      ],
      gameData,
    );
    expect(out).toEqual([
      { ...LIVE, community: true },
      { ...LIVE, id: "community-8", itemIds: [1], characterSlugs: ["azazel"], community: true },
    ]);
    expect(communitySynergies({ not: "a list" }, gameData)).toEqual([]);
  });

  it("reads nothing when the page has no list, or a broken one", () => {
    expect(readCommunity()).toEqual([]);
    serverList(null, "{not json");
    expect(readCommunity()).toEqual([]);
    expect(readCommunity(undefined)).toEqual([]);
  });

  it("adds them to the builder, after the curated list, marked Community", async () => {
    serverList([LIVE]);
    const [{ App }, data] = await Promise.all([import("../App"), import("./data")]);
    expect(data.gameData.synergies.at(-1)).toMatchObject({ id: "community-7", community: true });
    expect(data.gameData.synergies).toHaveLength(synergiesJson.length + 1);

    render(
      <MemoryRouter initialEntries={["/?i=1.2"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "1 synergy" })).toBeInTheDocument();
    const card = screen.getByText("The Sad Onion's tears, three at a time.").closest("article")!;
    expect(within(card).getByText("Community")).toBeInTheDocument();

    // The browser counts it as the server does (api/tests/test_community.py): The Sad Onion has a synergy now.
    cleanup();
    render(
      <MemoryRouter initialEntries={["/items/the-sad-onion"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "1 synergy with The Sad Onion" })).toBeInTheDocument();
  });
});
