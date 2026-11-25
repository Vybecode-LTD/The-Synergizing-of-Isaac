# Synergy checks

What was checked in `synergies.json`, against what, and what changed. Add a section for each new check.

## 2026-11-24: every S and D entry

**Against:** the [Binding of Isaac wiki](https://bindingofisaacrebirth.wiki.gg/) for Repentance, read through
its API on 2026-11-24. For each entry, every member's page (Effects, Notes, Synergies, Interactions) was
searched for the other members. Where the wiki marks a line as true only before Repentance, the entry
follows the Repentance line. Where the wiki has no line about the pair, the entry was checked against each
item's own effects, and a claim neither page supports was taken out.

**Ratings** are still the list's opinion (see the About page). A rating was changed only where the reason
the entry gave for it is wrong in Repentance. Descriptions are written in this project's words, not copied.

**Result:** 77 entries: 27 confirmed, 28 corrected,
17 re-rated, 5 removed. The list went from 458 entries to 453.
A, B and C entries are not checked yet.

**Review:** CodeRabbit on PR #2 caught the Repentance Steam Sale formula (n copies divide prices by n + 1)
and a two-item entry that needs a transformation (`guppys-head+soy-milk`); both are fixed below. Its point
on Epic Fetus + Ipecac was checked and kept: the Epic Fetus page's Repentance line gives +2, while the
Ipecac page's line has no version mark.

| Entry | Members | Rating | Verdict | Why |
|---|---|---|---|---|
| `brimstone+tammys-head` | Brimstone, Tammy's Head | S | Confirmed | The pair is on the wiki |
| `brimstone+technology` | Brimstone, Technology | S | Corrected | The Tech laser does not fire while Brimstone charges; added the double-Brimstone override |
| `brimstone+tech-x` | Brimstone, Tech X | S | Corrected | "Full Brimstone damage" had no source; added that Brimstone's tears down does not apply |
| `brimstone+moms-knife` | Brimstone, Mom's Knife | S | Corrected | Added the knife counts and the Azazel exception; the knives are not smaller |
| `brimstone+epic-fetus` | Brimstone, Epic Fetus | S | Confirmed | The pair is on the wiki |
| `brimstone+c-azazel` | Brimstone, Azazel | S | Confirmed | The pair is on the wiki |
| `moms-knife+polyphemus` | Mom's Knife, Polyphemus | S | Corrected | Polyphemus is (damage + 4) x 2; "hits several times per throw" had no source |
| `epic-fetus+moms-knife` | Mom's Knife, Epic Fetus | S | Corrected | "Full-damage knives" had no source |
| `moms-knife+proptosis` | Mom's Knife, Proptosis | S | Confirmed | The pair is on the wiki |
| `epic-fetus+tech-x` | Tech X, Epic Fetus | S | Confirmed | The pair is on the wiki |
| `ipecac+pyromaniac` | Ipecac, Pyromaniac | S | Confirmed | The pair is on the wiki |
| `epic-fetus+ipecac` | Ipecac, Epic Fetus | S → B | Re-rated | Repentance gives a flat +2, per the Epic Fetus page (the Ipecac page's line has no version mark) |
| `ipecac+my-reflection` | Ipecac, My Reflection | D | Confirmed | The pair is on the wiki |
| `libra+soy-milk` | Soy Milk, Libra | S → C | Re-rated | Repentance gives a very small all-stats up, not a large one |
| `rock-bottom+soy-milk` | Soy Milk, Rock Bottom | S | Corrected | Added that the 0.2x damage still applies underneath |
| `epic-fetus+pyromaniac` | Epic Fetus, Pyromaniac | S | Confirmed | The pair is on the wiki |
| `polyphemus+rock-bottom` | Polyphemus, Rock Bottom | S | Confirmed | The pair is on the wiki |
| `godhead+sacred-heart` | Sacred Heart, Godhead | S → A | Re-rated | Godhead has no damage multiplier, so nothing stacks; both already home |
| `dr-fetus+pyromaniac` | Dr. Fetus, Pyromaniac | S | Confirmed | The pair is on the wiki |
| `kamikaze+pyromaniac` | Pyromaniac, Kamikaze | S | Corrected | Added half a red heart per use in Repentance |
| `brimstone+crown-of-light` | Crown of Light, Brimstone | S | Corrected | The crown needs full red heart containers, not just no damage this room |
| `crown-of-light+c-the-lost` | Crown of Light, The Lost | S | Corrected | A hit Holy Mantle absorbs does not switch the crown off |
| `brimstone+spirit-sword` | Spirit Sword, Brimstone | D | Corrected | "Brimstone's stats apply" had no source |
| `birthright+c-the-lost` | Birthright, The Lost | S | Confirmed | The pair is on the wiki |
| `guppys-head+guppys-paw+guppys-tail` | Guppy's Head, Guppy's Tail, Guppy's Paw | S | Corrected | Repentance: a 66% chance per tear hit, not every hit |
| `dead-cat+guppys-collar+guppys-head` | Guppy's Head, Guppy's Collar, Dead Cat | S | Corrected | 66% chance per hit; "a common path" had no source |
| `guppys-paw+c-blue-baby` | Guppy's Paw, Blue Baby | D | Corrected | Added that it still counts toward Guppy |
| `dead-cat+c-the-lost` | Dead Cat, The Lost | S | Confirmed | The pair is on the wiki |
| `ipecac+c-the-lost` | Ipecac, The Lost | D | Confirmed | From each item's own effects |
| `sacred-heart+c-the-lost` | Sacred Heart, The Lost | S | Confirmed | From each item's own effects |
| `polyphemus+soy-milk` | Soy Milk, Polyphemus | D → C | Re-rated | Damage per second ends up near Polyphemus alone, not lower |
| `moms-knife+tractor-beam` | Tractor Beam, Mom's Knife | D | Confirmed | The pair is on the wiki |
| `moms-knife+tiny-planet` | Tiny Planet, Mom's Knife | D → B | Re-rated | Repentance made this good; "nearly unusable" was older versions |
| `bobs-brain+c-the-lost` | Bob's Brain, The Lost | D | Confirmed | From each item's own effects |
| `kamikaze+c-the-lost` | Kamikaze, The Lost | D | Corrected | Holy Mantle absorbs the first blast, so it is not instant death |
| `curse-of-the-tower+c-the-lost` | Curse of the Tower, The Lost | - | Removed | Removed: a Holy Mantle break does not trigger on-damage items for The Lost |
| `brimstone+guppys-head` | Guppy's Head, Brimstone | - | Removed | Removed: needs the Guppy transformation, and the fly count had no source |
| `guppys-head+soy-milk` | Guppy's Head, Soy Milk | - | Removed | Removed: it needs the Guppy transformation, which these two items alone do not give |
| `almond-milk+libra` | Libra, Almond Milk | S → C | Re-rated | Repentance gives a very small all-stats up |
| `box-of-friends+car-battery` | Car Battery, Box of Friends | S | Corrected | Two copies each, so three of each familiar, not four |
| `car-battery+void` | Car Battery, Void | S | Confirmed | The pair is on the wiki |
| `restock+steam-sale` | Restock, Steam Sale | S → B | Re-rated | Repentance raises restock prices, and n Steam Sales divide prices by n + 1: no free shop |
| `chaos+restock+steam-sale` | Restock, Steam Sale, Chaos | S → A | Re-rated | Same Repentance price changes: no endless free shop |
| `habit+scapular` | Habit, Scapular | S | Corrected | Scapular works once per room, so not infinite |
| `mega-mush+void` | Void, Mega Mush | S | Corrected | Mega Mush lasts 30 seconds; Void uses it every 6 charges |
| `blank-card+echo-chamber` | Echo Chamber, Blank Card | - | Removed | Removed: using Blank Card does not trigger Echo Chamber or join its queue |
| `diplopia+steam-sale` | Diplopia, Steam Sale | S → B | Re-rated | Repentance: two Steam Sales divide prices by three (price / (n + 1)), not free |
| `holy-mantle+c-the-lost` | Holy Mantle, The Lost | S → C | Re-rated | The Lost already has the shield; the item adds one for that room only |
| `psy-fly+c-the-lost` | Psy Fly, The Lost | S | Corrected | Psy Fly blocks shots; it does not send them back |
| `box-of-friends+c-lilith` | Box of Friends, Lilith | S | Corrected | The copies last the room; it does not trigger every room |
| `book-of-virtues+c-bethany` | Book of Virtues, Bethany | S | Confirmed | The pair is on the wiki |
| `birthright+c-jacob-and-esau` | Birthright, Jacob and Esau | S → A | Re-rated | It copies three passive items; the brothers do not fuse |
| `abaddon+c-keeper` | Abaddon, Keeper | D | Corrected | Repentance cuts Coin Hearts to one instead of killing Keeper |
| `t-swallowed-penny+c-keeper` | Swallowed Penny, Keeper | S → B | Re-rated | Repentance drops 0 or 1 coins for Keeper |
| `t-perfection+c-the-lost` | Perfection, The Lost | S | Confirmed | The pair is on the wiki |
| `cursed-eye+c-the-lost` | Cursed Eye, The Lost | D → B | Re-rated | The wiki lists it as safe for The Lost |
| `missing-no` | Missing No. | D | Confirmed | From each item's own effects |
| `eves-mascara+soy-milk` | Soy Milk, Eve's Mascara | D | Corrected | Eve's Mascara is 0.66x fire rate in Repentance, not half |
| `eves-mascara+polyphemus` | Polyphemus, Eve's Mascara | D → C | Re-rated | Damage per second still rises; it does not fall below base |
| `dr-fetus+soy-milk` | Dr. Fetus, Soy Milk | D → C | Re-rated | Repentance bombs no longer knock each other back |
| `isaacs-heart+c-azazel` | Isaac's Heart, Azazel | - | Removed | Removed: no source, and in Repentance the heart keeps away from where you shoot |
| `dead-eye+the-wiz` | Dead Eye, The Wiz | D | Corrected | A miss has a 20-50% chance to reset, not always |
| `immaculate-heart+sacred-heart` | Immaculate Heart, Sacred Heart | S | Corrected | The multipliers do stack (different groups); reworded |
| `damocles+c-the-lost` | Damocles, The Lost | S | Confirmed | The pair is on the wiki |
| `r-key` | R Key | S | Confirmed | From each item's own effects |
| `death-certificate` | Death Certificate | S | Corrected | Almost every unlocked item, not every item |
| `brimstone-bombs+dr-fetus` | Brimstone bombs, Dr. Fetus | S → B | Re-rated | The lasers fire on a luck-based chance, 11% at 0 luck |
| `brimstone-bombs+sad-bombs` | Brimstone bombs, Sad Bombs | S | Corrected | Added each effect's numbers |
| `brimstone+haemolacria` | Haemolacria, Brimstone | S | Corrected | 4-7 beams; they are not smaller |
| `godhead+trisagion` | Trisagion, Godhead | S → A | Re-rated | Overlapping auras stacking had no source |
| `kidney-stone+rock-bottom` | Rock Bottom, Kidney Stone | S | Confirmed | The pair is on the wiki |
| `red-stew+rock-bottom` | Rock Bottom, Red Stew | S | Confirmed | The pair is on the wiki |
| `purity+rock-bottom` | Rock Bottom, Purity | S | Confirmed | The pair is on the wiki |
| `ipecac+rock-bottom` | Rock Bottom, Ipecac | S | Corrected | Added the item order that matters with Brimstone or Tech X |
| `brimstone+rock-bottom` | Rock Bottom, Brimstone | S | Confirmed | The pair is on the wiki |
| `dataminer+rock-bottom` | Rock Bottom, Dataminer | S | Corrected | It stays at 120, not above |
| `proptosis+spirit-sword` | Spirit Sword, Proptosis | S | Confirmed | The pair is on the wiki |
