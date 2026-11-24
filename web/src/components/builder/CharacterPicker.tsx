import { gameData } from "../../engine/data";
import type { Character } from "../../engine/types";
import { Dialog } from "../Dialog";
import { Portrait } from "../Sprite";

interface CharacterPickerProps {
  open: boolean;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  onClose: () => void;
}

/** All 34 characters as portraits, regular and tainted, plus "no character". */
export function CharacterPicker({ open, selected, onSelect, onClose }: CharacterPickerProps) {
  const regular = gameData.characters.filter((c) => !c.tainted);
  const tainted = gameData.characters.filter((c) => c.tainted);

  const group = (title: string, list: Character[]) => (
    <section className="character-grid__group" aria-label={title}>
      <h3 className="eyebrow">{title}</h3>
      <ul className="character-grid" role="list">
        {list.map((c) => (
          <li key={c.slug}>
            <button
              type="button"
              className="character-option"
              aria-pressed={selected === c.slug}
              onClick={() => onSelect(c.slug)}
            >
              <Portrait slug={c.slug} />
              <span className="character-option__name">{c.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <Dialog open={open} title="Who are you playing?" onClose={onClose}>
      {group("Characters", regular)}
      {group("Tainted", tainted)}
      <div className="dialog__actions">
        <button type="button" className="button" data-variant="quiet" onClick={() => onSelect(null)}>
          No character
        </button>
      </div>
    </Dialog>
  );
}
