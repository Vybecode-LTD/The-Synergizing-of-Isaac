import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { RatingBadge } from "../components/Badges";
import { AddSynergyDialog } from "../components/builder/AddSynergyDialog";
import { AiPanel } from "../components/builder/AiPanel";
import { BuildShelf } from "../components/builder/BuildShelf";
import { BuildSummary } from "../components/builder/BuildSummary";
import { CharacterPicker } from "../components/builder/CharacterPicker";
import { Suggestions } from "../components/builder/Suggestions";
import { EntityPicker, type EntityPickerHandle } from "../components/EntityPicker";
import { Icon } from "../components/Icon";
import { Sprite } from "../components/Sprite";
import { SynergyCard } from "../components/SynergyCard";
import {
  MAX_ITEMS,
  MAX_TRINKETS,
  addItem,
  addTrinket,
  builderPath,
  decodeBuild,
  encodeBuild,
  isEmpty,
  removeItem,
  removeTrinket,
} from "../engine/buildCodec";
import { gameData } from "../engine/data";
import {
  awaitingCharacter,
  buildFor,
  findSynergies,
  suggestAdditions,
  tally,
  type PickupKind,
} from "../engine/synergy";
import { EMPTY_BUILD, type Build } from "../engine/types";
import { useBuildStore } from "../hooks/BuildStore";
import { useCustomSynergies } from "../hooks/useCustomSynergies";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../site";

/** Well-known S-tier pairs, offered as one-click starting points on an empty builder. */
const EXAMPLES = gameData.synergies
  .filter((s) => s.rating === "S" && s.itemIds.length === 2 && s.trinketIds.length === 0 && s.characterSlugs.length === 0)
  .slice(0, 4);

export function BuilderPage() {
  usePageMeta(
    undefined,
    `Pick a character, items and trinkets and see every known synergy, what one more pickup would unlock, and an AI read on the build. Unofficial fan tool for ${SITE.game}.`,
  );
  const { build: stored, setBuild } = useBuildStore();
  const [params, setParams] = useSearchParams();
  const urlHasBuild = params.has("c") || params.has("i") || params.has("t");
  const fromUrl = useMemo(() => decodeBuild(params, gameData), [params]);
  const build = urlHasBuild ? fromUrl : stored;

  // A link that carries a build wins over the remembered one.
  useEffect(() => {
    if (urlHasBuild && encodeBuild(fromUrl) !== encodeBuild(stored)) setBuild(fromUrl);
  }, [urlHasBuild, fromUrl, stored, setBuild]);

  // Coming back to a bare "/" with a remembered build: put it in the address bar so it can be shared.
  useEffect(() => {
    if (!urlHasBuild && !isEmpty(stored)) setParams(encodeBuild(stored), { replace: true });
  }, [urlHasBuild, stored, setParams]);

  const update = (next: Build) => {
    setBuild(next);
    setParams(encodeBuild(next), { replace: true });
  };

  const picker = useRef<EntityPickerHandle>(null);
  const [choosingCharacter, setChoosingCharacter] = useState(false);
  const [addingSynergy, setAddingSynergy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { mine, add: addMine, remove: removeMine } = useCustomSynergies();

  // "/" jumps to the search box, as it does on most sites with one.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, select, dialog");
      if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        picker.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const synergies = useMemo(() => [...mine, ...gameData.synergies], [mine]);
  const matched = useMemo(() => findSynergies(build, gameData, synergies), [build, synergies]);
  const suggestions = useMemo(() => suggestAdditions(build, gameData, synergies), [build, synergies]);
  const gated = useMemo(() => awaitingCharacter(build, gameData, synergies), [build, synergies]);
  const counts = tally(matched);
  const pickups = build.items.length + build.trinkets.length;
  const full = build.items.length >= MAX_ITEMS && build.trinkets.length >= MAX_TRINKETS;

  const onPick = (kind: PickupKind, id: number) => update(kind === "item" ? addItem(build, id) : addTrinket(build, id));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${builderPath(build)}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="builder">
      <section className="builder__build" aria-labelledby="build-title">
        <header className="builder__intro">
          <h1 id="build-title" className="builder__title">
            What are you holding?
          </h1>
          <p className="builder__lede">Add your items and trinkets. Synergies show up as you go.</p>
        </header>

        <EntityPicker
          ref={picker}
          label="Add an item or trinket"
          placeholder={full ? "Build is full" : "Add an item or trinket…"}
          taken={{ items: build.items, trinkets: build.trinkets }}
          onPick={onPick}
        />

        <BuildShelf
          build={build}
          onRemoveItem={(id) => update(removeItem(build, id))}
          onRemoveTrinket={(id) => update(removeTrinket(build, id))}
          onChooseCharacter={() => setChoosingCharacter(true)}
        />

        <BuildSummary build={build} />

        {!isEmpty(build) && (
          <div className="builder__actions">
            <button type="button" className="button" data-size="sm" onClick={copyLink}>
              <Icon name={copied ? "check" : "link"} />
              {copied ? "Link copied" : "Copy link to this build"}
            </button>
            <button type="button" className="button" data-variant="quiet" data-size="sm" onClick={() => update(EMPTY_BUILD)}>
              Clear all
            </button>
          </div>
        )}
        <p className="visually-hidden" role="status">
          {copied ? "Link copied to the clipboard" : ""}
        </p>
      </section>

      <div className="builder__results">
        {pickups === 0 && !build.character ? (
          <section className="empty" aria-labelledby="empty-title">
            <h2 id="empty-title" className="results__title">
              Start with what&rsquo;s in your run
            </h2>
            <p className="results__lede">
              Type an item&rsquo;s name in the box, or open one of these to see how it works:
            </p>
            <ul className="examples" role="list">
              {EXAMPLES.map((s) => (
                <li key={s.id}>
                  <Link className="example" to={builderPath(buildFor(s))}>
                    <RatingBadge rating={s.rating} size="sm" />
                    <span className="example__sprites">
                      {s.itemIds.map((id) => (
                        <Sprite key={id} kind="item" id={id} />
                      ))}
                    </span>
                    <span className="example__name">
                      {s.itemIds.map((id) => gameData.itemById.get(id)!.name).join(" + ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="results__lede">
              {gameData.items.length} items, {gameData.trinkets.length} trinkets, {gameData.characters.length}{" "}
              characters and {gameData.synergies.length} hand-written synergies.{" "}
              <Link className="text-link" to="/synergies">
                Browse them all
              </Link>
            </p>
          </section>
        ) : (
          <>
            <section className="results__section" aria-labelledby="synergies-title">
              <header className="results__header">
                <h2 id="synergies-title" className="results__title">
                  {matched.length === 0
                    ? "No known synergy yet"
                    : `${matched.length} ${matched.length === 1 ? "synergy" : "synergies"}`}
                </h2>
                {counts.length > 0 && (
                  <ul className="tally" role="list" aria-label="By rating">
                    {counts.map((t) => (
                      <li key={t.rating} className="tally__item">
                        <RatingBadge rating={t.rating} size="sm" />
                        <span>&times;{t.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </header>
              <p className="visually-hidden" role="status">
                {matched.length} {matched.length === 1 ? "synergy" : "synergies"} for this build
              </p>

              {matched.length === 0 && (
                <p className="results__lede">
                  {pickups < 2 && gated.length === 0
                    ? "Most synergies take two items. Add another and they’ll appear here."
                    : "Nothing in the list covers this combination. That doesn’t mean the items do nothing together: ask the AI below, or write the interaction down yourself."}
                </p>
              )}

              <div className="results__cards">
                {matched.map((s) => (
                  <SynergyCard
                    key={s.id}
                    synergy={s}
                    openable={false}
                    actions={
                      s.custom ? (
                        <button
                          type="button"
                          className="button"
                          data-variant="quiet"
                          data-size="sm"
                          onClick={() => removeMine(s.id)}
                        >
                          <Icon name="trash" />
                          Delete
                        </button>
                      ) : undefined
                    }
                  />
                ))}
              </div>

              {gated.length > 0 && (
                <div className="notice">
                  <p>
                    {gated.length === 1 ? "1 more synergy depends" : `${gated.length} more synergies depend`} on who
                    you&rsquo;re playing.
                  </p>
                  <button type="button" className="button" data-size="sm" onClick={() => setChoosingCharacter(true)}>
                    Choose character
                  </button>
                </div>
              )}
            </section>

            <Suggestions suggestions={suggestions} onAdd={onPick} />

            {pickups > 0 && <AiPanel build={build} />}

            {pickups > 0 && (
              <div className="notice" data-tone="quiet">
                <p>Know an interaction that&rsquo;s missing for this build?</p>
                <button type="button" className="button" data-size="sm" onClick={() => setAddingSynergy(true)}>
                  <Icon name="plus" />
                  Add your own synergy
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CharacterPicker
        open={choosingCharacter}
        selected={build.character}
        onSelect={(slug) => {
          update({ ...build, character: slug });
          setChoosingCharacter(false);
        }}
        onClose={() => setChoosingCharacter(false)}
      />
      <AddSynergyDialog open={addingSynergy} build={build} onSave={addMine} onClose={() => setAddingSynergy(false)} />
    </div>
  );
}
