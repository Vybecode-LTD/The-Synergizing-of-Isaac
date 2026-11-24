import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Tag } from "../components/Badges";
import { Breadcrumb, PageHead } from "../components/Browse";
import { Icon } from "../components/Icon";
import { Portrait, Sprite } from "../components/Sprite";
import { SynergyCard } from "../components/SynergyCard";
import { gameData } from "../engine/data";
import { synergiesFor } from "../engine/synergy";
import type { Character } from "../engine/types";
import { useBuildStore } from "../hooks/BuildStore";
import { usePage } from "../hooks/usePage";
import { pageContent } from "../seo";
import { NotFoundPage } from "./NotFoundPage";

function CharacterGrid({ title, list }: { title: string; list: Character[] }) {
  return (
    <section className="results__section" aria-label={title}>
      <h2 className="results__title">{title}</h2>
      <ul className="tile-grid" role="list">
        {list.map((c) => (
          <li key={c.slug}>
            <Link className="tile" to={`/characters/${c.slug}`}>
              <Portrait slug={c.slug} />
              <span className="tile__name">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CharactersPage() {
  const page = usePage();
  return (
    <div className="page">
      <PageHead title={page.h1} lede={page.lede} />
      <CharacterGrid title="Characters" list={gameData.characters.filter((c) => !c.tainted)} />
      <CharacterGrid title="Tainted" list={gameData.characters.filter((c) => c.tainted)} />
    </div>
  );
}

export function CharacterPage() {
  const { slug = "" } = useParams();
  const character = gameData.characterBySlug.get(slug);
  const { build, setBuild } = useBuildStore();
  const navigate = useNavigate();
  const synergies = useMemo(
    () => (character ? synergiesFor("character", character.slug, gameData.synergies) : []),
    [character],
  );
  const page = usePage();
  if (!character) return <NotFoundPage what="character" />;

  const starting = [
    ...(character.startingItems ?? []),
    ...(character.pocketActive !== undefined ? [character.pocketActive] : []),
  ].map((id) => gameData.itemById.get(id)!);
  const playing = build.character === character.slug;

  return (
    <div className="page">
      <Breadcrumb to="/characters" label="Characters" current={character.name} />
      <section className="entity">
        <div className="entity__art">
          <Portrait slug={character.slug} size="lg" />
        </div>
        <div className="entity__body">
          <h1 className="page-head__title">{character.name}</h1>
          <div className="entity__meta">
            <Tag>{character.tainted ? "Tainted character" : "Character"}</Tag>
            {character.gameName && <span className="entity__aka">Shown in the game as {character.gameName}</span>}
          </div>
          <dl className="facts">
            <div className="facts__row">
              <dt className="facts__label">Starts with</dt>
              <dd className="facts__value">
                {starting.length === 0 ? (
                  pageContent.copy.noStartingItems
                ) : (
                  <ul className="inline-items" role="list">
                    {starting.map((item) => (
                      <li key={item.id}>
                        <Link className="inline-item" to={`/items/${item.slug}`}>
                          <Sprite kind="item" id={item.id} />
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
          <p className="entity__note">{pageContent.copy.startingItemsNote}</p>
          <div className="entity__actions">
            {playing ? (
              <Link className="button" data-variant="primary" to="/">
                You&rsquo;re playing {character.name}: open the builder
                <Icon name="arrow" />
              </Link>
            ) : (
              <button
                type="button"
                className="button"
                data-variant="primary"
                onClick={() => {
                  setBuild({ ...build, character: character.slug });
                  navigate("/");
                }}
              >
                Build as {character.name}
                <Icon name="arrow" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="results__section" aria-labelledby="character-synergies">
        <h2 id="character-synergies" className="results__title">
          {synergies.length === 0
            ? "No character-only synergies written down yet"
            : `${synergies.length} ${synergies.length === 1 ? "synergy" : "synergies"} only ${character.name} gets`}
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
