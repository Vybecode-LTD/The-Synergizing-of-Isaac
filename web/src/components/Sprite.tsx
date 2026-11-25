import type { CSSProperties } from "react";
import spriteConfig from "../../sprite-config.json";
import { gameData } from "../engine/data";

interface SpriteProps {
  kind: "item" | "trinket";
  id: number;
  /** Whole multiples of the 32px art, so pixels stay square. */
  scale?: 1 | 2 | 3 | 4;
  /** Leave out when the name is written next to the sprite. */
  label?: string;
}

/** One cell of the item or trinket sheet. Position is the entry's index in its list. */
export function Sprite({ kind, id, scale = 1, label }: SpriteProps) {
  const index = (kind === "item" ? gameData.itemIndex : gameData.trinketIndex).get(id) ?? 0;
  const style = {
    "--sprite-x": index % spriteConfig.columns,
    "--sprite-y": Math.floor(index / spriteConfig.columns),
    "--sprite-columns": spriteConfig.columns,
    "--sprite-scale": scale,
  } as CSSProperties;
  return label ? (
    <span className="sprite" data-kind={kind} style={style} role="img" aria-label={label} />
  ) : (
    <span className="sprite" data-kind={kind} style={style} aria-hidden="true" />
  );
}

interface PortraitProps {
  slug: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

/** A character's portrait. */
export function Portrait({ slug, size = "md", label = "" }: PortraitProps) {
  return (
    <img className="portrait" data-size={size} src={`/sprites/characters/${slug}.png`} alt={label} loading="lazy" />
  );
}
