import { useEffect, useRef, useState } from "react";
import { AnalysisError, analysisBlocks, analyzeBuild, type Analysis } from "../../api/analysis";
import { encodeBuild } from "../../engine/buildCodec";
import type { Build } from "../../engine/types";
import { Icon } from "../Icon";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; analysis: Analysis }
  | { status: "error"; error: AnalysisError };

/** An AI read on the whole build. It runs only when asked, because every fresh answer costs the site money. */
export function AiPanel({ build }: { build: Build }) {
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
          <div className="ai-panel__answer">
            {analysisBlocks(state.analysis.text).map((block, index) =>
              block.kind === "heading" ? (
                <h3 key={index} className="eyebrow">
                  {block.text}
                </h3>
              ) : block.kind === "list" ? (
                <ul key={index} className="ai-panel__list">
                  {block.items.map((item, n) => (
                    <li key={n}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={index}>{block.text}</p>
              ),
            )}
            <p className="ai-panel__note">
              Written by an AI from this site&rsquo;s item data. It can be wrong; the cards above come from the curated
              list.{" "}
              {state.analysis.cached
                ? "This build was analysed before, so it didn’t use one of your analyses."
                : `${state.analysis.remaining} of ${state.analysis.limit} analyses left today.`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
