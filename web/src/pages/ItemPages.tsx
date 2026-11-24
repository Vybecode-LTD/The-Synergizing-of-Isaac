import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { QualityPips, StatChips, Tag } from "../components/Badges";
import { Breadcrumb, PageHead, SearchField, ToggleGroup, toggled } from "../components/Browse";
import { Icon } from "../components/Icon";
import { Sprite } from "../components/Sprite";
import { SynergyCard } from "../components/SynergyCard";
import { MAX_ITEMS, addItem } from "../engine/buildCodec";
import { gameData } from "../engine/data";
import { matchScore } from "../engine/search";
import { TRANSFORMATION_NAMES, poolNames, statLines } from "../engine/summary";
import { synergiesFor } from "../engine/synergy";
import { useBuildStore } from "../hooks/BuildStore";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../site";
import { NotFoundPage } from "./NotFoundPage";

const QUALITIES = [4, 3, 2, 1, 0].map((q) => ({ value: q, label: `Quality ${q}` }));
const TYPES = [
  { value: "passive" as const, label: "Passive" },
  { value: "active" as const, label: "Active" },
];

export function ItemsPage() {
  usePageMeta("Items", `All ${gameData.items.length} items in ${SITE.game}, with quality, effects and every known synergy.`);
  const [query, setQuery] = useState("");
  const [qualities, setQualities] = useState<ReadonlySet<number>>(new Set());
  const [types, setTypes] = useState<ReadonlySet<"active" | "passive">>(new Set());

  const shown = useMemo(
    () =>
      gameData.items.filter(
        (item) =>
          (qualities.size === 0 || qualities.has(item.quality)) &&
          (types.size === 0 || types.has(item.type)) &&
          (query.trim() === "" || matchScore(query, item.name) > 0),
      ),
    [query, qualities, types],
  );

  return (
    <div className="page">
      <PageHead title="Items" lede="Every item in the game. Open one to see what it does and what it combines with." />
      <div className="filters">
        <SearchField label="Filter items by name" placeholder="Filter by name…" value={query} onChange={setQuery} />
        <ToggleGroup
          label="Quality"
          options={QUALITIES}
          selected={qualities}
          onToggle={(q) => setQualities(toggled(qualities, q))}
        />
        <ToggleGroup label="Type" options={TYPES} selected={types} onToggle={(t) => setTypes(toggled(types, t))} />
      </div>
      <p className="count" role="status">
        {shown.length === gameData.items.length
          ? `${shown.length} items`
          : `${shown.length} of ${gameData.items.length} items`}
      </p>
      {shown.length === 0 ? (
        <p className="empty-note">No item matches those filters. Clear one to see more.</p>
      ) : (
        <ul className="tile-grid" role="list">
          {shown.map((item) => (
            <li key={item.id}>
              <Link className="tile" to={`/items/${item.slug}`}>
                <Sprite kind="item" id={item.id} scale={2} />
                <span className="tile__name">{item.name}</span>
                <QualityPips quality={item.quality} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ItemPage() {
  const { slug = "" } = useParams();
  const item = gameData.itemBySlug.get(slug);
  const { build, setBuild } = useBuildStore();
  const navigate = useNavigate();
  const synergies = useMemo(() => (item ? synergiesFor("item", item.id, gameData.synergies) : []), [item]);
  usePageMeta(
    item ? `${item.name} synergies` : "Item not found",
    item ? `${item.name} in ${SITE.game}: ${item.effect || "stat item"}. ${synergies.length} known synergies.` : undefined,
  );
  if (!item) return <NotFoundPage what="item" />;

  const inBuild = build.items.includes(item.id);
  const buildFull = build.items.length >= MAX_ITEMS;
  const pools = poolNames(item.pools);
  const transformations = (item.transformations ?? []).map((t) => TRANSFORMATION_NAMES[t] ?? t);

  return (
    <div className="page">
      <Breadcrumb to="/items" label="Items" current={item.name} />
      <section className="entity">
        <div className="entity__art">
          <Sprite kind="item" id={item.id} scale={4} />
        </div>
        <div className="entity__body">
          <h1 className="page-head__title">{item.name}</h1>
          <div className="entity__meta">
            <span className="entity__quality">
              <QualityPips quality={item.quality} />
              <span>Quality {item.quality}</span>
            </span>
            <Tag>{item.type === "active" ? "Active item" : "Passive item"}</Tag>
            <Tag>{item.dlc}</Tag>
          </div>
          <p className="entity__effect">
            {item.effect || "A stat item: it changes your numbers and nothing else."}
          </p>
          <StatChips lines={statLines(item.stats)} />
          <dl className="facts">
            {transformations.length > 0 && (
              <div className="facts__row">
                <dt className="facts__label">Counts toward</dt>
                <dd className="facts__value">{transformations.join(", ")}</dd>
              </div>
            )}
            {pools.length > 0 && (
              <div className="facts__row">
                <dt className="facts__label">Found in</dt>
                <dd className="facts__value">{pools.join(", ")}</dd>
              </div>
            )}
          </dl>
          <div className="entity__actions">
            {inBuild ? (
              <Link className="button" data-variant="primary" to="/">
                In your build: open the builder
                <Icon name="arrow" />
              </Link>
            ) : (
              <button
                type="button"
                className="button"
                data-variant="primary"
                disabled={buildFull}
                onClick={() => {
                  setBuild(addItem(build, item.id));
                  navigate("/");
                }}
              >
                <Icon name="plus" />
                {buildFull ? "Your build is full" : "Add to my build"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="results__section" aria-labelledby="item-synergies">
        <h2 id="item-synergies" className="results__title">
          {synergies.length === 0
            ? "No synergies written down yet"
            : `${synergies.length} ${synergies.length === 1 ? "synergy" : "synergies"} with ${item.name}`}
        </h2>
        {synergies.length === 0 ? (
          <p className="results__lede">
            The list has nothing for {item.name} yet. That is a gap in the list, not proof it combines with nothing.
          </p>
        ) : (
          <div className="results__cards">
            {synergies.map((s) => (
              <SynergyCard key={s.id} synergy={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
