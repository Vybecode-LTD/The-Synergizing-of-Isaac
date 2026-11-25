import { createGameData } from "../engine/data";
import type { Character, Item, SynergyRecord, Trinket } from "../engine/types";

/** A tiny world with one of every shape the engine has to handle. */
const item = (id: number, name: string, extra: Partial<Item> = {}): Item => ({
  id,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  dlc: "Rebirth",
  effect: "",
  quality: 2,
  type: "passive",
  ...extra,
});

export const ITEMS: Item[] = [
  item(1, "Brim", { quality: 4, stats: { tearsMult: 0.33 }, transformations: ["leviathan"] }),
  item(2, "Tammy", { type: "active" }),
  item(3, "Knife", { quality: 4, transformations: ["yes-mother"] }),
  item(4, "Tech", { quality: 3 }),
  item(5, "Right", { quality: 3 }),
  item(6, "Onion", { stats: { tears: 0.7 } }),
  item(7, "Box", { type: "active" }),
  item(8, "Pact", { stats: { damage: 0.5, tears: 0.2 }, transformations: ["leviathan"] }),
  item(9, "Mark", { stats: { damage: 1, damageMult: 1.5 }, transformations: ["leviathan"] }),
];

export const TRINKETS: Trinket[] = [
  { id: 1, slug: "horn", name: "Horn", dlc: "Rebirth", effect: "", stats: { damage: 2 } },
  { id: 2, slug: "crab", name: "Crab", dlc: "Rebirth", effect: "" },
];

export const CHARACTERS: Character[] = [
  { slug: "zed", name: "Zed", tainted: false, gameId: 0 },
  { slug: "lil", name: "Lil", tainted: false, gameId: 1, startingItems: [7] },
  { slug: "tainted-zed", name: "Tainted Zed", tainted: true, gameId: 2, pocketActive: 2 },
];

export const RECORDS: SynergyRecord[] = [
  { id: "brim+tammy", items: ["Brim", "Tammy"], trinkets: [], characters: [], rating: "S", description: "Ten lasers." },
  { id: "brim+tech", items: ["Brim", "Tech"], trinkets: [], characters: [], rating: "A", description: "Tech laser." },
  { id: "knife+tech", items: ["Knife", "Tech"], trinkets: [], characters: [], rating: "B", description: "Zap knife." },
  {
    id: "brim+knife+tech",
    items: ["Brim", "Knife", "Tech"],
    trinkets: [],
    characters: [],
    rating: "A",
    description: "Everything.",
  },
  { id: "right+c-zed", items: ["Right"], trinkets: [], characters: ["Zed"], rating: "A", description: "Zed's right." },
  { id: "right+c-lil", items: ["Right"], trinkets: [], characters: ["Lil"], rating: "B", description: "Lil's right." },
  { id: "brim+t-horn", items: ["Brim"], trinkets: ["Horn"], characters: [], rating: "B", description: "Horned." },
  { id: "t-horn", items: [], trinkets: ["Horn"], characters: [], rating: "C", description: "Flat damage." },
  { id: "box+tech", items: ["Box", "Tech"], trinkets: [], characters: [], rating: "D", description: "Boxed." },
];

export const world = createGameData(ITEMS, TRINKETS, CHARACTERS, RECORDS);
