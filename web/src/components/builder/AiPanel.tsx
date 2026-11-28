import { useEffect, useId, useRef, useState } from "react";
import { AnalysisError, analyzeBuild, mentions, type Analysis, type FoundSynergy } from "../../api/analysis";
import { errorMessage } from "../../api/http";
import { submitFound } from "../../api/submissions";
import { encodeBuild } from "../../engine/buildCodec";
import { gameData } from "../../engine/data";
import type { Build } from "../../engine/types";
import type { NewSynergy } from "../../hooks/useCustomSynergies";
import { RatingBadge, ratingMeaning } from "../Badges";
import { Icon, type IconName } from "../Icon";
import { Portrait, Sprite } from "../Sprite";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; analysis: Analysis }
  | { status: "error"; error: AnalysisError };

type Piece = { kind: "item" | "trinket"; id: number; name: string };

/** The three sections of the read, in order. Light and deep alternate down the panel, starting deep at the verdict. */
const SECTIONS: { key: "howItPlays" | "bestInteractions" | "watchOutFor"; title: string; icon: IconName }[] = [
  { key: "howItPlays", title: "How it plays", icon: "play" },
  { key: "bestInteractions", title: "Best interactions", icon: "bolt" },
  { key: "watchOutFor", title: "Watch out for", icon: "alert" },
];

const piecesOf = (build: Build): Piece[] => [
  ...build.items.map((id) => ({ kind: "item" as const, id, name: gameData.itemById.get(id)!.name })),
  ...build.trinkets.map((id) => ({ kind: "trinket" as const, id, name: gameData.trinketById.get(id)!.name })),
];

/** A sentence, with each pickup of the build it names shown with its sprite. */
function Line({ text, pieces }: { text: string; pieces: Piece[] }) {
  return (
    <>
      {mentions(text, pieces).map((segment, n) =>
        "text" in segment ? (
          <span key={n}>{segment.text}</span>
        ) : (
          <span key={n} className="ai-mention">
            <span className="ai-mention__art">
              <Sprite kind={segment.kind} id={segment.id} />
            </span>
            <strong>{segment.name}</strong>
          </span>
        ),
      )}
    </>
  );
}

interface AiPanelProps {
  build: Build;
  /** Save one of the AI's finds as the visitor's own synergy (in this browser). */
  onSave: (entry: NewSynergy, submitted?: boolean) => void;
}

/** An AI read on the whole build. It runs only when asked, because every fresh answer costs the site money. */
export function AiPanel({ build, onSave }: AiPanelProps) {
  const [state, setState] = useState<State>({ status: "idle" });
  const request = useRef<AbortController | null>(null);
  const key = encodeBuild(build);

  // A different build makes the old answer wrong: drop it and cancel anything in flight.
  useEffect(() => {
    setState({ status: "idle" });
    return () => request.current?.abort();
  }, [key]);

  const run = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ status: "loading" });
    try {
      const analysis = await analyzeBuild(build, controller.signal);
      if (!controller.signal.aborted) setState({ status: "done", analysis });
    } catch (cause) {
      if (controller.signal.aborted) return;
      const error =
        cause instanceof AnalysisError ? cause : new AnalysisError("failed", "The AI didn't answer. Try again in a moment.");
      setState({ status: "error", error });
    }
  };

  const loading = state.status === "loading";
  const canRetry = state.status === "error" && state.error.code === "failed";

  return (
    <section className="ai-panel" aria-labelledby="ai-title">
      <header className="results__header">
        <h2 id="ai-title" className="results__title">
          AI read on this build
        </h2>
        <p className="results__lede">
          Looks at the whole build at once, including pairs the list above doesn&rsquo;t cover.
        </p>
      </header>

      {(state.status === "idle" || loading || canRetry) && (
        <div>
          <button
            type="button"
            className="button"
            data-state={loading ? "loading" : undefined}
            aria-disabled={loading}
            onClick={loading ? undefined : run}
          >
            <Icon name="spark" />
            {loading ? "Reading the build…" : canRetry ? "Try again" : "Analyse this build"}
          </button>
        </div>
      )}

      <div aria-live="polite">
        {state.status === "error" && <p className="ai-panel__error">{state.error.message}</p>}
        {state.status === "done" && (
          <AiRead key={key} analysis={state.analysis} build={build} pieces={piecesOf(build)} onSave={onSave} />
        )}
      </div>
    </section>
  );
}

function AiRead({ analysis, build, pieces, onSave }: { analysis: Analysis; build: Build; pieces: Piece[] } & Pick<AiPanelProps, "onSave">) {
  const { read, found } = analysis;
  const tier = read.verdict.tier;
  const shown = SECTIONS.filter((s) => read[s.key].length > 0);
  // The verdict is deep, so the sections after it go light, deep, light…
  const tone = (n: number) => (n % 2 === 0 ? "light" : "deep");
  return (
    <div className="ai-read">
      <section className="ai-read__verdict" data-tone="deep" aria-labelledby="ai-verdict">
        <RatingBadge rating={tier} size="lg" />
        <div className="ai-read__verdict-text">
          <h3 id="ai-verdict" className="ai-read__label">
            Verdict: {tier} tier, {ratingMeaning(tier).split(":")[0]}
          </h3>
          <p className="ai-read__why">
            <Line text={read.verdict.why} pieces={pieces} />
          </p>
        </div>
      </section>

      {shown.map((section, n) => (
        <section
          key={section.key}
          className="ai-read__section"
          data-tone={tone(n)}
          aria-labelledby={`ai-${section.key}`}
        >
          <h3 id={`ai-${section.key}`} className="ai-read__heading">
            <span className="ai-read__icon">
              <Icon name={section.icon} />
            </span>
            {section.title}
          </h3>
          <ul className="ai-read__list" role="list">
            {read[section.key].map((line, i) => (
              <li key={i} className="ai-read__item">
                <Line text={line} pieces={pieces} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* At the bottom of the read: each find the curated list lacks is a card of its own (decision 0008, point 7). */}
      {found.map((f) => (
        <NewSynergy key={f.key} find={f} build={build} onSave={onSave} />
      ))}

      <p className="ai-panel__note">
        Written by an AI from this site&rsquo;s item data. It can be wrong; the cards above come from the curated
        list and approved community submissions.{" "}
        {analysis.cached
          ? "This build was analysed before, so it didn’t use one of your analyses."
          : `${analysis.remaining} of ${analysis.limit} analyses left today.`}
      </p>
    </div>
  );
}

type Sending = { status: "idle" } | { status: "sending" } | { status: "sent" } | { status: "error"; message: string };

/** One interaction the AI found that the list lacks: send it for review, or keep it in your own synergies. */
function NewSynergy({ find: f, build, onSave }: { find: FoundSynergy; build: Build } & Pick<AiPanelProps, "onSave">) {
  const id = useId();
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState<Sending>({ status: "idle" });

  const save = () => {
    onSave(
      {
        itemIds: f.itemIds,
        trinketIds: f.trinketIds,
        character: f.characterSlugs[0] ?? null,
        rating: f.rating,
        description: f.description,
      },
      sending.status === "sent",
    );
    setSaved(true);
  };

  // This find alone, by its key: the server stores its own copy of the words, never the page's.
  const send = async () => {
    setSending({ status: "sending" });
    try {
      await submitFound(build, [f.key]);
      setSending({ status: "sent" });
    } catch (cause) {
      setSending({ status: "error", message: errorMessage(cause, "It couldn't be sent. Try again in a moment.") });
    }
  };

  const busy = sending.status === "sending";
  const pieces = [
    ...f.itemIds.map((pid) => ({ kind: "item" as const, id: pid, name: gameData.itemById.get(pid)!.name })),
    ...f.trinketIds.map((pid) => ({ kind: "trinket" as const, id: pid, name: gameData.trinketById.get(pid)!.name })),
  ];
  return (
    <section className="ai-new" aria-labelledby={`${id}-flag ${id}-recipe`}>
      <h3 id={`${id}-flag`} className="ai-new__flag">
        <span className="ai-new__icon">
          <Icon name="star" />
        </span>
        New synergy found
      </h3>
      <div className="ai-new__head">
        <RatingBadge rating={f.rating} size="sm" />
        <p id={`${id}-recipe`} className="ai-new__recipe">
          {pieces.map((p, i) => (
            <span key={`${p.kind}${p.id}`} className="ai-new__piece">
              {i > 0 && (
                <span className="ai-new__plus" aria-hidden="true">
                  +
                </span>
              )}
              <Sprite kind={p.kind} id={p.id} />
              {p.name}
            </span>
          ))}
          {f.characterSlugs.map((slug) => (
            <span key={slug} className="ai-new__piece">
              <span className="ai-new__as">as</span>
              <Portrait slug={slug} size="sm" />
              {gameData.characterBySlug.get(slug)!.name}
            </span>
          ))}
        </p>
      </div>
      <p className="ai-new__text">{f.description}</p>
      <div className="ai-new__actions">
        {sending.status === "sent" ? (
          <p className="ai-new__done">
            <Icon name="check" />
            Sent for review. Thank you!
          </p>
        ) : (
          <button
            type="button"
            className="button"
            data-variant="primary"
            data-size="sm"
            data-state={busy ? "loading" : undefined}
            aria-disabled={busy}
            onClick={busy ? undefined : send}
          >
            <Icon name="send" />
            {busy ? "Sending…" : "Send for review"}
          </button>
        )}
        {saved ? (
          <p className="ai-new__done">
            <Icon name="check" />
            Saved to your synergies
          </p>
        ) : (
          <button type="button" className="button" data-variant="quiet" data-size="sm" onClick={save}>
            <Icon name="plus" />
            Save to my synergies
          </button>
        )}
      </div>
      <p className="ai-new__hint" role={sending.status === "error" ? "alert" : undefined}>
        {sending.status === "error"
          ? sending.message
          : "The site’s owner checks it against the wiki first. If it holds up, it goes up on isaac.toys for everyone, marked Community. No name or account is attached."}
      </p>
    </section>
  );
}
