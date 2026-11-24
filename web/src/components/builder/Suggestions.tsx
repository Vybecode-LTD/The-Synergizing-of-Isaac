import { useState } from "react";
import { gameData } from "../../engine/data";
import type { PickupKind, Suggestion } from "../../engine/synergy";
import type { Synergy } from "../../engine/types";
import { RatingBadge } from "../Badges";
import { Icon } from "../Icon";
import { Sprite } from "../Sprite";

const FIRST = 6;

function nameOf(kind: PickupKind, id: number): string {
  return (kind === "item" ? gameData.itemById.get(id)?.name : gameData.trinketById.get(id)?.name) ?? "";
}

/** "with Brimstone and Tech X": the other pieces of the synergy this pickup completes. */
function partners(synergy: Synergy, kind: PickupKind, id: number): string {
  const names = [
    ...synergy.itemIds.filter((i) => !(kind === "item" && i === id)).map((i) => nameOf("item", i)),
    ...synergy.trinketIds.filter((t) => !(kind === "trinket" && t === id)).map((t) => nameOf("trinket", t)),
  ];
  if (names.length === 0) return "for this character";
  return `with ${new Intl.ListFormat("en", { type: "conjunction" }).format(names)}`;
}

interface SuggestionsProps {
  suggestions: Suggestion[];
  onAdd: (kind: PickupKind, id: number) => void;
}

/** Pickups that would complete a known synergy, strongest first. */
export function Suggestions({ suggestions, onAdd }: SuggestionsProps) {
  const [all, setAll] = useState(false);
  if (suggestions.length === 0) return null;
  const shown = all ? suggestions : suggestions.slice(0, FIRST);

  return (
    <section className="results__section" aria-labelledby="suggestions-title">
      <header className="results__header">
        <h2 id="suggestions-title" className="results__title">
          One pickup away
        </h2>
        <p className="results__lede">If you see one of these, it completes a synergy with what you have.</p>
      </header>
      <ul className="suggestions" role="list">
        {shown.map((s) => {
          const name = nameOf(s.kind, s.id);
          const first = s.completes[0]!;
          const more = s.completes.length - 1;
          return (
            <li key={`${s.kind}-${s.id}`} className="suggestion">
              <RatingBadge rating={s.best} size="sm" />
              <Sprite kind={s.kind} id={s.id} />
              <span className="suggestion__text">
                <span className="suggestion__name">{name}</span>
                <span className="suggestion__why">
                  {partners(first, s.kind, s.id)}
                  {more > 0 ? `, and ${more} more` : ""}
                </span>
              </span>
              <button
                type="button"
                className="button"
                data-size="sm"
                aria-label={`Add ${name} to the build`}
                onClick={() => onAdd(s.kind, s.id)}
              >
                <Icon name="plus" />
                Add
              </button>
            </li>
          );
        })}
      </ul>
      {suggestions.length > FIRST && (
        <div>
          <button type="button" className="button" data-size="sm" aria-expanded={all} onClick={() => setAll(!all)}>
            {all ? "Show fewer" : `Show all ${suggestions.length}`}
          </button>
        </div>
      )}
    </section>
  );
}
