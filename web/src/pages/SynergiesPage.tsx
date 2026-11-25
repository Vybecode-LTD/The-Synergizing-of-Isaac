import { useMemo, useState } from "react";
import { PageHead, SearchField, ToggleGroup, toggled } from "../components/Browse";
import { SynergyCard } from "../components/SynergyCard";
import { gameData } from "../engine/data";
import { normalize } from "../engine/search";
import { compareRating } from "../engine/synergy";
import { RATINGS, type Rating, type Synergy } from "../engine/types";
import { useCustomSynergies } from "../hooks/useCustomSynergies";
import { usePage } from "../hooks/usePage";

const PAGE = 40;
const RATING_OPTIONS = RATINGS.map((r) => ({ value: r, label: `${r} tier` }));

/** Everything a synergy can be found by: the names of its pieces and its text. */
function haystack(s: Synergy): string {
  return normalize(
    [
      ...s.itemIds.map((id) => gameData.itemById.get(id)!.name),
      ...s.trinketIds.map((id) => gameData.trinketById.get(id)!.name),
      ...s.characterSlugs.map((slug) => gameData.characterBySlug.get(slug)!.name),
      s.description,
    ].join(" "),
  );
}

export function SynergiesPage() {
  const page = usePage();
  const { mine } = useCustomSynergies();
  const [query, setQuery] = useState("");
  const [ratings, setRatings] = useState<ReadonlySet<Rating>>(new Set());
  const [limit, setLimit] = useState(PAGE);

  const indexed = useMemo(
    () =>
      [...mine, ...gameData.synergies]
        .map((synergy) => ({ synergy, text: haystack(synergy) }))
        .sort((a, b) => compareRating(a.synergy.rating, b.synergy.rating)),
    [mine],
  );

  const shown = useMemo(() => {
    const words = normalize(query).split(" ").filter(Boolean);
    return indexed
      .filter(
        ({ synergy, text }) =>
          (ratings.size === 0 || ratings.has(synergy.rating)) && words.every((word) => text.includes(word)),
      )
      .map(({ synergy }) => synergy);
  }, [indexed, query, ratings]);

  const total = indexed.length;

  return (
    <div className="page">
      <PageHead title={page.h1} lede={page.lede} />
      <div className="filters">
        <SearchField
          label="Search synergies"
          placeholder="Search by item, character or effect…"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setLimit(PAGE);
          }}
        />
        <ToggleGroup
          label="Rating"
          options={RATING_OPTIONS}
          selected={ratings}
          onToggle={(r) => {
            setRatings(toggled(ratings, r));
            setLimit(PAGE);
          }}
        />
      </div>
      <p className="count" role="status">
        {shown.length === total ? `${total} synergies` : `${shown.length} of ${total} synergies`}
      </p>
      {shown.length === 0 ? (
        <p className="empty-note">Nothing in the list matches. Try one item name on its own.</p>
      ) : (
        <div className="results__cards">
          {shown.slice(0, limit).map((s) => (
            <SynergyCard key={s.id} synergy={s} />
          ))}
        </div>
      )}
      {shown.length > limit && (
        <div>
          <button type="button" className="button" onClick={() => setLimit(limit + PAGE)}>
            Show {Math.min(PAGE, shown.length - limit)} more
          </button>
        </div>
      )}
    </div>
  );
}
