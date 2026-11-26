import { gameData } from "../../engine/data";
import { progressText, totalStats, transformationProgress } from "../../engine/summary";
import { effectiveItems } from "../../engine/synergy";
import type { Build } from "../../engine/types";
import { StatChips } from "../Badges";

/** What the build adds up to: raw stat changes and progress toward transformations. */
export function BuildSummary({ build }: { build: Build }) {
  const items = [...effectiveItems(build, gameData)].map((id) => gameData.itemById.get(id)!);
  const trinkets = build.trinkets.map((id) => gameData.trinketById.get(id)!);
  const stats = totalStats([...items, ...trinkets]);
  const transformations = transformationProgress([...items, ...trinkets], gameData.transformations);
  if (stats.length === 0 && transformations.length === 0) return null;

  return (
    <section className="summary" aria-label="Build summary">
      {stats.length > 0 && (
        <div className="summary__block">
          <h3 className="eyebrow">Stat changes</h3>
          <StatChips lines={stats} />
          <p className="summary__note">Added up from the items, before the game applies its formulas and caps.</p>
        </div>
      )}
      {transformations.length > 0 && (
        <div className="summary__block">
          <h3 className="eyebrow">Transformations</h3>
          <ul className="transformations" role="list">
            {transformations.map((t) => (
              <li key={t.id} className="transformation" data-done={t.done}>
                <span className="transformation__name">{t.name}</span>
                <span className="transformation__count">{progressText(t)}</span>
              </li>
            ))}
          </ul>
          {transformations
            .filter((t) => t.note)
            .map((t) => (
              <p key={t.id} className="summary__note">
                {t.name}: {t.note}
              </p>
            ))}
          <p className="summary__note">Counted as Repentance counts them.</p>
        </div>
      )}
    </section>
  );
}
