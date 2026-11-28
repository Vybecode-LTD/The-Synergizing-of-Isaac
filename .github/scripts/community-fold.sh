#!/usr/bin/env bash
# The weekly fold (decision 0008, point 9). Adds the Community synergies the owner checked against the wiki in
# /admin to data/synergies.json, records their checks in data/synergy-checks.md, refreshes the browser/server
# snapshot and the share image, commits all of it to a new branch and pushes it. Writes branch=<name> to
# $GITHUB_OUTPUT, or nothing when no checked synergy is waiting. The workflow then runs CI on that branch and
# merges it into main only if CI passes. Unchecked ones are left where they are: live, marked Community.
#
#   community-fold.sh <site url> <git remote>
#
# Needs Python with api/requirements.txt, web/'s node_modules, and Chrome (for the share image).
set -euo pipefail

site="${1:?site url}"
remote="${2:-origin}"
out="${GITHUB_OUTPUT:-/dev/null}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

curl --fail --silent --show-error --max-time 30 "$site/api/community" -o "$work/community.json"
python scripts/gamedata.py add-submissions --checked-only "$work/community.json" | tee "$work/added.txt"
if git diff --quiet -- data/synergies.json; then
  echo "Nothing checked is waiting: no fold this week."
  exit 0
fi

python scripts/gamedata.py validate
(cd api && python -m app.parity)
(cd web && npm run og -- "${site#*://}")

# The attempt too: "Re-run all jobs" keeps the run id, and its new commit could not go on the old branch.
branch="community/fold-$(date -u +%F)-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
git switch --quiet -c "$branch"
git add data/synergies.json data/synergy-checks.md data/tests/parity.json web/public/og.png
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit --quiet -m "data: fold checked Community synergies into the curated list" -m "$(cat "$work/added.txt")"
git push --quiet "$remote" "$branch"
echo "branch=$branch" >> "$out"
echo "Pushed $branch; CI runs on it next."
