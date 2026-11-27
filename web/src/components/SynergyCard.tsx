import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";
import { builderPath } from "../engine/buildCodec";
import { gameData } from "../engine/data";
import { buildFor } from "../engine/synergy";
import type { Synergy } from "../engine/types";
import { RatingBadge, Tag } from "./Badges";
import { Portrait, Sprite } from "./Sprite";

interface SynergyCardProps {
  synergy: Synergy;
  /** Show an "Open in builder" link. Off inside the builder itself. */
  openable?: boolean;
  /** Extra controls for the card's footer, such as "Delete" on a visitor's own synergy. */
  actions?: ReactNode;
}

/** One known interaction: its rating, what it takes, and what happens. */
export function SynergyCard({ synergy, openable = true, actions }: SynergyCardProps) {
  const items = synergy.itemIds.map((id) => gameData.itemById.get(id)!);
  const trinkets = synergy.trinketIds.map((id) => gameData.trinketById.get(id)!);
  const characters = synergy.characterSlugs.map((slug) => gameData.characterBySlug.get(slug)!);
  const pieces = [
    ...items.map((item) => ({ key: `i${item.id}`, to: `/items/${item.slug}`, name: item.name, kind: "item" as const, id: item.id })),
    ...trinkets.map((t) => ({ key: `t${t.id}`, to: `/trinkets/${t.slug}`, name: t.name, kind: "trinket" as const, id: t.id })),
  ];

  return (
    <article className="synergy-card" data-rating={synergy.rating}>
      <RatingBadge rating={synergy.rating} />
      <div className="synergy-card__body">
        <h3 className="synergy-card__recipe">
          {pieces.map((piece, index) => (
            <Fragment key={piece.key}>
              {index > 0 && (
                <span className="synergy-card__plus" aria-hidden="true">
                  +
                </span>
              )}
              <Link className="synergy-card__piece" to={piece.to}>
                <Sprite kind={piece.kind} id={piece.id} />
                <span>{piece.name}</span>
              </Link>
            </Fragment>
          ))}
        </h3>
        {characters.length > 0 && (
          <p className="synergy-card__characters">
            <span>as</span>
            {characters.map((c) => (
              <Link key={c.slug} className="synergy-card__character" to={`/characters/${c.slug}`}>
                <Portrait slug={c.slug} size="sm" />
                <span>{c.name}</span>
              </Link>
            ))}
          </p>
        )}
        <p className="synergy-card__text">{synergy.description}</p>
        {(openable || actions || synergy.custom || synergy.community) && (
          <div className="synergy-card__footer">
            {synergy.custom && <Tag tone="accent">Yours</Tag>}
            {synergy.community && <Tag>Community</Tag>}
            {openable && (
              <Link className="text-link" to={builderPath(buildFor(synergy))}>
                Open in builder
              </Link>
            )}
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}
