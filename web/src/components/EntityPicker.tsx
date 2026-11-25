import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { gameData } from "../engine/data";
import { search } from "../engine/search";
import type { PickupKind } from "../engine/synergy";
import { QualityPips, Tag } from "./Badges";
import { Icon } from "./Icon";
import { Sprite } from "./Sprite";

interface Entry {
  kind: PickupKind;
  id: number;
  name: string;
  effect: string;
  quality?: number;
  weight: number;
}

const ENTRIES: Entry[] = [
  ...gameData.items.map((i) => ({
    kind: "item" as const,
    id: i.id,
    name: i.name,
    effect: i.effect,
    quality: i.quality,
    weight: i.quality + 1,
  })),
  ...gameData.trinkets.map((t) => ({ kind: "trinket" as const, id: t.id, name: t.name, effect: t.effect, weight: 0 })),
];

export interface EntityPickerHandle {
  focus: () => void;
}

interface EntityPickerProps {
  label: string;
  placeholder: string;
  /** Already chosen, so left out of the results. */
  taken: { items: readonly number[]; trinkets: readonly number[] };
  onPick: (kind: PickupKind, id: number) => void;
  ref?: Ref<EntityPickerHandle>;
}

/**
 * Search box for items and trinkets, built to the ARIA combobox pattern:
 * type, arrow through the list, Enter to add, Escape to clear.
 */
export function EntityPicker({ label, placeholder, taken, onPick, ref }: EntityPickerProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

  const results = useMemo(() => {
    const free = ENTRIES.filter((e) => !(e.kind === "item" ? taken.items : taken.trinkets).includes(e.id));
    return search(query, free, 8);
  }, [query, taken.items, taken.trinkets]);

  const showList = open && query.trim().length > 0;
  const current = results[Math.min(active, results.length - 1)];

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, results]);

  const pick = (entry: Entry) => {
    onPick(entry.kind, entry.id);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((n) => (Math.min(n, results.length - 1) + step + results.length) % results.length);
    } else if (event.key === "Enter") {
      if (showList && current) {
        event.preventDefault();
        pick(current);
      }
    } else if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        setQuery("");
      }
      setOpen(false);
    }
  };

  return (
    <div className="picker">
      <label className="visually-hidden" htmlFor={`${listId}-input`}>
        {label}
      </label>
      <div className="picker__field">
        <Icon name="search" />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          className="picker__input"
          type="text"
          role="combobox"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && current ? `${listId}-${current.kind}-${current.id}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        <kbd className="picker__hint" aria-hidden="true">
          /
        </kbd>
      </div>
      <ul ref={listRef} id={listId} className="picker__list" role="listbox" aria-label={label} hidden={!showList}>
        {results.map((entry, index) => (
          <li
            key={`${entry.kind}-${entry.id}`}
            id={`${listId}-${entry.kind}-${entry.id}`}
            className="picker__option"
            role="option"
            aria-selected={entry === current}
            // Keep focus in the input: mousedown would blur it and close the list before the click lands.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(index)}
            onClick={() => pick(entry)}
          >
            <Sprite kind={entry.kind} id={entry.id} />
            <span className="picker__text">
              <span className="picker__name">{entry.name}</span>
              {entry.effect && <span className="picker__effect">{entry.effect}</span>}
            </span>
            {entry.kind === "item" ? <QualityPips quality={entry.quality ?? 0} /> : <Tag>Trinket</Tag>}
          </li>
        ))}
        {results.length === 0 && (
          <li className="picker__empty" role="option" aria-selected="false" aria-disabled="true">
            Nothing called &ldquo;{query.trim()}&rdquo;. Check the spelling, or browse all items.
          </li>
        )}
      </ul>
      <p className="visually-hidden" role="status">
        {showList ? `${results.length} result${results.length === 1 ? "" : "s"}` : ""}
      </p>
    </div>
  );
}
