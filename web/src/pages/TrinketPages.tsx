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
import { statLines } from "../engine/summary";
import { synergiesFor } from "../engine/synergy";
import { useBuildStore } from "../hooks/BuildStore";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../site";
import { NotFoundPage } from "./NotFoundPage";

export function TrinketsPage() {
  usePageMeta("Trinkets", `All ${gameData.trinkets.length} trinkets in ${SITE.game}, with effects and known synergies.`);
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () => gameData.trinkets.filter((t) => query.trim() === "" || matchScore(query, t.name) > 0),
    [query],
  );

  return (
    <div className="page">
      <PageHead title="Trinkets" lede="Every trinket in the game. Open one to see what it does and what it combines with." />
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
  usePageMeta(
    trinket ? `${trinket.name} synergies` : "Trinket not found",
    trinket
      ? `${trinket.name}, a trinket in ${SITE.game}: ${trinket.effect || "stat trinket"}. ${synergies.length} known synergies.`
      : undefined,
  );
  if (!trinket) return <NotFoundPage what="trinket" />;

  const inBuild = build.trinkets.includes(trinket.id);
  const buildFull = build.trinkets.length >= MAX_TRINKETS;

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
            {trinket.effect || "A stat trinket: it changes your numbers and nothing else."}
          </p>
          <StatChips lines={statLines(trinket.stats)} />
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
        {synergies.length === 0 ? (
          <p className="results__lede">
            The list has nothing for {trinket.name} yet. That is a gap in the list, not proof it combines with nothing.
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
