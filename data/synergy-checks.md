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
A, B and C entries were checked on 2026-11-25 (below).

**Review:** CodeRabbit on PR #2 caught the Repentance Steam Sale formula (n copies divide prices by n + 1),
Restock's rules (no rise in Greed Mode; the rise is not discounted) and a two-item entry that needs a
transformation (`guppys-head+soy-milk`); all are fixed below. Its point
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
| `restock+steam-sale` | Restock, Steam Sale | S → B | Re-rated | Repentance (outside Greed Mode) adds to each restock price, which Steam Sale does not discount; n Steam Sales divide the base price by n + 1 |
| `chaos+restock+steam-sale` | Restock, Steam Sale, Chaos | S → A | Re-rated | Same Repentance price rules outside Greed Mode: no endless free shop |
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

## 2026-11-25: every A, B and C entry

**Against:** the same wiki, read through its API on 2026-11-25, by the same rules as the S and D check
above. Two things were done differently because the list was five times longer. A script pulled, for each
entry, every line on each member's page that names another member, with its parent and child bullets and
its version mark. Six checkers then each took a sixth of the list with the same written rules, and could
open any page in full. Every change, and every entry a checker was unsure of, was then read against the
wiki line it rests on before it went in; 11 were adjusted at that review. The version marks
(`{{dlc|...}}`) were read as the wiki's own template defines them. Where an effect exists only in
Repentance+, the entry says so.

**Result:** 381 entries: 148 confirmed, 194 corrected, 28 re-rated, 11 removed. The 17 entries the S and D
check had already moved into A, B or C were not checked again. The list went from 453 entries to 442.
Every entry in the list has now been checked once.

**What came up again and again:**

- Older versions written as current. Ipecac's +40 on beams, lasers and knives (Repentance: +2 flat, and
  the beam or laser explodes); Blank Card copying runes; Cancer as tear delay -2 (now +1.0 fire rate);
  Proptosis at 3x (now 6x); Incubus at full damage (now 0.75x except as Lilith); Technology firing
  alongside Mom's Knife or Epic Fetus; Chocolate Milk's tear delay penalty.
- Repentance changes labelled "Repentance+": Monstro's Lung with Loki's Horns and Mom's Eye; Technology
  with Continuum, Cricket's Body and The Parasite; Dr. Fetus with Eye of Belial, Little Horn and Sticky
  Bombs.
- "No downside" claims that miss 20/20's 0.8x damage multiplier in Repentance, or Rock Bottom's rule that
  penalties still count underneath.
- A third item written into a two-item entry (the Guppy transformation, Polyphemus, Pyromaniac, Money =
  Power, Swallowed Penny), and transformation entries listing items that do not count.
- Claims with no source: "room-clearing", "screen-filling", "devastating", "one of the strongest".

**Left open by the wiki:** what 20/20 + Polyphemus does to damage (the two pages disagree); how often Tech X
rings block shots with Lost Contact (the wiki asks for more testing); Mom's Eye + Monstro's Lung (the
Monstro's Lung page's Repentance line is followed); Halo of Flies + Infestation + Skatole completes
Beelzebub only in Repentance+. The roster's transformation tags came from the item tracker and followed
Repentance+ in places (Infestation counted toward Beelzebub there); since decision 0006 they come from the
wiki's Repentance lists in `transformations.json`, with the Repentance+ differences marked.

| Entry | Members | Rating | Verdict | Why |
|---|---|---|---|---|
| `brimstone+ipecac` | Brimstone, Ipecac | A → B | Re-rated | Repentance gives +2 flat damage and two blasts per shot, not +40 on every tick (as Epic Fetus + Ipecac) |
| `brimstone+sad-bombs` | Brimstone, Sad Bombs | A | Corrected | "Room-clearing" and "any source of bombs" had no source; added the lost flat damage |
| `brimstone+spoon-bender` | Brimstone, Spoon Bender | A | Confirmed | The pair is on the wiki |
| `20-20+brimstone` | Brimstone, 20/20 | A | Corrected | Repentance's 0.8x damage multiplier means it is not clean double damage |
| `brimstone+the-inner-eye` | Brimstone, The Inner Eye | A | Corrected | Named as the roster does; 'massively' had no source, the wiki compares it with 20/20 |
| `brimstone+mutant-spider` | Brimstone, Mutant Spider | A | Confirmed | The pair is on the wiki |
| `brimstone+chocolate-milk` | Brimstone, Chocolate Milk | A | Confirmed | The pair is on the wiki |
| `brimstone+monstros-lung` | Brimstone, Monstro's Lung | A | Confirmed | The pair is on the wiki |
| `a-lump-of-coal+brimstone` | Brimstone, A Lump of Coal | A | Confirmed | The pair is on the wiki |
| `brimstone+rubber-cement` | Brimstone, Rubber Cement | B | Confirmed | The pair is on the wiki |
| `brimstone+continuum` | Brimstone, Continuum | B | Corrected | Brimstone already ignores obstacles; the gain is a second pass that can hit enemies twice |
| `brimstone+strange-attractor` | Brimstone, Strange Attractor | B | Corrected | "Prevents them from dodging" went further than the wiki's better accuracy |
| `brimstone+crickets-body` | Brimstone, Cricket's Body | B | Confirmed | The pair is on the wiki |
| `brimstone+the-parasite` | Brimstone, The Parasite | B | Confirmed | The pair is on the wiki |
| `brimstone+lost-contact` | Brimstone, Lost Contact | B | Confirmed | The pair is on the wiki |
| `brimstone+soy-milk` | Brimstone, Soy Milk | A | Confirmed | The pair is on the wiki |
| `almond-milk+brimstone` | Brimstone, Almond Milk | A | Corrected | The worm effects are real effects, not just visuals |
| `brimstone+eye-of-the-occult` | Brimstone, Eye of the Occult | A | Corrected | Steering the beam after it fires is only described with Marked added |
| `brimstone+marked` | Brimstone, Marked | B | Confirmed | The pair is on the wiki |
| `brimstone+tech-5` | Brimstone, Tech.5 | B | Confirmed | The pair is on the wiki |
| `brimstone+technology-2` | Brimstone, Technology 2 | B | Confirmed | The pair is on the wiki |
| `brimstone+tiny-planet` | Brimstone, Tiny Planet | C | Confirmed | The pair is on the wiki |
| `moms-knife+monstros-lung` | Mom's Knife, Monstro's Lung | A | Confirmed | The pair is on the wiki |
| `20-20+moms-knife` | Mom's Knife, 20/20 | A | Corrected | Repentance's 0.8x damage multiplier means it is not a clean increase |
| `moms-knife+the-inner-eye` | Mom's Knife, The Inner Eye | A | Corrected | That the fire rate penalty slows the knife's charge has no Repentance source |
| `dead-eye+moms-knife` | Mom's Knife, Dead Eye | - | Removed | Removed: the knife neither raises nor lowers Dead Eye's multiplier |
| `moms-knife+the-ludovico-technique` | Mom's Knife, The Ludovico Technique | A | Confirmed | The pair is on the wiki |
| `moms-knife+strange-attractor` | Mom's Knife, Strange Attractor | B | Confirmed | The pair is on the wiki |
| `lost-contact+moms-knife` | Mom's Knife, Lost Contact | - | Removed | Removed: in Repentance the knife does not destroy projectiles |
| `compound-fracture+moms-knife` | Mom's Knife, Compound Fracture | B | Corrected | Shards come occasionally, not on every hit; added their damage |
| `moms-knife+technology` | Mom's Knife, Technology | A → B | Re-rated | They no longer fire separately in Repentance; a laser just links the thrown knife to Isaac |
| `moms-knife+tech-x` | Mom's Knife, Tech X | A | Confirmed | The pair is on the wiki |
| `20-20+tech-x` | Tech X, 20/20 | A | Corrected | "Nearly doubles" overstated it; both rings take the 0.8x multiplier |
| `crickets-body+tech-x` | Tech X, Cricket's Body | B | Confirmed | The pair is on the wiki |
| `lost-contact+tech-x` | Tech X, Lost Contact | B | Corrected | Repentance line: the rings only sometimes block shots |
| `rubber-cement+tech-x` | Tech X, Rubber Cement | B | Corrected | The rings already pass through obstacles; the gain is the bounce, not hitting behind cover |
| `spoon-bender+tech-x` | Tech X, Spoon Bender | A | Confirmed | The pair is on the wiki |
| `monstros-lung+tech-x` | Tech X, Monstro's Lung | A | Corrected | Only the extra rings deal less; added Repentance's fire rate division |
| `dr-fetus+ipecac` | Ipecac, Dr. Fetus | A | Corrected | Repentance gives +2 flat damage, not a massive boost; "one of the safest" had no source |
| `host-hat+ipecac` | Ipecac, Host Hat | A | Confirmed | The pair is on the wiki |
| `ipecac+monstros-lung` | Ipecac, Monstro's Lung | A | Corrected | Repentance applies Ipecac's tears down (3x charge time) |
| `crickets-body+ipecac` | Ipecac, Cricket's Body | A | Corrected | Split tears deal half damage, not full explosive damage |
| `ipecac+the-parasite` | Ipecac, The Parasite | A | Corrected | It splits on obstacles, not on enemies |
| `ipecac+the-ludovico-technique` | Ipecac, The Ludovico Technique | A → C | Re-rated | Repentance: no explosion and only a small flat damage bonus, not +40 |
| `ipecac+technology` | Ipecac, Technology | A | Corrected | Added Repentance's +2 flat damage and Ipecac's fire rate down |
| `ipecac+soy-milk` | Ipecac, Soy Milk | B | Corrected | The 0.2x also cuts Ipecac's +40; 5.5x the shots keeps damage per second near Ipecac alone |
| `monstros-lung+soy-milk` | Soy Milk, Monstro's Lung | A | Confirmed | The pair is on the wiki |
| `soy-milk+technology-2` | Soy Milk, Technology 2 | A → C | Re-rated | The laser's tick rate is fixed, so Soy Milk's fire rate does not raise its damage |
| `lost-contact+soy-milk` | Soy Milk, Lost Contact | A | Confirmed | The pair is on the wiki |
| `soy-milk+strange-attractor` | Soy Milk, Strange Attractor | B → C | Re-rated | The Strange Attractor page calls it not recommended: enemies get pulled erratically |
| `a-lump-of-coal+soy-milk` | Soy Milk, A Lump of Coal | A | Confirmed | The pair is on the wiki |
| `lead-pencil+soy-milk` | Soy Milk, Lead Pencil | A | Corrected | "Full-damage" burst tears had no source; the double damage was older versions |
| `epic-fetus+sad-bombs` | Epic Fetus, Sad Bombs | A → B | Re-rated | In Repentance it is a luck-based chance, not every missile |
| `epic-fetus+host-hat` | Epic Fetus, Host Hat | A | Confirmed | The pair is on the wiki |
| `epic-fetus+polyphemus` | Epic Fetus, Polyphemus | A | Confirmed | The pair is on the wiki |
| `bomber-boy+epic-fetus` | Epic Fetus, Bomber Boy | A | Confirmed | The pair is on the wiki |
| `epic-fetus+monstros-lung` | Epic Fetus, Monstro's Lung | A | Confirmed | The pair is on the wiki |
| `epic-fetus+technology` | Epic Fetus, Technology | A | Corrected | In Repentance Technology no longer fires alongside the missiles |
| `20-20+polyphemus` | Polyphemus, 20/20 | B | Corrected | "+5 instead of multiplicative" had no source; the two pages disagree on the damage |
| `dr-fetus+polyphemus` | Polyphemus, Dr. Fetus | A | Corrected | Repentance's second bomb deals a flat 100 damage, not half |
| `sacred-heart+spoon-bender` | Sacred Heart, Spoon Bender | - | Removed | Removed: both only give homing, and nothing says homing from two items stacks |
| `godhead+the-ludovico-technique` | Godhead, The Ludovico Technique | A | Corrected | The aura does not hit an enemy the tear touches, so the two do not add up on one target |
| `a-lump-of-coal+godhead` | Godhead, A Lump of Coal | A → B | Re-rated | Repentance grows only the aura's size, not its damage |
| `godhead+soy-milk` | Godhead, Soy Milk | A | Corrected | Overlapping auras stacking had no source; Soy Milk's smaller tears shrink the aura |
| `chocolate-milk+monstros-lung` | Monstro's Lung, Chocolate Milk | A → D | Re-rated | Repentance: the pair lowers damage per second to 80%; the faster-firing version was older games |
| `monstros-lung+technology` | Monstro's Lung, Technology | A | Corrected | The charge time still equals Lung's tears down; "room-clearing" had no source; added the arcs |
| `dr-fetus+monstros-lung` | Monstro's Lung, Dr. Fetus | A | Corrected | Repentance bombs are mini-bombs that go off at different times, not together |
| `bobby-bomb+dr-fetus` | Dr. Fetus, Bobby-Bomb | B | Confirmed | The pair is on the wiki |
| `bomber-boy+dr-fetus` | Dr. Fetus, Bomber Boy | A | Confirmed | The pair is on the wiki |
| `dr-fetus+sad-bombs` | Dr. Fetus, Sad Bombs | A → B | Re-rated | Repentance: a luck-based chance (11% at 0 luck), not every bomb |
| `crickets-body+dr-fetus` | Dr. Fetus, Cricket's Body | A | Corrected | "Quadruples the explosive coverage" had no source; added the 35 damage per split bomb |
| `dr-fetus+the-parasite` | Dr. Fetus, The Parasite | A | Confirmed | The pair is on the wiki |
| `chocolate-milk+kidney-stone` | Chocolate Milk, Kidney Stone | - | Removed | Removed: no Repentance line; the stone getting the charge bonus had no source |
| `chocolate-milk+polyphemus` | Chocolate Milk, Polyphemus | A | Confirmed | The pair is on the wiki |
| `chocolate-milk+godhead` | Chocolate Milk, Godhead | A → B | Re-rated | Repentance: charging grows the aura but not its damage |
| `strange-attractor+the-ludovico-technique` | The Ludovico Technique, Strange Attractor | B | Corrected | Most bosses, not all enemies; dragging them into hazards had no source |
| `brimstone+the-ludovico-technique` | The Ludovico Technique, Brimstone | A | Confirmed | The pair is on the wiki |
| `curse-of-the-tower+pyromaniac` | Pyromaniac, Curse of the Tower | A → B | Re-rated | Repentance heals half a heart per blast; the wiki says it stops keeping up past Chapter 3 |
| `blood-rights+isaacs-heart` | Isaac's Heart, Blood Rights | - | Removed | Removed: in Repentance Isaac's Heart no longer stops Blood Rights from hurting Isaac |
| `daddy-longlegs+gnawed-leaf` | Gnawed Leaf, Daddy Longlegs | B | Corrected | "AFK every room and boss" was too strong: some bosses and distant enemies are out of reach |
| `cube-of-meat+gnawed-leaf` | Gnawed Leaf, Cube of Meat | B | Confirmed | The pair is on the wiki |
| `ball-of-bandages+gnawed-leaf` | Gnawed Leaf, Ball of Bandages | B | Confirmed | From each item's own effects |
| `gnawed-leaf+incubus` | Gnawed Leaf, Incubus | - | Removed | Removed: Incubus copies Isaac's shots, so it does not fire while Isaac stays still as a statue |
| `crickets-body+the-parasite` | Cricket's Body, The Parasite | A | Corrected | Eight split tears, per the wiki; the endless cascade and "screen-clearing" had no source |
| `compound-fracture+crickets-body` | Cricket's Body, Compound Fracture | A | Corrected | Stated how the splits stack; "excellent crowd control" had no source |
| `dead-eye+the-ludovico-technique` | Dead Eye, The Ludovico Technique | A | Confirmed | The pair is on the wiki |
| `blank-card+car-battery` | Car Battery, Blank Card | A | Corrected | Repentance Blank Card no longer copies runes, so the Jera, Perthro and Algiz examples were wrong |
| `car-battery+placebo` | Car Battery, Placebo | A | Corrected | Doubling stat-up pills had no source; the wiki's example is 48 Hour Energy |
| `20-20+the-inner-eye` | 20/20, The Inner Eye | B → A | Re-rated | Repentance: 20/20 removes Inner Eye's tears down (0.8x damage instead); the 6-tear count had no source |
| `20-20+mutant-spider` | 20/20, Mutant Spider | B → A | Re-rated | Repentance: 20/20 removes Mutant Spider's tears down (0.8x damage instead); the 8-tear count had no source |
| `brimstone+lead-pencil` | Lead Pencil, Brimstone | B | Corrected | Added every 4th blast; the burst's double damage was older versions only |
| `lead-pencil+the-ludovico-technique` | Lead Pencil, The Ludovico Technique | B | Confirmed | The pair is on the wiki |
| `20-20+eves-mascara` | Eve's Mascara, 20/20 | A | Corrected | Repentance: Eve's Mascara is 0.66x fire rate and 20/20 0.8x damage; "2x total DPS" was wrong |
| `brimstone+proptosis` | Proptosis, Brimstone | A | Corrected | Repentance: 6x at point blank, not 3x; the falloff has no useful floor |
| `dr-fetus+proptosis` | Proptosis, Dr. Fetus | A | Confirmed | The pair is on the wiki |
| `ipecac+revelation` | Revelation, Ipecac | A | Corrected | The explosions are at the first thing hit, not along the path; the laser gets +2 damage, not +40 |
| `brimstone+c-section` | C Section, Brimstone | A | Confirmed | The pair is on the wiki |
| `c-section+moms-knife` | C Section, Mom's Knife | A | Confirmed | The pair is on the wiki |
| `c-section+ipecac` | C Section, Ipecac | A | Confirmed | The pair is on the wiki |
| `birthright+c-isaac` | Birthright, Isaac | A | Confirmed | The pair is on the wiki |
| `birthright+c-judas` | Birthright, Judas | A | Corrected | The boost depends on the active item's charges, so it is not a permanent damage up |
| `birthright+c-eve` | Birthright, Eve | A | Confirmed | The pair is on the wiki |
| `birthright+c-azazel` | Birthright, Azazel | A | Confirmed | The pair is on the wiki |
| `birthright+c-magdalene` | Birthright, Magdalene | B | Confirmed | The pair is on the wiki |
| `birthright+c-blue-baby` | Birthright, Blue Baby | A | Confirmed | The pair is on the wiki |
| `birthright+c-samson` | Birthright, Samson | A | Confirmed | The pair is on the wiki |
| `birthright+c-lazarus` | Birthright, Lazarus | B | Confirmed | The pair is on the wiki |
| `birthright+c-eden` | Birthright, Eden | A | Corrected | "High-quality" had no source: the pick ignores item weight |
| `birthright+c-cain` | Birthright, Cain | B | Confirmed | The pair is on the wiki |
| `birthright+c-keeper` | Birthright, Keeper | B | Confirmed | The pair is on the wiki |
| `dead-cat+c-keeper` | Dead Cat, Keeper | C | Confirmed | The pair is on the wiki |
| `brimstone+c-the-lost` | Brimstone, The Lost | A | Confirmed | From each item's own effects |
| `moms-knife+c-the-lost` | Mom's Knife, The Lost | A | Corrected | The knife blocks shots only with Lost Contact in older versions |
| `epic-fetus+c-the-lost` | Epic Fetus, The Lost | B | Confirmed | From each item's own effects |
| `polyphemus+c-the-lost` | Polyphemus, The Lost | A | Confirmed | From each item's own effects |
| `technology+c-azazel` | Technology, Azazel | B | Corrected | The laser wraps the beam; it does not fire separately while Azazel charges |
| `chocolate-milk+c-azazel` | Chocolate Milk, Azazel | B | Confirmed | The pair is on the wiki |
| `t-curved-horn` | Curved Horn | B | Confirmed | From the trinket's own effects |
| `t-perfection` | Perfection | A | Corrected | Parasitoid is not among the wiki's maxed effects; "massive DPS boost" had no source |
| `t-cancer` | Cancer | A | Corrected | Repentance: +1.0 fire rate, not tear delay -2; the fast-fire claims had no source |
| `t-cracked-crown` | Cracked Crown | A | Corrected | Each stat's own excess gets +20%; it does not spread the highest stat to the others |
| `t-forgotten-lullaby` | Forgotten Lullaby | B | Corrected | Added the Incubus fire-rate limit and that wisps are not affected |
| `t-baby-bender` | Baby-Bender | A | Confirmed | From the trinket's own effects |
| `incubus+t-forgotten-lullaby` | Incubus, Forgotten Lullaby | B | Corrected | Added the wiki's fire-rate limit: the trinket stops helping Incubus at high fire rates |
| `incubus+t-baby-bender` | Incubus, Baby-Bender | A | Corrected | Repentance Incubus deals 75% of Isaac's damage, not the same damage |
| `incubus` | Incubus | A | Corrected | Repentance cuts Incubus to 75% damage, so not double; the knife copy had no source |
| `brimstone+dr-fetus` | Dr. Fetus, Brimstone | A → D | Re-rated | Repentance: Dr. Fetus overrides Brimstone; bombs while charging was Afterbirth and Afterbirth+ only |
| `anti-gravity+brimstone` | Anti-Gravity, Brimstone | B | Confirmed | The pair is on the wiki |
| `tarot-cloth` | Tarot Cloth | A | Corrected | Repentance: tarot cards only, and The Sun and The Stars get different extras |
| `blank-card` | Blank Card | A → B | Re-rated | Repentance copies cards only, not the runes the entry relied on; recharge is now 1-12 rooms by card |
| `placebo` | Placebo | A | Corrected | There is no damage-up pill; in Repentance a stat-up pill takes 6 rooms to copy again |
| `almond-milk+the-ludovico-technique` | Almond Milk, The Ludovico Technique | C | Corrected | Worm effects as the cause had no source; the extra hits come from fire rate setting the hit rate |
| `epic-fetus+marked` | Marked, Epic Fetus | B | Corrected | Epic Fetus already aims freely; what Marked adds is missiles fired continuously at its mark |
| `brimstone+lokis-horns` | Loki's Horns, Brimstone | A | Confirmed | The pair is on the wiki |
| `brimstone+moms-eye` | Mom's Eye, Brimstone | B | Confirmed | The pair is on the wiki |
| `moms-eye+moms-knife` | Mom's Eye, Mom's Knife | B | Confirmed | The pair is on the wiki |
| `eye-sore+moms-knife` | Eye Sore, Mom's Knife | B | Confirmed | The pair is on the wiki |
| `guppys-head+moms-knife` | Guppy's Head, Mom's Knife | - | Removed | Removed: needs the Guppy transformation, and knife hits spawning flies is not a Repentance line |
| `my-reflection+technology` | My Reflection, Technology | C | Corrected | The curving beam was older versions; in Repentance the laser loops in front and fires backwards |
| `moms-knife+my-reflection` | My Reflection, Mom's Knife | C | Corrected | In Repentance the trajectory does not carry over to the knife; only the stat changes do |
| `epic-fetus+strange-attractor` | Strange Attractor, Epic Fetus | B | Confirmed | The pair is on the wiki |
| `soy-milk+technology` | Technology, Soy Milk | A → C | Re-rated | Repentance: 5.5x fire rate at 0.2x damage, about even; the 'good DPS increase' line is pre-Repentance |
| `polyphemus+technology` | Technology, Polyphemus | A | Corrected | Technology fires single lasers, not ticks; Repentance Polyphemus is 0.42x fire rate |
| `proptosis+technology` | Technology, Proptosis | A | Corrected | Repentance gives 6x at point blank, not 3x; it drops to 0.1 by about 8 tiles |
| `moms-knife+sad-bombs` | Sad Bombs, Mom's Knife | A | Corrected | 'Each knife deals full damage' had no source |
| `sad-bombs+tech-x` | Sad Bombs, Tech X | A | Confirmed | The pair is on the wiki |
| `car-battery+the-d6` | Car Battery, The D6 | A → D | Re-rated | The wiki says the double reroll has no benefit and drains item pools twice as fast |
| `book-of-revelations+car-battery` | Car Battery, Book of Revelations | A | Corrected | The Harbinger swap has conditions, so it is not guaranteed |
| `car-battery+the-satanic-bible` | Car Battery, The Satanic Bible | A | Corrected | 'Double activation gives even more value' had no source; the wiki line is two black hearts |
| `car-battery+guppys-head` | Car Battery, Guppy's Head | B | Corrected | The Guppy transformation needs a third Guppy item; the flies roughly double |
| `car-battery+moms-box` | Car Battery, Mom's Box | A | Corrected | No pair line; named trinket claims dropped, kept what follows from each item |
| `car-battery+sulfur` | Car Battery, Sulfur | A | Confirmed | The pair is on the wiki |
| `bffs+incubus` | BFFS!, Incubus | A | Corrected | Repentance gives 1.5x your damage, not 2x, except as Lilith |
| `bffs+twisted-pair` | BFFS!, Twisted Pair | A | Corrected | The firing angles and 'massive' had no source; added the real per-familiar damage |
| `bffs+lil-brimstone` | BFFS!, Lil' Brimstone | B | Corrected | Added the Repentance numbers; 'clears weaker enemies on its own' had no source |
| `bffs+succubus` | BFFS!, Succubus | B | Confirmed | The pair is on the wiki |
| `hive-mind+infestation-2` | Hive Mind, Infestation 2 | A | Corrected | 'Chain-kills, snowballing' had no source; reworded from each item's effects |
| `hive-mind+the-mulligan` | Hive Mind, The Mulligan | B | Corrected | 'Flies that overwhelm rooms' had no source; added the 16.67% chance per hit |
| `sharp-plug+the-wafer` | Sharp Plug, The Wafer | - | Removed | Removed: in Repentance The Wafer does not reduce Sharp Plug's cost |
| `4-5-volt+brimstone` | 4.5 Volt, Brimstone | A | Corrected | 'Fully recharges high-cost actives instantly' is wrong: one charge at a time, 60+ damage each |
| `4-5-volt+tech-x` | 4.5 Volt, Tech X | A | Corrected | 'Actives available nearly every room' had no source; added 4.5 Volt's damage per charge |
| `4-5-volt+the-ludovico-technique` | 4.5 Volt, The Ludovico Technique | A | Corrected | 'Near-instant recharges' had no source; 4.5 Volt needs 60+ damage per charge |
| `book-of-virtues+the-book-of-belial` | Book of Virtues, The Book of Belial | A | Corrected | The wisps grant no damage bonus; they deal double damage themselves |
| `book-of-virtues+the-satanic-bible` | Book of Virtues, The Satanic Bible | B | Corrected | The special part is +10% Devil Room chance per wisp, not extra contact damage |
| `the-d6+void` | Void, The D6 | A → C | Re-rated | Repentance rerolls the items just before Void absorbs them, so there is no usable reroll |
| `bloody-lust+dull-razor` | Dull Razor, Bloody Lust | A | Confirmed | The pair is on the wiki |
| `cambion-conception+dull-razor` | Dull Razor, Cambion Conception | A | Confirmed | The pair is on the wiki |
| `brimstone+maw-of-the-void` | Maw of the Void, Brimstone | A | Corrected | The ring needs 2.35 s of firing, not a full Brimstone charge; no line names the pair |
| `dead-cat+c-the-forgotten` | Dead Cat, The Forgotten | B | Corrected | 'Less punishing than most' had no source; stated what each form keeps |
| `blood-oath+c-eve` | Blood Oath, Eve | A | Corrected | Dead Bird lasts the room, not the floor; the Whore of Babylon line is on the Blood Oath page |
| `money-power+c-keeper` | Money = Power, Keeper | A → C | Re-rated | Keeper has no coin tears; healing and devil deals spend his coins, which works against the bonus |
| `deep-pockets+c-keeper` | Deep Pockets, Keeper | B | Corrected | Money = Power is a third item; kept what Deep Pockets gives Keeper itself |
| `keepers-sack+c-keeper` | Keeper's Sack, Keeper | B | Corrected | The boosts are a fixed cycle per 3 coins, not random; devil deals count for Keeper |
| `iv-bag+c-keeper` | IV Bag, Keeper | B → D | Re-rated | Keeper gets 0-1 coins per use, so it costs more health than it returns; Swallowed Penny is a third item |
| `cambion-conception+c-lilith` | Cambion Conception, Lilith | A | Corrected | Lilith does not charge Incubus by taking damage; she starts with Cambion Conception |
| `dark-bum+c-blue-baby` | Dark Bum, Blue Baby | A | Corrected | Repentance gives black hearts, not soul hearts, plus pills, cards and runes |
| `abaddon+c-blue-baby` | Abaddon, Blue Baby | A | Confirmed | The pair is on the wiki |
| `birthright+c-lilith` | Birthright, Lilith | A | Corrected | 'Removes the familiar delay, perfectly synchronized' had no source |
| `birthright+c-bethany` | Birthright, Bethany | A | Corrected | Birthright does not strengthen wisps; it makes soul-charge uses free 50% of the time |
| `gello+c-lilith` | Gello, Lilith | A | Corrected | Gello is a separate familiar, not tears from her body; Lilith gets 1x damage instead of 0.75x |
| `brimstone+c-lilith` | Brimstone, Lilith | A | Corrected | Lilith fires no beam of her own; only Incubus, and any copy of it, fires one |
| `halo-of-flies+infestation+skatole` | Halo of Flies, Skatole, Infestation | A | Corrected | Infestation counts only in Repentance+; Infestation 2 never counts; the item list was wrong |
| `the-bible+the-book-of-belial+the-necronomicon` | The Bible, The Book of Belial, The Necronomicon | A | Corrected | Added the 25% chance; item names fixed to the roster's spelling |
| `dead-dove+holy-grail+sacred-heart` | Sacred Heart, Holy Grail, Dead Dove | A | Corrected | Guardian Angel and Sworn Protector stopped counting in Repentance; the Seraphim familiar is Repentance+ only |
| `brimstone+lord-of-the-pit+the-pact` | Brimstone, The Pact, Lord of the Pit | A | Corrected | Whore of Babylon is not a Leviathan item; it is three from a set list, not any devil item |
| `roid-rage+speed-ball+synthoil` | Roid Rage, Speed Ball, Synthoil | A | Confirmed | The trio is on the transformation page |
| `brother-bobby+little-steven+sister-maggy` | Brother Bobby, Sister Maggy, Little Steven | B | Corrected | Added the tears down; 'triples coverage' had no source |
| `magic-mushroom+mini-mush+odd-mushroom-thin` | Magic Mushroom, Mini Mush, Odd Mushroom (Thin) | B | Corrected | Item names fixed to the roster's spelling (Odd Mushroom (Thick), 1UP) |
| `butt-bombs+e-coli+the-poop` | The Poop, Butt Bombs, E. Coli | C | Corrected | Butt Bombs counts only from Repentance; 'consistent healing in many rooms' had no source |
| `bum-friend+dark-bum+key-bum` | Bum Friend, Key Bum, Dark Bum | A | Corrected | Super Bum takes coins, red hearts and keys, not every pickup, and doubles the bums' rewards |
| `moms-box+t-curved-horn` | Mom's Box, Curved Horn | A | Corrected | The wiki gives +4 (+6 with a golden horn); the rapid-fire claim had no source |
| `moms-box+t-cancer` | Mom's Box, Cancer | A | Corrected | Repentance Cancer is +1.0 fire rate, so +2.0 with Mom's Box, not -2 to -4 tear delay |
| `moms-box+t-cracked-crown` | Mom's Box, Cracked Crown | A | Corrected | Each stat above base gets 20% of its excess (40% with Mom's Box); the top stat does not lift the others |
| `tough-love+t-perfection` | Tough Love, Perfection | A | Corrected | At 9 luck every tear is a tooth, not nearly every; the rapid-fire claim had no source |
| `holy-light+t-perfection` | Holy Light, Perfection | A | Corrected | Holy Light caps at 50% of tears, not nearly every shot |
| `t-forgotten-lullaby+c-lilith` | Forgotten Lullaby, Lilith | A | Corrected | Added the wiki's fire-rate ceiling for Incubus; the doubling holds only at normal fire rates |
| `t-baby-bender+c-lilith` | Baby-Bender, Lilith | A | Confirmed | The pair is on the wiki |
| `twisted-pair+t-forgotten-lullaby` | Twisted Pair, Forgotten Lullaby | B | Corrected | Added the wiki's ceiling: the trinket stops helping near 27.5 fire rate |
| `twisted-pair+t-baby-bender` | Twisted Pair, Baby-Bender | A | Corrected | Twisted Pair does not fire diagonally; the rest follows from each item |
| `moms-purse+t-cancer+t-curved-horn` | Mom's Purse, Curved Horn, Cancer | A | Corrected | Repentance Cancer is +1.0 fire rate, not -2 tear delay |
| `20-20+dead-eye` | Dead Eye, 20/20 | C | Corrected | A miss resets only 20-50% of the time, and the wiki says both tears add to the multiplier |
| `brimstone+cursed-eye` | Cursed Eye, Brimstone | B | Confirmed | The pair is on the wiki |
| `cursed-eye+moms-knife` | Cursed Eye, Mom's Knife | B | Confirmed | The pair is on the wiki |
| `black-candle+cursed-eye` | Black Candle, Cursed Eye | A | Corrected | The Repentance burst is five tears, not four |
| `deaths-touch+moms-knife` | Death's Touch, Mom's Knife | A | Corrected | "Tears down doesn't matter" had no source |
| `brimstone+deaths-touch` | Death's Touch, Brimstone | A | Corrected | The tears down does apply: Brimstone's charge time follows fire rate |
| `crickets-head+magic-mushroom` | Cricket's Head, Magic Mushroom | C | Corrected | Magic Mushroom gives +0.3 damage, not +3, and not every stat |
| `brimstone+immaculate-heart` | Immaculate Heart, Brimstone | A | Confirmed | The pair is on the wiki |
| `star-of-bethlehem` | Star of Bethlehem | A | Corrected | The aura gives no speed; added its numbers and the Repentance+ cut |
| `damocles` | Damocles | B | Corrected | The fall chance is flat (1/10000 per 0.133 s), not increasing; self-damage does not count |
| `stop-watch` | Stop Watch | A | Corrected | Added the Repentance 80% slow; "one of the strongest defensive items" had no source |
| `sacred-orb` | Sacred Orb | A | Confirmed | From the item's own effects |
| `glitched-crown` | Glitched Crown | A | Confirmed | From the item's own effects |
| `magic-mushroom+polyphemus` | Magic Mushroom, Polyphemus | A | Corrected | Magic Mushroom has no tears up, so it does not offset Polyphemus's fire rate penalty |
| `crickets-head+polyphemus` | Cricket's Head, Polyphemus | A | Corrected | "One-shots most non-boss enemies" had no source |
| `blood-of-the-martyr+the-book-of-belial` | Blood of the Martyr, The Book of Belial | A | Corrected | The x1.5 comes with each use of the book, not from just holding both |
| `brimstone-bombs` | Brimstone bombs | A | Corrected | Fired bombs (Dr. Fetus) only get the lasers by chance; "exceptionally strong" had no source |
| `psy-fly` | Psy Fly | A | Corrected | Psy Fly blocks shots, it does not deflect them, and the wiki says it is not immunity |
| `bffs+psy-fly` | Psy Fly, BFFS! | A → C | Re-rated | Psy Fly has no deflected tears to boost; only its small contact damage doubles |
| `9-volt+the-book-of-belial` | 9 Volt, The Book of Belial | A → B | Re-rated | Belial has 3 charges and 9 Volt returns one per use: every other room, not every room |
| `9-volt+guppys-head` | 9 Volt, Guppy's Head | B | Corrected | 9 Volt gives no charge on room entry; it makes Guppy's Head a 15-second recharge in hostile rooms |
| `blank-card+the-battery` | The Battery, Blank Card | A | Corrected | Repentance Blank Card cannot copy runes, so the Jera example is gone |
| `d1+rune-bag` | D1, Rune Bag | A → C | Re-rated | Runes come every 7-8 rooms and the copy may differ: no endless duplication |
| `daddy-longlegs+gnawed-leaf+succubus` | Gnawed Leaf, Daddy Longlegs, Succubus | A | Corrected | Succubus's aura hurts enemies near it, not near you; added each item's numbers |
| `haemolacria+moms-knife` | Haemolacria, Mom's Knife | A → C | Re-rated | Repentance: the knife overrides Haemolacria, so no knife shower; only its stats carry over |
| `haemolacria+ipecac` | Haemolacria, Ipecac | A | Corrected | The split tears are not explosive, so there are no chain explosions |
| `crickets-body+haemolacria` | Haemolacria, Cricket's Body | A | Corrected | It is the split tears that burst again, not the burst tears that split |
| `haemolacria+the-ludovico-technique` | Haemolacria, The Ludovico Technique | B → C | Re-rated | Haemolacria overrides Ludovico; the only gain is piercing tears |
| `spoon-bender+trisagion` | Trisagion, Spoon Bender | A | Corrected | Homing blasts settle on the enemy; they do not arc back for repeat hits |
| `a-lump-of-coal+trisagion` | Trisagion, A Lump of Coal | - | Removed | Removed: in Repentance the blasts gain no damage from it without a beam-lengthening item such as My Reflection |
| `brimstone+jacobs-ladder` | Jacob's Ladder, Brimstone | A | Confirmed | The pair is on the wiki |
| `jacobs-ladder+tech-x` | Jacob's Ladder, Tech X | A | Confirmed | The pair is on the wiki |
| `jacobs-ladder+technology` | Jacob's Ladder, Technology | A | Corrected | Technology does not fire continuously; the sparks come from each laser shot |
| `brimstone+holy-light` | Brimstone, Holy Light | A | Confirmed | The pair is on the wiki |
| `brimstone+fire-mind` | Brimstone, Fire Mind | B | Confirmed | The pair is on the wiki |
| `brimstone+head-of-the-keeper` | Brimstone, Head of the Keeper | B | Confirmed | The pair is on the wiki |
| `brimstone+mucormycosis` | Brimstone, Mucormycosis | B | Corrected | The 25% roll is on every other tick, and spores spread by firing four more |
| `brimstone+mysterious-liquid` | Brimstone, Mysterious Liquid | B | Corrected | The pools are small and short-lived, not large and lasting |
| `brimstone+ocular-rift` | Brimstone, Ocular Rift | B | Confirmed | The pair is on the wiki |
| `brimstone+terra` | Brimstone, Terra | B | Corrected | The beam cannot open Secret Rooms |
| `brimstone+uranus` | Brimstone, Uranus | B | Confirmed | The pair is on the wiki |
| `apple+brimstone` | Brimstone, Apple! | B | Corrected | Repentance rolls the bonus per tick, not for the whole beam |
| `brimstone+tough-love` | Brimstone, Tough Love | B | Confirmed | The pair is on the wiki |
| `brimstone+rotten-tomato` | Brimstone, Rotten Tomato | B | Confirmed | The pair is on the wiki |
| `brimstone+multidimensional-baby` | Brimstone, Multidimensional Baby | B | Confirmed | The pair is on the wiki |
| `brimstone+dead-eye` | Brimstone, Dead Eye | B | Confirmed | The pair is on the wiki |
| `flat-stone+moms-knife` | Mom's Knife, Flat Stone | B | Confirmed | The pair is on the wiki |
| `holy-light+moms-knife` | Mom's Knife, Holy Light | B | Corrected | "Frequent procs from contact damage" had no source; added the 3x beam |
| `moms-knife+mysterious-liquid` | Mom's Knife, Mysterious Liquid | B | Corrected | The creep is small and short-lived; "persists after the knife returns" had no source |
| `moms-knife+the-parasite` | Mom's Knife, The Parasite | B | Confirmed | The pair is on the wiki |
| `moms-knife+the-wiz` | Mom's Knife, The Wiz | B | Confirmed | The pair is on the wiki |
| `marked+moms-knife` | Mom's Knife, Marked | B | Corrected | The crosshair is steered, not auto-aimed; added how its distance sets the charge |
| `ipecac+moms-knife` | Mom's Knife, Ipecac | A | Corrected | Added that it explodes once per throw and that Ipecac's +40 becomes +2 |
| `diplopia+moms-knife` | Mom's Knife, Diplopia | A | Corrected | Diplopia is used once and copies the pedestal; it does not add a knife per use |
| `moms-knife+spirit-sword` | Mom's Knife, Spirit Sword | B | Corrected | The throw comes from the sword's own spin attack, not the knife's charge |
| `dr-fetus+tech-x` | Tech X, Dr. Fetus | A | Corrected | The ring deals Isaac's damage stat, not his base damage; added that charging is gone |
| `haemolacria+tech-x` | Tech X, Haemolacria | A | Confirmed | The pair is on the wiki |
| `head-of-the-keeper+tech-x` | Tech X, Head of the Keeper | B | Confirmed | The pair is on the wiki |
| `lead-pencil+tech-x` | Tech X, Lead Pencil | B | Confirmed | The pair is on the wiki |
| `lokis-horns+tech-x` | Tech X, Loki's Horns | B | Corrected | The rings fire only forward and back, in stacked pairs, not in all four directions |
| `moms-eye+tech-x` | Tech X, Mom's Eye | B | Confirmed | The pair is on the wiki |
| `proptosis+tech-x` | Tech X, Proptosis | A | Confirmed | The pair is on the wiki |
| `godhead+tech-x` | Tech X, Godhead | B | Confirmed | The pair is on the wiki (with Tech X's homing line) |
| `soy-milk+tech-x` | Tech X, Soy Milk | A | Corrected | Added that Soy Milk's 0.2x damage still applies |
| `ipecac+tech-x` | Tech X, Ipecac | A | Corrected | Explosions are every other tick, not every tick; added the +2 damage |
| `a-lump-of-coal+tech-x` | Tech X, A Lump of Coal | B → C | Re-rated | The 1.5x figure is from before Repentance; the Repentance gain per tile is much smaller |
| `dead-eye+tech-x` | Tech X, Dead Eye | B | Corrected | The bonus freezes at its level when Tech X is taken, and only if Dead Eye came first |
| `tech-x+technology-2` | Tech X, Technology 2 | B | Confirmed | The pair is on the wiki |
| `tech-5+tech-x` | Tech X, Tech.5 | B | Confirmed | The pair is on the wiki |
| `c-section+tech-x` | Tech X, C Section | A | Confirmed | The pair is on the wiki |
| `dr-fetus+mr-mega` | Dr. Fetus, Mr. Mega | A | Confirmed | The pair is on the wiki |
| `dr-fetus+mysterious-liquid` | Dr. Fetus, Mysterious Liquid | B | Corrected | 'Persists' had no source |
| `dr-fetus+remote-detonator` | Dr. Fetus, Remote Detonator | B | Confirmed | The pair is on the wiki |
| `dr-fetus+scatter-bombs` | Dr. Fetus, Scatter Bombs | B | Corrected | In Repentance the split is a luck-based chance (34% at 0 luck), not every bomb |
| `dr-fetus+haemolacria` | Dr. Fetus, Haemolacria | A | Confirmed | The pair is on the wiki |
| `dr-fetus+godhead` | Dr. Fetus, Godhead | B | Corrected | Added that the bombs do not get the aura |
| `dr-fetus+the-ludovico-technique` | Dr. Fetus, The Ludovico Technique | B | Corrected | Detonating on command had no source; added the Repentance Epic Fetus behaviour |
| `dr-fetus+eye-of-belial` | Dr. Fetus, Eye of Belial | B | Corrected | The 2.5x pierce damage is Repentance, not Repentance+; added what does not carry over |
| `dr-fetus+fire-mind` | Dr. Fetus, Fire Mind | B | Corrected | 'Persistent' had no source |
| `dr-fetus+little-horn` | Dr. Fetus, Little Horn | A | Corrected | This is Repentance, not Repentance+ |
| `dr-fetus+rocket-in-a-jar` | Dr. Fetus, Rocket in a Jar | A | Corrected | The Polyphemus bounce needs a third item; removed |
| `dr-fetus+sticky-bombs` | Dr. Fetus, Sticky Bombs | B | Corrected | The white creep is Repentance, not Repentance+; added that no spiders spawn |
| `20-20+epic-fetus` | Epic Fetus, 20/20 | A | Corrected | Not downside-free: 20/20 has a 0.8x damage multiplier in Repentance |
| `epic-fetus+the-inner-eye` | Epic Fetus, The Inner Eye | A | Corrected | 'Triple coverage' and 'devastating room clears' had no source; the missiles come in a row |
| `epic-fetus+mutant-spider` | Epic Fetus, Mutant Spider | A | Corrected | 'Blankets entire rooms' had no source; the four missiles come in a row |
| `epic-fetus+incubus` | Epic Fetus, Incubus | A | Corrected | Incubus hits 25% weaker in Repentance, so not double; 'independent cursors' had no source |
| `epic-fetus+twisted-pair` | Epic Fetus, Twisted Pair | A → D | Re-rated | The extra crosshairs lag near Isaac and make self-damage likely; both pages advise against it |
| `epic-fetus+lokis-horns` | Epic Fetus, Loki's Horns | B | Corrected | Four crosshairs, not five missiles; added the Repentance chance |
| `epic-fetus+glitter-bombs` | Epic Fetus, Glitter Bombs | B | Corrected | Added the Repentance per-floor cap (unlimited pickups was older versions) |
| `blood-bombs+epic-fetus` | Epic Fetus, Blood Bombs | B | Confirmed | The pair is on the wiki |
| `epic-fetus+spoon-bender` | Epic Fetus, Spoon Bender | B | Confirmed | The pair is on the wiki |
| `20-20+the-ludovico-technique` | The Ludovico Technique, 20/20 | B | Corrected | 20/20 adds one orbiting tear, not several; added its 0.8x damage |
| `compound-fracture+the-ludovico-technique` | The Ludovico Technique, Compound Fracture | B | Corrected | The extra hits are piercing bone shots, not splash damage |
| `technology+the-ludovico-technique` | The Ludovico Technique, Technology | A | Confirmed | The pair is on the wiki |
| `holy-light+the-ludovico-technique` | The Ludovico Technique, Holy Light | A | Confirmed | The pair is on the wiki |
| `lost-contact+the-ludovico-technique` | The Ludovico Technique, Lost Contact | B | Confirmed | The pair is on the wiki |
| `a-lump-of-coal+the-ludovico-technique` | The Ludovico Technique, A Lump of Coal | A | Confirmed | The pair is on the wiki |
| `mysterious-liquid+the-ludovico-technique` | The Ludovico Technique, Mysterious Liquid | B | Corrected | 'Permanent' trails had no source; Mysterious Liquid's pools are short-lasting |
| `monstros-lung+the-ludovico-technique` | The Ludovico Technique, Monstro's Lung | B | Confirmed | The pair is on the wiki |
| `my-reflection+the-ludovico-technique` | The Ludovico Technique, My Reflection | B | Corrected | Added that the tear drifts toward Isaac |
| `the-ludovico-technique+tough-love` | The Ludovico Technique, Tough Love | A | Corrected | The tooth is occasional below 9 luck, not a constant transformation |
| `flat-stone+the-ludovico-technique` | The Ludovico Technique, Flat Stone | B | Corrected | The Ipecac explosion needs a third item; removed |
| `eye-of-the-occult+the-ludovico-technique` | The Ludovico Technique, Eye of the Occult | B | Confirmed | The pair is on the wiki |
| `flat-stone+ipecac` | Ipecac, Flat Stone | A | Corrected | In Repentance each bounce blast deals half Isaac's damage, not a full Ipecac explosion |
| `ipecac+trisagion` | Ipecac, Trisagion | A | Corrected | The Pyromaniac healing needs a third item; removed |
| `ipecac+maw-of-the-void` | Ipecac, Maw of the Void | A | Corrected | 'Every other tick' had no source for Maw of the Void |
| `ipecac+tiny-planet` | Ipecac, Tiny Planet | B → C | Re-rated | Not a safe Ipecac: the shots only land clear if Isaac stays still and hits nothing |
| `d8+rock-bottom` | Rock Bottom, D8 | A | Corrected | Not a guaranteed gain each reroll: a roll helps only when it beats the best so far |
| `eves-mascara+rock-bottom` | Rock Bottom, Eve's Mascara | A | Corrected | Not downside-free: the penalties still apply internally and slow later stat ups |
| `false-phd+rock-bottom` | Rock Bottom, False PHD | A | Corrected | The stat downs still apply underneath and make that stat harder to raise later |
| `binge-eater+rock-bottom` | Rock Bottom, Binge Eater | A | Corrected | 'Free stats from every pedestal' overstated: the food is taken instead of the item |
| `chocolate-milk+rock-bottom` | Rock Bottom, Chocolate Milk | - | Removed | Removed: Chocolate Milk has no fire rate penalty in Repentance, so Rock Bottom has nothing to hold |
| `20-20+rock-bottom` | Rock Bottom, 20/20 | A | Corrected | Not penalty-free: the 0.8x multiplier still affects later damage ups |
| `spirit-sword+technology` | Spirit Sword, Technology | A | Confirmed | The pair is on the wiki |
| `polyphemus+spirit-sword` | Spirit Sword, Polyphemus | A | Confirmed | The pair is on the wiki |
| `haemolacria+spirit-sword` | Spirit Sword, Haemolacria | A | Confirmed | The pair is on the wiki |
| `holy-light+spirit-sword` | Spirit Sword, Holy Light | B | Confirmed | The pair is on the wiki |
| `lost-contact+spirit-sword` | Spirit Sword, Lost Contact | B | Confirmed | The pair is on the wiki |
| `crickets-body+spirit-sword` | Spirit Sword, Cricket's Body | B | Corrected | "Smaller" swords had no source; added when the sword fires a projectile at all |
| `lokis-horns+spirit-sword` | Spirit Sword, Loki's Horns | B | Corrected | Added the four-way spin and Repentance's luck formula; "devastating" had no source |
| `spirit-sword+trisagion` | Spirit Sword, Trisagion | B | Confirmed | The pair is on the wiki |
| `20-20+spirit-sword` | Spirit Sword, 20/20 | B | Confirmed | The pair is on the wiki |
| `c-section+spirit-sword` | Spirit Sword, C Section | A | Confirmed | The pair is on the wiki |
| `moms-knife+spirit-sword+technology` | Spirit Sword, Mom's Knife, Technology | A | Corrected | "Continuous damage along its path" had no source; added the sword throw |
| `brimstone+moms-knife+spirit-sword` | Spirit Sword, Mom's Knife, Brimstone | A | Confirmed | The trio is on the wiki |
| `haemolacria+technology` | Haemolacria, Technology | A | Confirmed | The pair is on the wiki |
| `chocolate-milk+haemolacria` | Haemolacria, Chocolate Milk | B | Corrected | The burst tears do not explode; "devastating" had no source |
| `compound-fracture+haemolacria` | Haemolacria, Compound Fracture | B | Confirmed | The pair is on the wiki |
| `dead-eye+haemolacria` | Haemolacria, Dead Eye | B | Confirmed | The pair is on the wiki |
| `flat-stone+haemolacria` | Haemolacria, Flat Stone | B | Confirmed | The pair is on the wiki |
| `haemolacria+lead-pencil` | Haemolacria, Lead Pencil | A | Confirmed | The pair is on the wiki |
| `haemolacria+monstros-lung` | Haemolacria, Monstro's Lung | A | Corrected | The barrage is 8 tears (4/7 of 14), not 4-7; "screen-filling" had no source |
| `haemolacria+proptosis` | Haemolacria, Proptosis | B | Confirmed | The pair is on the wiki |
| `haemolacria+trisagion` | Haemolacria, Trisagion | B | Confirmed | The pair is on the wiki |
| `chocolate-milk+trisagion` | Trisagion, Chocolate Milk | A | Corrected | "Cut through entire rooms" had no source |
| `mysterious-liquid+trisagion` | Trisagion, Mysterious Liquid | B | Confirmed | The pair is on the wiki |
| `my-reflection+trisagion` | Trisagion, My Reflection | B | Confirmed | The pair is on the wiki |
| `pop+trisagion` | Trisagion, Pop! | B | Confirmed | The pair is on the wiki |
| `proptosis+trisagion` | Trisagion, Proptosis | A | Confirmed | The pair is on the wiki |
| `crickets-body+trisagion` | Trisagion, Cricket's Body | B | Confirmed | The pair is on the wiki |
| `jacobs-ladder+trisagion` | Trisagion, Jacob's Ladder | B | Corrected | Sparks come from each damage tick, not all along the beam's path |
| `mucormycosis+trisagion` | Trisagion, Mucormycosis | B | Confirmed | The pair is on the wiki |
| `the-ludovico-technique+trisagion` | Trisagion, The Ludovico Technique | B | Confirmed | The pair is on the wiki |
| `explosivo+soy-milk` | Soy Milk, Explosivo | A | Confirmed | The pair is on the wiki |
| `head-of-the-keeper+soy-milk` | Soy Milk, Head of the Keeper | B | Corrected | The 5% chance per hit does not rise, there are just more hits; "every room" had no source |
| `soy-milk+the-mulligan` | Soy Milk, The Mulligan | A | Corrected | Guppy is a transformation neither item gives, so it came out |
| `mysterious-liquid+soy-milk` | Soy Milk, Mysterious Liquid | B | Corrected | "Fills rooms" had no source; the creep is small and short-lived |
| `pisces+soy-milk` | Soy Milk, Pisces | B | Confirmed | The pair is on the wiki |
| `c-section+compound-fracture` | C Section, Compound Fracture | B | Confirmed | The pair is on the wiki |
| `c-section+crickets-body` | C Section, Cricket's Body | B | Corrected | The four tears come when a fetus lands, not on enemy contact |
| `c-section+dr-fetus` | C Section, Dr. Fetus | A | Corrected | The bomb uses Dr. Fetus' formula on half the fetus' damage; added no tears down |
| `c-section+jacobs-ladder` | C Section, Jacob's Ladder | B | Confirmed | The pair is on the wiki |
| `c-section+polyphemus` | C Section, Polyphemus | A | Corrected | The +5 is a damage bonus, not one per fetus |
| `c-section+technology` | C Section, Technology | A | Confirmed | The pair is on the wiki |
| `lost-contact+polyphemus` | Polyphemus, Lost Contact | B | Confirmed | The pair is on the wiki |
| `compound-fracture+godhead` | Godhead, Compound Fracture | A | Confirmed | The pair is on the wiki |
| `crickets-body+godhead` | Godhead, Cricket's Body | A | Confirmed | The pair is on the wiki |
| `godhead+the-parasite` | Godhead, The Parasite | A | Corrected | "Perpendicular" splits had no source for tears |
| `glass-cannon+godhead` | Godhead, Glass Cannon | B | Confirmed | The pair is on the wiki |
| `flat-stone+monstros-lung` | Monstro's Lung, Flat Stone | B | Confirmed | The pair is on the wiki |
| `monstros-lung+my-reflection` | Monstro's Lung, My Reflection | B | Confirmed | The pair is on the wiki |
| `monstros-lung+tractor-beam` | Monstro's Lung, Tractor Beam | B | Corrected | The page says more tears hit a target, not the entire burst |
| `blood-clot+monstros-lung` | Monstro's Lung, Blood Clot | B | Corrected | The 50% chance per tear is marked a+, so it holds in Repentance, not only Afterbirth+ |
| `immaculate-heart+monstros-lung` | Monstro's Lung, Immaculate Heart | A | Corrected | "Orbital shield" had no source; the orbiting tears are not said to block shots |
| `lokis-horns+monstros-lung` | Monstro's Lung, Loki's Horns | A | Corrected | This is Repentance (marked r), not Repentance+ only; added the luck formula |
| `moms-eye+monstros-lung` | Monstro's Lung, Mom's Eye | B | Corrected | This is Repentance (marked r), not Repentance+; added the chance |
| `almond-milk+monstros-lung` | Monstro's Lung, Almond Milk | A | Confirmed | The pair is on the wiki |
| `rubber-cement+technology` | Technology, Rubber Cement | B | Corrected | The second beam does half damage; "once" and "doubles coverage" had no source |
| `continuum+technology` | Technology, Continuum | B | Corrected | This is Repentance (marked r), not Repentance+; "through any wall" had no source |
| `eye-of-the-occult+technology` | Technology, Eye of the Occult | B | Corrected | Control is not precise: the beam bends toward the crosshair rather than aiming at it |
| `a-lump-of-coal+continuum` | Continuum, A Lump of Coal | A | Corrected | "Travel nearly endlessly" had no source; added the bonus per tile |
| `polyphemus+toxic-shock` | Toxic Shock, Polyphemus | A | Corrected | "Nearly all non-boss enemies" had no source; added the poison ticks |
| `gnawed-leaf+sacrificial-dagger` | Gnawed Leaf, Sacrificial Dagger | A | Corrected | "One of the best AFK combos" made sourced: Gnawed Leaf's page ranks Dagger above most orbitals |
| `dull-razor+gnawed-leaf` | Gnawed Leaf, Dull Razor | - | Removed | Removed: Gnawed Leaf is not an on-hit item, so the combo needs a third item such as Bloody Lust |
| `box-of-friends+twisted-pair` | Twisted Pair, Box of Friends | A | Corrected | One use doubles the pair for the room, not four times; they float beside Isaac, not orbit |
| `tractor-beam+twisted-pair` | Twisted Pair, Tractor Beam | B | Corrected | "Devastating" had no source; each familiar tear deals 0.375x damage |
| `bobs-rotten-head+godhead` | Godhead, Bob's Rotten Head | B | Confirmed | The pair is on the wiki |
| `explosivo+godhead` | Godhead, Explosivo | B | Confirmed | The pair is on the wiki |
| `godhead+mucormycosis` | Godhead, Mucormycosis | B | Confirmed | The pair is on the wiki |
| `crickets-body+technology` | Technology, Cricket's Body | B | Corrected | This works in Repentance (marked r), not only Repentance+ |
| `technology+the-parasite` | Technology, The Parasite | B | Corrected | This works in Repentance (marked r), not only Repentance+; the split beams deal full damage |
