import type { ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "./Icon";

/** The title block every browse and detail page opens with. */
export function PageHead({ title, lede, children }: { title: string; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h1 className="page-head__title">{title}</h1>
      {lede && <p className="page-head__lede">{lede}</p>}
      {children}
    </header>
  );
}

export function Breadcrumb({ to, label, current }: { to: string; label: string; current: string }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link className="text-link" to={to}>
        {label}
      </Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

interface SearchFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

/** A plain filter box for a list on the same page. */
export function SearchField({ label, placeholder, value, onChange }: SearchFieldProps) {
  return (
    <label className="search-field">
      <span className="visually-hidden">{label}</span>
      <Icon name="search" />
      <input
        className="search-field__input"
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface ToggleGroupProps<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  selected: ReadonlySet<T>;
  onToggle: (value: T) => void;
}

/** A row of on/off filters. None pressed means "everything". */
export function ToggleGroup<T extends string | number>({ label, options, selected, onToggle }: ToggleGroupProps<T>) {
  return (
    <div className="toggle-group" role="group" aria-label={label}>
      <span className="eyebrow" aria-hidden="true">
        {label}
      </span>
      <div className="segmented">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="segmented__option"
            aria-pressed={selected.has(option.value)}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function toggled<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
}
