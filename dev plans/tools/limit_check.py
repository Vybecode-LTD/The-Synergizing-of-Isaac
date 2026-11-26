"""DEPLOY.md check 3 against the live site: the per-visitor limit holds behind Railway's edge.

SPENDS MONEY: at most seven paid analyses (five allowed, then two more only if both forged headers get
through, which is itself the failure this looks for). Run only with the owner's explicit OK for that run.

Every probe is a random three-item build nobody has asked for, so a 200 must say "cached": false. Fresh
builds are sent from this connection until the first refusal (at most six: five paid, one refused). Then
each forgeable header gets its own fresh build and its own random address; a 200 there means the forged
visitor got a new allowance. A 429 counts only with code "rate_limited"; "budget_exhausted" (the site's
cap) proves nothing.
"""
import ipaddress
import json
import random
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

SITE = "https://isaac.toys"
REPO = Path(__file__).resolve().parents[2]  # dev plans/tools/ -> the checkout this file is in
ITEMS = [i["id"] for i in json.loads((REPO / "data" / "items.json").read_text("utf-8"))]
# Forged visitors come from shared address space (100.64.0.0/10), a new one per probe: a fixed address
# would run out of allowance after a few runs and then pass by being refused.
FORGED_POOL = ipaddress.IPv4Network("100.64.0.0/10")
rng = random.Random(time.time_ns())
used: set[tuple[int, ...]] = set()


def fresh_build() -> list[int]:
    while True:
        build = tuple(sorted(rng.sample(ITEMS, 3)))
        if build not in used:
            used.add(build)
            return list(build)


def ask(items: list[int], extra: dict[str, str] | None = None) -> dict:
    body = json.dumps({"items": items}).encode()
    headers = {"content-type": "application/json", "user-agent": "isaac-toys-deploy-check", **(extra or {})}
    request = urllib.request.Request(f"{SITE}/api/analyze", data=body, headers=headers, method="POST")
    start = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=240) as reply:
            status, payload = reply.status, json.loads(reply.read())
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
        try:
            payload = json.loads(raw)
        except ValueError:
            payload = {"raw": raw[:200].decode("utf-8", "replace")}
    detail = payload.get("detail") if isinstance(payload.get("detail"), dict) else {}
    return {
        "items": items,
        "headers": extra or {},
        "status": status,
        "seconds": round(time.monotonic() - start, 1),
        "cached": payload.get("cached"),
        "remaining": payload.get("remaining"),
        "limit": payload.get("limit"),
        "code": detail.get("code"),
        "text_start": (payload.get("text") or "")[:70].replace("\n", " "),
    }


log: list[dict] = []
verdicts: list[str] = []

# Part 1: fresh builds from this connection until refused.
for n in range(1, 7):
    result = ask(fresh_build())
    log.append(result)
    print(f"own {n}: {result['status']} cached={result['cached']} remaining={result['remaining']} "
          f"code={result['code']} {result['seconds']}s {result['text_start']!r}", flush=True)
    if result["status"] != 200:
        break
    if result["cached"] is not False:
        # Starts with INCONCLUSIVE so the exit code fails the run (review finding, Codex, PR #8).
        verdicts.append(f"INCONCLUSIVE own {n}: a fresh build came back cached={result['cached']}")
paid = sum(1 for r in log if r["status"] == 200 and r["cached"] is False)
last = log[-1]
if last["status"] == 429 and last["code"] == "rate_limited":
    verdicts.append(f"limit holds: {paid} fresh analyses, then 429 rate_limited")
elif last["status"] == 429:
    verdicts.append(f"INCONCLUSIVE: 429 with code {last['code']!r} after {paid}; repeat after the UTC day turns")
else:
    verdicts.append(f"FAIL: six fresh builds, no refusal (last {last['status']})")

# Part 2: forged visitors, each with a fresh build. Only meaningful once this connection is refused.
if last["status"] == 429 and last["code"] == "rate_limited":
    for header in ("x-forwarded-for", "cf-connecting-ip"):
        forged = str(FORGED_POOL[rng.randrange(1, FORGED_POOL.num_addresses - 1)])
        result = ask(fresh_build(), {header: forged})
        log.append(result)
        print(f"forged {header}: {result['status']} cached={result['cached']} code={result['code']}", flush=True)
        if result["status"] == 429 and result["code"] == "rate_limited":
            verdicts.append(f"{header}: refused (429 rate_limited), as it must be")
        elif result["status"] == 200 and result["cached"] is False:
            verdicts.append(f"FAIL {header}: the forged visitor got a fresh paid analysis")
        else:
            verdicts.append(f"INCONCLUSIVE {header}: {result['status']} cached={result['cached']} code={result['code']}")

out = Path(tempfile.gettempdir()) / "limit_check_result.json"  # never inside the repo
out.write_text(json.dumps({"log": log, "verdicts": verdicts}, indent=2), encoding="utf-8")
print("\n".join(verdicts))
sys.exit(1 if any(v.startswith(("FAIL", "INCONCLUSIVE")) for v in verdicts) else 0)
