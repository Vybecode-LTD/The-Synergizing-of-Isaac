import { Link } from "react-router";
import { gameData } from "../../engine/data";
import type { Build } from "../../engine/types";
import { Icon } from "../Icon";
import { Portrait, Sprite } from "../Sprite";

interface BuildShelfProps {
  build: Build;
  onRemoveItem: (id: number) => void;
  onRemoveTrinket: (id: number) => void;
  onChooseCharacter: () => void;
}

/** The build as a row of pedestals: the character first, then every pickup. */
export function BuildShelf({ build, onRemoveItem, onRemoveTrinket, onChooseCharacter }: BuildShelfProps) {
  const character = build.character ? gameData.characterBySlug.get(build.character) : undefined;
  const starting = [
    ...(character?.startingItems ?? []),
    ...(character?.pocketActive !== undefined ? [character.pocketActive] : []),
  ].filter((id) => !build.items.includes(id));

  return (
    <ul className="shelf" role="list" aria-label="Your build">
      <li className="pedestal" data-kind="character">
        <button type="button" className="pedestal__main" onClick={onChooseCharacter}>
          <span className="pedestal__art">
            {character ? (
              <Portrait slug={character.slug} />
            ) : (
              <span className="pedestal__unknown" aria-hidden="true">
                ?
              </span>
            )}
            <span className="pedestal__stone" aria-hidden="true" />
          </span>
          <span className="pedestal__name">{character ? character.name : "Choose character"}</span>
          <span className="pedestal__meta">{character ? "Change" : "Optional"}</span>
        </button>
      </li>

      {starting.map((id) => {
        const item = gameData.itemById.get(id)!;
        return (
          <li key={`start-${id}`} className="pedestal" data-kind="starting">
            <Link className="pedestal__main" to={`/items/${item.slug}`}>
              <span className="pedestal__art">
                <Sprite kind="item" id={id} scale={2} />
                <span className="pedestal__stone" aria-hidden="true" />
              </span>
              <span className="pedestal__name">{item.name}</span>
              <span className="pedestal__meta">Starts with</span>
            </Link>
          </li>
        );
      })}

      {build.items.map((id) => {
        const item = gameData.itemById.get(id)!;
        return (
          <li key={`item-${id}`} className="pedestal" data-kind="item">
            <Link className="pedestal__main" to={`/items/${item.slug}`}>
              <span className="pedestal__art">
                <span className="pedestal__relic">
                  <Sprite kind="item" id={id} scale={2} />
                </span>
                <span className="pedestal__stone" aria-hidden="true" />
              </span>
              <span className="pedestal__name">{item.name}</span>
            </Link>
            <button
              type="button"
              className="icon-button pedestal__remove"
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemoveItem(id)}
            >
              <Icon name="close" />
            </button>
          </li>
        );
      })}

      {build.trinkets.map((id) => {
        const trinket = gameData.trinketById.get(id)!;
        return (
          <li key={`trinket-${id}`} className="pedestal" data-kind="trinket">
            <Link className="pedestal__main" to={`/trinkets/${trinket.slug}`}>
              <span className="pedestal__art">
                <span className="pedestal__relic">
                  <Sprite kind="trinket" id={id} scale={2} />
                </span>
                <span className="pedestal__stone" aria-hidden="true" />
              </span>
              <span className="pedestal__name">{trinket.name}</span>
              <span className="pedestal__meta">Trinket</span>
            </Link>
            <button
              type="button"
              className="icon-button pedestal__remove"
              aria-label={`Remove ${trinket.name}`}
              onClick={() => onRemoveTrinket(id)}
            >
              <Icon name="close" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
