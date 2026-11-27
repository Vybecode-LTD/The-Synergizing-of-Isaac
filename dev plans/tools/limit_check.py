"""DEPLOY.md check 3 against the live site: the per-visitor limit holds behind Railway's edge.

SPENDS MONEY: at most LIMIT + 2 paid analyses (LIMIT allowed, then two more only if both forged headers
get through, which is itself the failure this looks for). Run only with the owner's explicit OK for that
run. LIMIT must match `AI_PER_VISITOR_PER_DAY` on Railway; if the site's answer reports another limit,
the run stops there. `--self-test` checks the verdicts on made-up runs and sends nothing.

Every probe is a random three-item build nobody has asked for, so a 200 must say "cached": false. Fresh
builds are sent from this connection until the first refusal (at most LIMIT + 1). The limit holds only
when the last answer before the refusal reported the expected limit and "remaining": 0, so a connection
that used some of its allowance earlier that day still passes, and one refused before any answer proves
nothing. Then each forgeable header gets its own fresh build and its own random address; a 200 there
means the forged visitor got a new allowance. A 429 counts only with code "rate_limited";
"budget_exhausted" (the site's cap) proves nothing.
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
LIMIT = 10  # AI_PER_VISITOR_PER_DAY on Railway, raised from 5 on 2026-11-26 (docs/decisions/0003)
REPO = Path(__file__).resolve().parents[2]  # dev plans/tools/ -> the checkout this file is in
# Forged visitors come from shared address space (100.64.0.0/10), a new one per probe: a fixed address
# would run out of allowance after a few runs and then pass by being refused.
FORGED_POOL = ipaddress.IPv4Network("100.64.0.0/10")


def own_verdicts(log: list[dict], limit: int) -> tuple[list[str], bool]:
    """Verdicts on this connection's run, and whether it ended refused by the visitor limit as it must."""
    verdicts = [
        f"INCONCLUSIVE own {n}: a fresh build came back cached={r['cached']}"
        for n, r in enumerate(log, 1)
        if r["status"] == 200 and r["cached"] is not False
    ]
    answered = [r for r in log if r["status"] == 200]
    paid = sum(1 for r in answered if r["cached"] is False)
    last = log[-1]
    if answered and answered[-1]["limit"] != limit:
        # The run stopped at the first such answer, before the site could refuse: no verdict on refusal.
        verdicts.append(f"INCONCLUSIVE: the site reports limit {answered[-1]['limit']}, this check expects {limit}")
        return verdicts, False
    if last["status"] == 429 and last["code"] == "rate_limited":
        if not answered:
            verdicts.append(
                "INCONCLUSIVE: refused before any answer, so the limit was never seen; "
                "repeat after the UTC day turns (7 pm EST)"
            )
        elif answered[-1]["remaining"] != 0:
            verdicts.append(f"FAIL: refused while the last answer said {answered[-1]['remaining']} of {limit} left")
        else:
            verdicts.append(f"limit holds: {paid} fresh analyses until 0 of {limit} were left, then 429 rate_limited")
        return verdicts, True
    if last["status"] == 429:
        verdicts.append(f"INCONCLUSIVE: 429 with code {last['code']!r} after {paid}; repeat after the UTC day turns")
    else:
        verdicts.append(f"FAIL: {len(log)} fresh builds, no refusal (last {last['status']})")
    return verdicts, False


def self_test() -> int:
    """The verdicts on made-up runs, each with the outcome it must have. Sends nothing."""

    def ok(remaining: int, limit: int = LIMIT, cached: bool = False) -> dict:
        return {"status": 200, "cached": cached, "remaining": remaining, "limit": limit, "code": None}

    refused = {"status": 429, "cached": None, "remaining": None, "limit": None, "code": "rate_limited"}
    budget = {"status": 429, "cached": None, "remaining": None, "limit": None, "code": "budget_exhausted"}
    full = [ok(r) for r in range(LIMIT - 1, -1, -1)]
    cases = [
        ("a full allowance, then refused", [*full, refused], "limit holds", True),
        ("half used earlier today, then refused", [*full[LIMIT // 2 :], refused], "limit holds", True),
        ("refused before any answer", [refused], "INCONCLUSIVE: refused before", True),
        ("refused with some left", [ok(LIMIT - 1), ok(LIMIT - 2), refused], "FAIL: refused while", True),
        ("never refused", [*full, ok(0)], "FAIL: 11 fresh builds", False),
        ("another limit reported", [ok(4, limit=5)], "INCONCLUSIVE: the site reports limit 5", False),
        ("the site's cap, not the visitor's", [ok(LIMIT - 1), budget], "INCONCLUSIVE: 429 with code", False),
        (
            "a fresh build came back cached",
            [ok(LIMIT - 1, cached=True), *full[1:], refused],
            "INCONCLUSIVE own 1",
            True,
        ),
    ]
    failures = 0
    for name, log, expected, refused_as_it_must in cases:
        verdicts, got_refused = own_verdicts(log, LIMIT)
        good = any(v.startswith(expected) for v in verdicts) and got_refused == refused_as_it_must
        # A mismatch must not also claim the site failed to refuse (CodeRabbit, PR #11).
        good = good and not (expected.startswith("INCONCLUSIVE: the site") and any("no refusal" in v for v in verdicts))
        failures += not good
        print(f"{'ok  ' if good else 'FAIL'}  {name}: {verdicts}")
    print(f"{len(cases) - failures} of {len(cases)} self-test cases pass")
    return 1 if failures else 0


def main() -> int:
    items = [i["id"] for i in json.loads((REPO / "data" / "items.json").read_text("utf-8"))]
    rng = random.Random(time.time_ns())
    used: set[tuple[int, ...]] = set()

    def fresh_build() -> list[int]:
        while True:
            build = tuple(sorted(rng.sample(items, 3)))
            if build not in used:
                used.add(build)
                return list(build)

    def ask(build: list[int], extra: dict[str, str] | None = None) -> dict:
        body = json.dumps({"items": build}).encode()
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
            "items": build,
            "headers": extra or {},
            "status": status,
            "seconds": round(time.monotonic() - start, 1),
            "cached": payload.get("cached"),
            "remaining": payload.get("remaining"),
            "limit": payload.get("limit"),
            "code": detail.get("code"),
            # The answer's verdict line (PR #12 turned the plain text into sections), for the log only.
            "text_start": str(((payload.get("read") or {}).get("verdict") or {}).get("why") or "")[:70],
        }

    # Part 1: fresh builds from this connection until refused, or until an answer reports another limit.
    log: list[dict] = []
    for n in range(1, LIMIT + 2):
        result = ask(fresh_build())
        log.append(result)
        print(
            f"own {n}: {result['status']} cached={result['cached']} remaining={result['remaining']} "
            f"limit={result['limit']} code={result['code']} {result['seconds']}s {result['text_start']!r}",
            flush=True,
        )
        if result["status"] != 200 or result["limit"] != LIMIT:
            break
    verdicts, refused = own_verdicts(log, LIMIT)

    # Part 2: forged visitors, each with a fresh build. Only meaningful once this connection is refused.
    if refused:
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
                verdicts.append(
                    f"INCONCLUSIVE {header}: {result['status']} cached={result['cached']} code={result['code']}"
                )

    out = Path(tempfile.gettempdir()) / "limit_check_result.json"  # never inside the repo
    out.write_text(json.dumps({"log": log, "verdicts": verdicts}, indent=2), encoding="utf-8")
    print("\n".join(verdicts))
    return 1 if any(v.startswith(("FAIL", "INCONCLUSIVE")) for v in verdicts) else 0


if __name__ == "__main__":
    sys.exit(self_test() if "--self-test" in sys.argv else main())
