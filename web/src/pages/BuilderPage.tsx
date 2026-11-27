import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "../api/http";
import { canSubmit, submitSynergy } from "../api/submissions";
import { Link, useLocation, useSearchParams } from "react-router";
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
import { EMPTY_BUILD, type Build, type Synergy } from "../engine/types";
import { useBuildStore } from "../hooks/BuildStore";
import { useCustomSynergies } from "../hooks/useCustomSynergies";
import { usePage } from "../hooks/usePage";
import { fill, pageContent, siteValues } from "../seo";

/** Travels with a bare "/" that means "empty": the builder emptying the build, or the logo going home. */
export const EMPTIED = { emptied: true };

/** Well-known S-tier pairs, offered as one-click starting points on an empty builder. */
const EXAMPLES = gameData.synergies
  .filter((s) => s.rating === "S" && s.itemIds.length === 2 && s.trinketIds.length === 0 && s.characterSlugs.length === 0)
  .slice(0, 4);

export function BuilderPage() {
  const page = usePage();
  const { build: stored, setBuild } = useBuildStore();
  const [params, setParams] = useSearchParams();
  const urlHasBuild = params.has("c") || params.has("i") || params.has("t");
  const fromUrl = useMemo(() => decodeBuild(params, gameData), [params]);
  // A bare "/" means two things. Reached by the Builder link or a first visit, it means "show what I had":
  // the remembered build is shown and put in the address bar so it can be shared. Reached by emptying the
  // build here, or by the logo (home is an empty builder; the owner, 2026-11-26), it means empty, and the
  // navigation state says so. (Deciding this once, when the page mounted, wiped the build when the Builder
  // link was clicked on the builder itself.) Back still returns to the build before.
  const emptied = (useLocation().state as { emptied?: unknown } | null)?.emptied === true;
  const restoring = !urlHasBuild && !emptied && !isEmpty(stored);
  const build = urlHasBuild ? fromUrl : restoring ? stored : EMPTY_BUILD;

  useEffect(() => {
    if (restoring) setParams(encodeBuild(stored), { replace: true });
  }, [restoring, stored, setParams]);

  // Otherwise the address bar is the build. The store only remembers it for other pages and next time.
  // (Writing both at once raced: the address bar updates a beat later and put the old build back.)
  useEffect(() => {
    if (!restoring && encodeBuild(fromUrl) !== encodeBuild(stored)) setBuild(fromUrl);
  }, [restoring, fromUrl, stored, setBuild]);

  const update = (next: Build) =>
    setParams(encodeBuild(next), isEmpty(next) ? { replace: true, state: EMPTIED } : { replace: true });

  const picker = useRef<EntityPickerHandle>(null);
  const [choosingCharacter, setChoosingCharacter] = useState(false);
  const [addingSynergy, setAddingSynergy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { mine, add: addMine, remove: removeMine, markSubmitted } = useCustomSynergies();

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
            {page.h1}
          </h1>
          <p className="builder__lede">{page.lede}</p>
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
              {pageContent.copy.examplesHeading}
            </h2>
            <p className="results__lede">{pageContent.copy.examplesLede}</p>
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
            <h2 className="results__title">{fill(pageContent.intro.heading, siteValues())}</h2>
            <p className="results__lede">{fill(pageContent.intro.text, siteValues())}</p>
            <p className="results__lede">
              <Link className="text-link" to="/synergies">
                {fill(pageContent.copy.browseAll, siteValues())}
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
                        <>
                          <SendMine synergy={s} onSent={() => markSubmitted(s.id)} />
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
                        </>
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

            {pickups > 0 && <AiPanel build={build} onSave={addMine} />}

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

type Sending = { status: "idle" } | { status: "sending" } | { status: "error"; message: string };

/** On a visitor's own synergy: send it to the site's owner, once. */
function SendMine({ synergy, onSent }: { synergy: Synergy; onSent: () => void }) {
  const [sending, setSending] = useState<Sending>({ status: "idle" });
  if (synergy.submitted) {
    return (
      <span className="synergy-card__sent">
        <Icon name="check" />
        Sent for review
      </span>
    );
  }
  if (!canSubmit(synergy.itemIds, synergy.trinketIds, synergy.characterSlugs)) return null;

  const send = async () => {
    setSending({ status: "sending" });
    try {
      await submitSynergy({
        character: synergy.characterSlugs[0] ?? null,
        items: synergy.itemIds,
        trinkets: synergy.trinketIds,
        rating: synergy.rating,
        description: synergy.description,
      });
      onSent();
    } catch (cause) {
      setSending({ status: "error", message: errorMessage(cause, "It couldn't be sent. Try again in a moment.") });
    }
  };

  const busy = sending.status === "sending";
  return (
    <>
      <button
        type="button"
        className="button"
        data-size="sm"
        data-state={busy ? "loading" : undefined}
        aria-disabled={busy}
        onClick={busy ? undefined : send}
      >
        <Icon name="send" />
        {busy ? "Sending…" : "Send to isaac.toys"}
      </button>
      {sending.status === "error" && (
        <span className="field__error" role="alert">
          {sending.message}
        </span>
      )}
    </>
  );
}
