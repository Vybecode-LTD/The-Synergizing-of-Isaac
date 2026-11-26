import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { StatChips, Tag } from "../components/Badges";
import { Breadcrumb, PageHead, SearchField } from "../components/Browse";
import { Icon } from "../components/Icon";
import { Sprite } from "../components/Sprite";
import { SynergyCard } from "../components/SynergyCard";
import { MAX_TRINKETS, addTrinket } from "../engine/buildCodec";
import { gameData } from "../engine/data";
import { matchScore } from "../engine/search";
import { statLines, transformationNames } from "../engine/summary";
import { synergiesFor } from "../engine/synergy";
import { useBuildStore } from "../hooks/BuildStore";
import { usePage } from "../hooks/usePage";
import { pageContent } from "../seo";
import { NotFoundPage } from "./NotFoundPage";

export function TrinketsPage() {
  const page = usePage();
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () => gameData.trinkets.filter((t) => query.trim() === "" || matchScore(query, t.name) > 0),
    [query],
  );

  return (
    <div className="page">
      <PageHead title={page.h1} lede={page.lede} />
      <div className="filters">
        <SearchField label="Filter trinkets by name" placeholder="Filter by name…" value={query} onChange={setQuery} />
      </div>
      <p className="count" role="status">
        {shown.length === gameData.trinkets.length
          ? `${shown.length} trinkets`
          : `${shown.length} of ${gameData.trinkets.length} trinkets`}
      </p>
      {shown.length === 0 ? (
        <p className="empty-note">No trinket has that in its name.</p>
      ) : (
        <ul className="tile-grid" role="list">
          {shown.map((trinket) => (
            <li key={trinket.id}>
              <Link className="tile" to={`/trinkets/${trinket.slug}`}>
                <Sprite kind="trinket" id={trinket.id} scale={2} />
                <span className="tile__name">{trinket.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TrinketPage() {
  const { slug = "" } = useParams();
  const trinket = gameData.trinketBySlug.get(slug);
  const { build, setBuild } = useBuildStore();
  const navigate = useNavigate();
  const synergies = useMemo(() => (trinket ? synergiesFor("trinket", trinket.id, gameData.synergies) : []), [trinket]);
  const page = usePage();
  if (!trinket) return <NotFoundPage what="trinket" />;

  const inBuild = build.trinkets.includes(trinket.id);
  const buildFull = build.trinkets.length >= MAX_TRINKETS;
  const transformations = transformationNames(
    trinket,
    gameData.transformations,
    pageContent.copy.repentancePlusOnly,
  );

  return (
    <div className="page">
      <Breadcrumb to="/trinkets" label="Trinkets" current={trinket.name} />
      <section className="entity">
        <div className="entity__art">
          <Sprite kind="trinket" id={trinket.id} scale={4} />
        </div>
        <div className="entity__body">
          <h1 className="page-head__title">{trinket.name}</h1>
          <div className="entity__meta">
            <Tag>Trinket</Tag>
            <Tag>{trinket.dlc}</Tag>
          </div>
          <p className="entity__effect">
            {trinket.effect || `${pageContent.fallbacks.trinketEffect}.`}
          </p>
          <StatChips lines={statLines(trinket.stats)} />
          {transformations && (
            <dl className="facts">
              <div className="facts__row">
                <dt className="facts__label">{pageContent.copy.countsToward}</dt>
                <dd className="facts__value">{transformations}</dd>
              </div>
            </dl>
          )}
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
                  setBuild(addTrinket(build, trinket.id));
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

      <section className="results__section" aria-labelledby="trinket-synergies">
        <h2 id="trinket-synergies" className="results__title">
          {synergies.length === 0
            ? "No synergies written down yet"
            : `${synergies.length} ${synergies.length === 1 ? "synergy" : "synergies"} with ${trinket.name}`}
        </h2>
        <p className="results__lede">{page.answer}</p>
        <div className="results__cards">
          {synergies.map((s) => (
            <SynergyCard key={s.id} synergy={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
