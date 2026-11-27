import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  STATUSES,
  getExport,
  getInbox,
  getSession,
  removeSubmission,
  review,
  signIn,
  signOut,
  type AdminSession,
  type Inbox,
  type Review,
  type Status,
  type Submission,
} from "../api/admin";
import { ApiError, errorMessage } from "../api/http";
import { RatingBadge, Tag, ratingMeaning } from "../components/Badges";
import { Icon } from "../components/Icon";
import { Portrait, Sprite } from "../components/Sprite";
import { gameData } from "../engine/data";
import { RATINGS, type Rating } from "../engine/types";
import { MAX_DESCRIPTION } from "../hooks/useCustomSynergies";
import { usePage } from "../hooks/usePage";

const TAB_LABEL: Record<Status | "all", string> = {
  new: "New",
  approved: "Live",
  rejected: "Rejected",
  added: "In the curated list",
  all: "All",
};

const signedOut = (cause: unknown) => cause instanceof ApiError && cause.status === 401;

/** The owner's synergy inbox (decision 0008). Loaded on its own, so visitors never download it. */
export default function AdminPage() {
  const page = usePage();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="admin">
      <header className="admin__intro">
        <h1 className="admin__title">{page.h1}</h1>
        <p className="admin__lede">{page.lede}</p>
      </header>
      {failed ? (
        <p className="notice" data-tone="quiet">
          The inbox didn&rsquo;t answer. Reload the page to try again.
        </p>
      ) : session === null ? (
        <p className="admin__loading" role="status">
          Checking whether you&rsquo;re signed in…
        </p>
      ) : !session.configured ? (
        <NotSetUp />
      ) : session.signedIn ? (
        <InboxView username={session.username ?? ""} onSignedOut={setSession} />
      ) : (
        <SignIn onSignedIn={setSession} />
      )}
    </div>
  );
}

function NotSetUp() {
  return (
    <section className="admin-card" aria-labelledby="setup-title">
      <h2 id="setup-title" className="admin-card__title">
        The inbox isn&rsquo;t set up on this site
      </h2>
      <ol className="admin-steps">
        <li>
          In <code className="admin__code">api/</code>, run <code className="admin__code">.venv\Scripts\python -m app.admin_password</code> and type a password of 15
          characters or more.
        </li>
        <li>
          On Railway, set <code className="admin__code">ADMIN_USERNAME</code> to a name you choose and <code className="admin__code">ADMIN_PASSWORD_HASH</code> to the
          line it printed (a hash, not the password).
        </li>
        <li>When the deploy finishes, reload this page and sign in.</li>
      </ol>
    </section>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: (session: AdminSession) => void }) {
  const id = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await signIn(username, password));
    } catch (cause) {
      setPassword("");
      setError(errorMessage(cause, "Signing in didn't work. Try again in a moment."));
      setBusy(false);
    }
  };

  return (
    <form className="admin-card admin-signin" onSubmit={submit} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="admin-card__title">
        Sign in
      </h2>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-user`}>
          Username
        </label>
        <input
          id={`${id}-user`}
          className="input"
          autoComplete="username"
          value={username}
          required
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-password`}>
          Password
        </label>
        <input
          id={`${id}-password`}
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          required
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      <div>
        <button type="submit" className="button" data-variant="primary" data-state={busy ? "loading" : undefined} aria-disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}

function InboxView({ username, onSignedOut }: { username: string; onSignedOut: (session: AdminSession) => void }) {
  const [tab, setTab] = useState<Status | "all">("new");
  // The tab on screen now, for a refresh that runs after a change finishes: the tab may have changed since it
  // began (CodeRabbit, PR #12).
  const shown = useRef(tab);
  shown.current = tab;
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expired = useCallback(
    () => onSignedOut({ configured: true, signedIn: false, username: null }),
    [onSignedOut],
  );

  // Each load is numbered; only the newest may fill the inbox, so a slow answer for a tab left behind
  // never replaces the one on screen (CodeRabbit, PR #12).
  const latest = useRef(0);
  const load = useCallback(
    async (which: Status | "all") => {
      const ticket = ++latest.current;
      try {
        const fresh = await getInbox(which);
        if (ticket !== latest.current) return;
        setInbox(fresh);
        setError(null);
      } catch (cause) {
        if (ticket !== latest.current) return;
        if (signedOut(cause)) expired();
        else setError(errorMessage(cause));
      }
    },
    [expired],
  );

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  // One change at a time: while one is on its way, every card's controls wait, so two changes to the same
  // submission can never race and leave the slower one standing (CodeRabbit, PR #12).
  const [busy, setBusy] = useState(false);
  const act = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      await load(shown.current);
    } catch (cause) {
      if (signedOut(cause)) expired();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    try {
      onSignedOut(await signOut());
    } catch (cause) {
      if (signedOut(cause)) expired();
      // Showing the sign-in form here would hide a session that is still valid (CodeRabbit, PR #12).
      // A failed answer doesn't say whether the server ended the session, so say only what is known.
      else setError("Couldn't confirm the sign-out. Your session may still be active. Try again.");
    }
  };

  return (
    <div className="admin__inbox">
      <div className="admin__bar">
        <p className="admin__who">
          Signed in as <strong>{username}</strong>
        </p>
        <button type="button" className="button" data-variant="quiet" data-size="sm" onClick={leave}>
          Sign out
        </button>
      </div>

      <nav className="admin-tabs" aria-label="Submissions by status">
        {[...STATUSES, "all" as const].map((which) => (
          <button
            key={which}
            type="button"
            className="admin-tabs__tab"
            aria-pressed={tab === which}
            onClick={() => setTab(which)}
          >
            {TAB_LABEL[which]}
            {which !== "all" && inbox && <span className="admin-tabs__count">{inbox.counts[which]}</span>}
          </button>
        ))}
      </nav>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      {inbox && inbox.counts.approved > 0 && <ExportPanel count={inbox.counts.approved} />}

      {inbox === null ? (
        <p className="admin__loading" role="status">
          Loading…
        </p>
      ) : inbox.submissions.length === 0 ? (
        <p className="notice" data-tone="quiet">
          Nothing here{tab === "new" ? " yet. New submissions land in this tab." : "."}
        </p>
      ) : (
        <ul className="admin-list" role="list">
          {inbox.submissions.map((s) => (
            <li key={s.id}>
              <SubmissionCard
                submission={s}
                busy={busy}
                onReview={(changes) => act(() => review(s.id, changes))}
                onDelete={() => act(() => removeSubmission(s.id))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Live synergies are already on the site. Moving them into data/synergies.json is optional: it puts them in
 * git and in the checked list. Once that deploys, the server marks them as in the curated list by itself.
 */
function ExportPanel({ count }: { count: number }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = async () => `${JSON.stringify(await getExport(), null, 1)}\n`;

  const download = async () => {
    try {
      const blob = new Blob([await text()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `isaac-toys-submissions-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(await text());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      setError(errorMessage(cause, "Copying didn't work. Use the download instead."));
    }
  };

  return (
    <section className="admin-card admin-export" aria-labelledby="export-title">
      <h2 id="export-title" className="admin-card__title">
        {count} live on the site
      </h2>
      <p className="admin-card__text">
        They&rsquo;re on isaac.toys now, marked Community, and a copy is saved to the repository&rsquo;s{" "}
        <code className="admin__code">backup/community</code> branch every week. When you want them in the curated
        list itself:
      </p>
      <ol className="admin-steps">
        <li>Download the export (or copy it).</li>
        <li>
          Run <code className="admin__code">python scripts/gamedata.py add-submissions &lt;file&gt;</code> and open a pull
          request.
        </li>
        <li>Once it merges and deploys, they move to &ldquo;In the curated list&rdquo; on their own.</li>
      </ol>
      <div className="admin-export__actions">
        <button type="button" className="button" data-variant="primary" data-size="sm" onClick={download}>
          Download export
        </button>
        <button type="button" className="button" data-size="sm" onClick={copy}>
          <Icon name={copied ? "check" : "link"} />
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function SubmissionCard({
  submission: s,
  busy,
  onReview,
  onDelete,
}: {
  submission: Submission;
  /** A change is on its way: the controls wait for it. */
  busy: boolean;
  onReview: (changes: Review) => void;
  onDelete: () => void;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState<Rating>(s.rating);
  const [description, setDescription] = useState(s.description);
  const [note, setNote] = useState(s.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pieces = [
    ...s.itemIds.map((pid) => ({ kind: "item" as const, id: pid, name: gameData.itemById.get(pid)?.name ?? `Item ${pid}` })),
    ...s.trinketIds.map((pid) => ({
      kind: "trinket" as const,
      id: pid,
      name: gameData.trinketById.get(pid)?.name ?? `Trinket ${pid}`,
    })),
  ];
  const when = new Date(s.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const startEditing = (on: boolean) => {
    setRating(s.rating);
    setDescription(s.description);
    setNote(s.note ?? "");
    setEditing(on);
  };
  // While a change is on its way the buttons stay put but do nothing, and say so to assistive tech.
  const guard = (run: () => void) => ({ "aria-disabled": busy, onClick: busy ? undefined : run });

  const save = (status?: Status) =>
    onReview({ rating, description: description.trim(), note: note.trim(), ...(status ? { status } : {}) });

  return (
    <article className="admin-sub" data-rating={s.rating} aria-labelledby={`${id}-title`}>
      <RatingBadge rating={s.rating} />
      <div className="admin-sub__body">
        <h3 id={`${id}-title`} className="admin-sub__recipe">
          {pieces.map((p, n) => (
            <span key={`${p.kind}${p.id}`} className="admin-sub__piece">
              {n > 0 && (
                <span className="admin-sub__plus" aria-hidden="true">
                  +
                </span>
              )}
              <Sprite kind={p.kind} id={p.id} />
              {p.name}
            </span>
          ))}
          {s.characterSlugs.map((slug) => (
            <span key={slug} className="admin-sub__piece">
              <span className="admin-sub__as">as</span>
              <Portrait slug={slug} size="sm" />
              {gameData.characterBySlug.get(slug)?.name ?? slug}
            </span>
          ))}
        </h3>

        <div className="admin-sub__meta">
          <Tag tone={s.origin === "ai" ? "accent" : "neutral"}>{s.origin === "ai" ? "Found by the AI" : "From a visitor"}</Tag>
          <Tag>{TAB_LABEL[s.status]}</Tag>
          <span>{when}</span>
          {s.alsoSent > 0 && <span>Also sent {s.alsoSent === 1 ? "once more" : `${s.alsoSent} more times`}</span>}
        </div>

        {s.onList.length > 0 && (
          <p className="admin-sub__warning">
            <Icon name="alert" />
            The curated list already has these pickups ({s.onList.join(", ")}). If the combination is the same, the
            site shows the curated entry, not this one: treat it as a correction to make there, or reject it.
          </p>
        )}

        {editing ? (
          // Locked while a change is on its way: an edit made then would not be in that request (CodeRabbit, PR #12).
          <fieldset className="admin-sub__edit" disabled={busy}>
            <fieldset className="field">
              <legend className="field__label">Rating</legend>
              <div className="segmented" role="radiogroup" aria-label="Rating">
                {RATINGS.map((r) => (
                  <button key={r} type="button" className="segmented__option" role="radio" aria-checked={rating === r} onClick={() => setRating(r)}>
                    {r}
                  </button>
                ))}
              </div>
              <span className="field__hint">
                {rating}: {ratingMeaning(rating)}
              </span>
            </fieldset>
            <div className="field">
              <label className="field__label" htmlFor={`${id}-text`}>
                Description
              </label>
              <textarea
                id={`${id}-text`}
                className="input"
                data-multiline
                value={description}
                maxLength={MAX_DESCRIPTION}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${id}-note`}>
                Note to yourself <span className="field__optional">(optional)</span>
              </label>
              <input id={`${id}-note`} className="input" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
            </div>
          </fieldset>
        ) : (
          <>
            <p className="admin-sub__text">{s.description}</p>
            {s.note && <p className="admin-sub__note">Note: {s.note}</p>}
          </>
        )}

        {s.sourceUrl && (
          <p className="admin-sub__source">
            Source given:{" "}
            <a className="text-link" href={s.sourceUrl} target="_blank" rel="noopener noreferrer nofollow ugc">
              {s.sourceUrl}
            </a>
          </p>
        )}

        <div className="admin-sub__actions">
          {editing ? (
            <>
              <button type="button" className="button" data-variant="primary" data-size="sm" {...guard(() => save("approved"))}>
                <Icon name="check" />
                Save and publish
              </button>
              <button type="button" className="button" data-size="sm" {...guard(() => save())}>
                Save
              </button>
              <button type="button" className="button" data-variant="quiet" data-size="sm" {...guard(() => startEditing(false))}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {s.status !== "approved" && (
                <button type="button" className="button" data-variant="primary" data-size="sm" {...guard(() => onReview({ status: "approved" }))}>
                  <Icon name="check" />
                  Publish
                </button>
              )}
              <button type="button" className="button" data-size="sm" {...guard(() => startEditing(true))}>
                Edit
              </button>
              {s.status !== "rejected" && (
                <button type="button" className="button" data-size="sm" {...guard(() => onReview({ status: "rejected" }))}>
                  <Icon name="close" />
                  Reject
                </button>
              )}
              {s.status !== "new" && (
                <button type="button" className="button" data-variant="quiet" data-size="sm" {...guard(() => onReview({ status: "new" }))}>
                  {s.status === "approved" ? "Unpublish" : "Back to new"}
                </button>
              )}
              {confirmDelete ? (
                <button type="button" className="button" data-variant="quiet" data-size="sm" {...guard(onDelete)}>
                  <Icon name="trash" />
                  Really delete
                </button>
              ) : (
                <button type="button" className="button" data-variant="quiet" data-size="sm" {...guard(() => setConfirmDelete(true))}>
                  <Icon name="trash" />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
