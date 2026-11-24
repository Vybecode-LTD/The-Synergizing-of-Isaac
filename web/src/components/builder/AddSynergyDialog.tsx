import { useId, useState, type FormEvent } from "react";
import { gameData } from "../../engine/data";
import { RATINGS, type Build, type Rating } from "../../engine/types";
import { MAX_DESCRIPTION, type NewSynergy } from "../../hooks/useCustomSynergies";
import { ratingMeaning } from "../Badges";
import { Dialog } from "../Dialog";
import { Sprite } from "../Sprite";

interface AddSynergyDialogProps {
  open: boolean;
  build: Build;
  onSave: (entry: NewSynergy) => void;
  onClose: () => void;
}

/** Write down an interaction for the build on screen. The combination is the build; you add the rating and the words. */
export function AddSynergyDialog({ open, build, onSave, onClose }: AddSynergyDialogProps) {
  return (
    <Dialog open={open} title="Add your own synergy" onClose={onClose}>
      <AddSynergyForm build={build} onSave={onSave} onClose={onClose} />
    </Dialog>
  );
}

function AddSynergyForm({ build, onSave, onClose }: Omit<AddSynergyDialogProps, "open">) {
  const [rating, setRating] = useState<Rating>("A");
  const [description, setDescription] = useState("");
  const [forCharacter, setForCharacter] = useState(false);
  const [tried, setTried] = useState(false);
  const id = useId();
  const character = build.character ? gameData.characterBySlug.get(build.character) : undefined;
  const missing = description.trim().length === 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (missing) return;
    onSave({
      itemIds: build.items,
      trinketIds: build.trinkets,
      character: forCharacter && character ? character.slug : null,
      rating,
      description,
    });
    onClose();
  };

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
            Saved in this browser only. It isn&rsquo;t sent anywhere.
          </span>
        )}
      </div>

      <div className="dialog__actions">
        <button type="button" className="button" data-variant="quiet" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="button" data-variant="primary">
          Save synergy
        </button>
      </div>
    </form>
  );
}
