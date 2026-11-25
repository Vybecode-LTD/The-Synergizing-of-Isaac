"""Print real content for the design boards: a sample build's matches, one-away list, stats, Brimstone facts.

Usage: python -I -X utf8 sample_build.py <repo root> <out.json>
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ORDER = "SABCD"


def main() -> int:
    root = Path(sys.argv[1])
    d = root / "data"
    items = json.loads((d / "items.json").read_text(encoding="utf-8"))
    trinkets = json.loads((d / "trinkets.json").read_text(encoding="utf-8"))
    chars = json.loads((d / "characters.json").read_text(encoding="utf-8"))
    syn = json.loads((d / "synergies.json").read_text(encoding="utf-8"))
    by_name = {i["name"]: i for i in items}
    t_by_name = {t["name"]: t for t in trinkets}
    c_by_name = {c["name"]: c for c in chars}

    build_items = ["Brimstone", "Tammy's Head", "Technology", "Rock Bottom", "Crown of Light", "Sacred Heart"]
    build_trinkets = ["Perfection"]
    character = "Azazel"
    missing = [n for n in build_items if n not in by_name] + [n for n in build_trinkets if n not in t_by_name]
    have = set(build_items) | set(build_trinkets) | {character}

    def members(s: dict) -> list[str]:
        return s["items"] + s["trinkets"] + s["characters"]

    matched = [s for s in syn if all(m in have for m in members(s))]
    matched.sort(key=lambda s: (ORDER.index(s["rating"]), -len(members(s)), s["id"]))
    away: dict[str, dict] = {}
    for s in syn:
        miss = [m for m in members(s) if m not in have]
        if len(miss) == 1 and len(members(s)) > 1 and miss[0] not in c_by_name:
            e = away.setdefault(miss[0], {"name": miss[0], "best": s["rating"], "completes": []})
            e["completes"].append({"id": s["id"], "rating": s["rating"]})
            if ORDER.index(s["rating"]) < ORDER.index(e["best"]):
                e["best"] = s["rating"]
    away_list = sorted(away.values(), key=lambda e: (ORDER.index(e["best"]), -len(e["completes"]), e["name"]))
    for e in away_list:
        if e["name"] in by_name:
            e["kind"], e["id"] = "item", by_name[e["name"]]["id"]
        elif e["name"] in t_by_name:
            e["kind"], e["id"] = "trinket", t_by_name[e["name"]]["id"]
        else:
            print(f"unknown synergy member: {e['name']} (run scripts/gamedata.py validate)", file=sys.stderr)
            return 1

    stats: Counter = Counter()
    if missing:
        print("not in roster:", missing, [i["name"] for i in items if "rown" in i["name"]])
        return 1
    for n in build_items:
        for k, v in by_name[n].get("stats", {}).items():
            stats[k] += v
    brim = by_name["Brimstone"]
    brim_syn = [s for s in syn if "Brimstone" in s["items"]]
    brim_syn.sort(key=lambda s: (ORDER.index(s["rating"]), -len(members(s)), s["id"]))
    tally_all = Counter(s["rating"] for s in syn)
    top_list = sorted(syn, key=lambda s: (ORDER.index(s["rating"]), -len(members(s)), s["id"]))[:14]

    def ids(s: dict) -> dict:
        return {
            "id": s["id"],
            "rating": s["rating"],
            "description": s["description"],
            "items": [[n, by_name[n]["id"]] for n in s["items"]],
            "trinkets": [[n, t_by_name[n]["id"]] for n in s["trinkets"]],
            "characters": s["characters"],
        }

    out = {
        "missing": missing,
        "build": {
            "character": c_by_name[character],
            "items": [{k: by_name[n].get(k) for k in ("id", "name", "quality", "effect", "stats", "type")} for n in build_items],
            "trinkets": [t_by_name[n] for n in build_trinkets],
        },
        "matched": [ids(s) for s in matched],
        "away": away_list[:10],
        "away_total": len(away_list),
        "stats": dict(stats),
        "brimstone": brim,
        "brimstone_synergies": [ids(s) for s in brim_syn[:12]],
        "brimstone_count": len(brim_syn),
        "brimstone_tally": dict(Counter(s["rating"] for s in brim_syn)),
        "list_total": len(syn),
        "list_tally": dict(tally_all),
        "list_top": [ids(s) for s in top_list],
    }
    Path(sys.argv[2]).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("missing:", missing, "matched:", len(matched), "away:", len(away_list))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
