import { useId, useState, type FormEvent } from "react";
import { errorMessage } from "../../api/http";
import { canSubmit, submitSynergy } from "../../api/submissions";
import { gameData } from "../../engine/data";
import { RATINGS, type Build, type Rating } from "../../engine/types";
import { MAX_DESCRIPTION, type NewSynergy } from "../../hooks/useCustomSynergies";
import { ratingMeaning } from "../Badges";
import { Dialog } from "../Dialog";
import { Icon } from "../Icon";
import { Sprite } from "../Sprite";

interface AddSynergyDialogProps {
  open: boolean;
  build: Build;
  onSave: (entry: NewSynergy, submitted: boolean) => void;
  onClose: () => void;
}

/** Write down an interaction for the build on screen, and optionally send it to the site's owner. */
export function AddSynergyDialog({ open, build, onSave, onClose }: AddSynergyDialogProps) {
  return (
    <Dialog open={open} title="Add your own synergy" onClose={onClose}>
      <AddSynergyForm build={build} onSave={onSave} onClose={onClose} />
    </Dialog>
  );
}

type Phase = { status: "editing" } | { status: "sending" } | { status: "done"; sent: boolean } | { status: "error"; message: string };

function AddSynergyForm({ build, onSave, onClose }: Omit<AddSynergyDialogProps, "open">) {
  const [rating, setRating] = useState<Rating>("A");
  const [description, setDescription] = useState("");
  const [forCharacter, setForCharacter] = useState(false);
  const [send, setSend] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [tried, setTried] = useState(false);
  const [phase, setPhase] = useState<Phase>({ status: "editing" });
  const id = useId();
  const character = build.character ? gameData.characterBySlug.get(build.character) : undefined;
  const missing = description.trim().length === 0;
  const chosenCharacter = forCharacter && character ? character.slug : null;
  const sendable = canSubmit(build.items, build.trinkets, chosenCharacter ? [chosenCharacter] : []);

  const entry = (): NewSynergy => ({
    itemIds: build.items,
    trinketIds: build.trinkets,
    character: chosenCharacter,
    rating,
    description,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (missing || phase.status === "sending") return;
    if (!(send && sendable)) {
      onSave(entry(), false);
      onClose();
      return;
    }
    setPhase({ status: "sending" });
    try {
      await submitSynergy({
        character: chosenCharacter,
        items: build.items,
        trinkets: build.trinkets,
        rating,
        description,
        sourceUrl: sourceUrl.trim() || null,
        website: honeypot,
      });
      onSave(entry(), true);
      setPhase({ status: "done", sent: true });
    } catch (cause) {
      setPhase({ status: "error", message: errorMessage(cause, "It couldn't be sent. Try again in a moment.") });
    }
  };

  const saveOnly = () => {
    setTried(true);
    if (missing) return;
    onSave(entry(), false);
    onClose();
  };

  if (phase.status === "done") {
    return (
      <div className="synergy-form">
        <p className="synergy-form__thanks">
          <Icon name="check" />
          Saved to your synergies, and sent to isaac.toys. Thank you!
        </p>
        <p className="field__hint">
          If the site&rsquo;s owner approves it, it goes up on isaac.toys for everyone, marked Community.
        </p>
        <div className="dialog__actions">
          <button type="button" className="button" data-variant="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const sending = phase.status === "sending";
  return (
    <form className="synergy-form" onSubmit={submit} noValidate>
      <div className="field">
        <span className="field__label">This combination</span>
        <ul className="synergy-form__pieces" role="list">
          {build.items.map((itemId) => (
            <li key={`i${itemId}`} className="synergy-form__piece">
              <Sprite kind="item" id={itemId} />
              {gameData.itemById.get(itemId)!.name}
            </li>
          ))}
          {build.trinkets.map((trinketId) => (
            <li key={`t${trinketId}`} className="synergy-form__piece">
              <Sprite kind="trinket" id={trinketId} />
              {gameData.trinketById.get(trinketId)!.name}
            </li>
          ))}
        </ul>
        <span className="field__hint">To change it, close this and edit your build.</span>
      </div>

      {character && (
        <label className="synergy-form__check">
          <input type="checkbox" checked={forCharacter} onChange={(event) => setForCharacter(event.target.checked)} />
          <span>Only when playing {character.name}</span>
        </label>
      )}

      <fieldset className="field">
        <legend className="field__label">How strong is it?</legend>
        <div className="segmented" role="radiogroup" aria-label="Rating">
          {RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              className="segmented__option"
              role="radio"
              aria-checked={rating === r}
              onClick={() => setRating(r)}
            >
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
          What happens?
        </label>
        <textarea
          id={`${id}-text`}
          className="input"
          data-multiline
          value={description}
          maxLength={MAX_DESCRIPTION}
          aria-invalid={tried && missing}
          aria-describedby={`${id}-hint`}
          onChange={(event) => setDescription(event.target.value)}
        />
        {tried && missing ? (
          <span id={`${id}-hint`} className="field__error">
            Say what the combination does, in a sentence or two.
          </span>
        ) : (
          <span id={`${id}-hint`} className="field__hint">
            {send && sendable ? "Saved in this browser, and sent to isaac.toys." : "Saved in this browser only."}
          </span>
        )}
      </div>

      <div className="synergy-form__send">
        <label className="synergy-form__check" data-disabled={!sendable}>
          <input
            type="checkbox"
            checked={send && sendable}
            disabled={!sendable}
            aria-describedby={`${id}-send-hint`}
            onChange={(event) => setSend(event.target.checked)}
          />
          <span>Send it to isaac.toys for the shared list</span>
        </label>
        <span id={`${id}-send-hint`} className="field__hint">
          {sendable
            ? "The site’s owner reviews every one. No name or account is attached."
            : "A synergy for the shared list needs two things: two pickups, or a pickup and a character."}
        </span>
        {send && sendable && (
          <div className="field">
            <label className="field__label" htmlFor={`${id}-link`}>
              Where did you see it? <span className="field__optional">(optional link)</span>
            </label>
            <input
              id={`${id}-link`}
              className="input"
              type="url"
              inputMode="url"
              placeholder="https://bindingofisaacrebirth.wiki.gg/…"
              value={sourceUrl}
              maxLength={300}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
          </div>
        )}
      </div>

      {/* For bots that fill in every box. People never see it, and screen readers skip it. */}
      <div className="visually-hidden" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
        </label>
      </div>

      {phase.status === "error" && (
        <p className="field__error" role="alert">
          {phase.message}
        </p>
      )}

      <div className="dialog__actions">
        <button type="button" className="button" data-variant="quiet" onClick={onClose}>
          Cancel
        </button>
        {phase.status === "error" && (
          <button type="button" className="button" onClick={saveOnly}>
            Save without sending
          </button>
        )}
        <button
          type="submit"
          className="button"
          data-variant="primary"
          data-state={sending ? "loading" : undefined}
          aria-disabled={sending}
        >
          {sending ? "Sending…" : send && sendable ? "Save and send" : "Save synergy"}
        </button>
      </div>
    </form>
  );
}
