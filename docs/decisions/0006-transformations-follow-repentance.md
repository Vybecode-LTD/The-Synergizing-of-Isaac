# 0006 — Transformations are counted as Repentance counts them

**Date:** 2026-11-25 · **Decided by:** the owner (AskUserQuestion: "Repentance, flag the + difference");
the data design is Claude's

**Decision.** Which pickups count toward which transformation comes from each transformation's page on the
[wiki](https://bindingofisaacrebirth.wiki.gg/), read for Repentance, and is kept in `data/transformations.json`
(hand-edited, with the page and revision for each). What counts only in Repentance+ is kept apart and
marked "(Repentance+ only)" on item and trinket pages and in the builder. Trinkets count where the game
counts them. `scripts/gamedata.py build` writes the tags onto `items.json` and `trinkets.json`; the item
tracker's transformation flags are no longer read.

**Why.** The rest of the site follows Repentance, and the tracker's flags follow Repentance+ in places, so a
Repentance player could be told "Beelzebub 3 of 3" when their game would not transform. The owner wanted
both kinds of player served.

**Options that lost.**
- Keep the tracker's tags and say on the About page that they follow Repentance+: no work, but wrong for
  Repentance players, and at odds with the synergy text.
- Count as Repentance does with no mark: right for Repentance, but silent about what Repentance+ adds.

**What it changed on 2026-11-25** (wiki revisions in the file): Infestation (Beelzebub), Seraphim
(Seraphim), Lil Delirium (Conjoined), IBS (Oh Crap) and Bob's Bladder (Bob) count only in Repentance+;
Skatole counts toward Oh Crap; Kid's Drawing counts toward Guppy in the builder; Stompy (Leo, Magic
Mushroom, and pills) and Necromancer (Repentance+ only) were added. Guardian Angel and Sworn Protector
stopped counting toward Seraphim in Repentance, as the tracker already had it.

**Not covered.** Pills (Adult; Stompy's pill), which the builder does not hold. Duplicates, which Repentance
counts but the builder cannot hold. Some item names follow the tracker's older spellings ("1UP",
"Number two"); renaming them is a separate change.
