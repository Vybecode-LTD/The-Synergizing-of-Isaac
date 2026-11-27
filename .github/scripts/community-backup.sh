#!/usr/bin/env bash
# Saves the live community synergies (approved submissions, decision 0008) to the backup/community branch,
# as community.json in data/synergies.json's format. Commits only when the list changed.
#
#   community-backup.sh <site url> <git remote>
#
# The branch is never deployed (Railway deploys main) and CI does not run on it. To restore, or to move
# them into the curated list: python scripts/gamedata.py add-submissions community.json
set -euo pipefail

site="${1:?site url}"
remote="${2:-origin}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

curl --fail --silent --show-error --max-time 30 "$site/api/community" -o "$work/community.json"
python3 - "$work/community.json" <<'PY'
import json, sys
doc = json.load(open(sys.argv[1], encoding="utf-8"))
entries = doc["entries"]
assert isinstance(entries, list), "entries is not a list"
for e in entries:
    assert {"id", "items", "trinkets", "characters", "rating", "description"} <= set(e), e
json.dump(doc, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
print(f"{len(entries)} live community synergies")
PY

if git fetch --quiet --depth 1 "$remote" backup/community 2>/dev/null; then
  git switch --quiet --force-create backup/community FETCH_HEAD
else
  git switch --quiet --orphan backup/community
fi
cp "$work/community.json" community.json
git add community.json
if git diff --cached --quiet; then
  echo "No change since the last backup."
  exit 0
fi
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit --quiet -m "backup: live community synergies $(date -u +%F)"
git push --quiet "$remote" backup/community
echo "Saved to backup/community."
