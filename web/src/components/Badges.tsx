import type { Rating, StatKey } from "../engine/types";
import type { StatLine } from "../engine/summary";

const RATING_MEANING: Record<Rating, string> = {
  S: "run-defining",
  A: "strong",
  B: "good",
  C: "minor",
  D: "avoid: these work against each other",
};

/** The letter carries the meaning; colour only repeats it. */
export function RatingBadge({ rating, size = "md" }: { rating: Rating; size?: "sm" | "md" }) {
  return (
    <span className="rating" data-rating={rating} data-size={size} title={`${rating} tier: ${RATING_MEANING[rating]}`}>
      <span aria-hidden="true">{rating}</span>
      <span className="visually-hidden">
        {rating} tier, {RATING_MEANING[rating]}
      </span>
    </span>
  );
}

export function ratingMeaning(rating: Rating): string {
  return RATING_MEANING[rating];
}

/** The game's own 0 to 4 quality score, as four pips. */
export function QualityPips({ quality }: { quality: number }) {
  return (
    <span className="quality" data-quality={quality} role="img" aria-label={`Quality ${quality} of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className="quality__pip" data-on={n <= quality} />
      ))}
    </span>
  );
}

const MULTIPLIERS: ReadonlySet<StatKey> = new Set<StatKey>(["damageMult", "tearsMult"]);

function tone(line: StatLine): "up" | "down" {
  return (MULTIPLIERS.has(line.key) ? line.value >= 1 : line.value > 0) ? "up" : "down";
}

/** Stat changes as small chips: "Damage +1", "Tears x0.33". */
export function StatChips({ lines }: { lines: StatLine[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="stat-chips" role="list">
      {lines.map((line) => (
        <li key={line.key} className="stat-chip" data-tone={tone(line)}>
          <span className="stat-chip__label">{line.label}</span>
          <span className="stat-chip__value">{line.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function Tag({ children, tone: tagTone = "neutral" }: { children: string; tone?: "neutral" | "accent" }) {
  return (
    <span className="tag" data-tone={tagTone}>
      {children}
    </span>
  );
}
