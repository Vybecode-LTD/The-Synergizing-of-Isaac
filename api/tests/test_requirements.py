"""The image installs api/requirements.txt only (Dockerfile), so every package app/ imports must come from it."""

from __future__ import annotations

import ast
import importlib.metadata as metadata
import re
import sys
from pathlib import Path

API = Path(__file__).resolve().parents[1]


def _canon(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def _name(requirement: str) -> str:
    return _canon(re.split(r"[<>=!~;\[ ]", requirement.strip(), maxsplit=1)[0])


def _imported() -> set[str]:
    names: set[str] = set()
    for path in (API / "app").glob("*.py"):
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Import):
                names |= {alias.name.split(".")[0] for alias in node.names}
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                names.add(node.module.split(".")[0])
    return {n for n in names if n not in sys.stdlib_module_names and n != "app"}


def _installed_by_requirements() -> set[str]:
    """Every distribution requirements.txt brings in: its lines, and what they require, all the way down."""
    lines = (API / "requirements.txt").read_text(encoding="utf-8").splitlines()
    todo = [_name(line) for line in lines if line.strip() and not line.lstrip().startswith(("#", "-"))]
    seen: set[str] = set()
    while todo:
        dist = todo.pop()
        if dist in seen:
            continue
        seen.add(dist)
        try:
            requires = metadata.requires(dist) or []
        except metadata.PackageNotFoundError:
            continue
        todo += [_name(r) for r in requires if "extra ==" not in r]
    return seen


def test_every_package_the_app_imports_comes_from_the_runtime_requirements() -> None:
    """Finding (PR #14, CI's docker job): wiki.py imported httpx, which only requirements-dev.txt installed,
    so the image Railway runs crashed at start-up while every test here passed."""
    owners = metadata.packages_distributions()
    needed = {_canon(owners[name][0]) for name in _imported()}
    assert needed, "found no third-party imports: the scan is broken"
    assert "fastapi" in needed  # a positive control: the scan sees a direct requirement
    missing = needed - _installed_by_requirements()
    assert not missing, f"imported by app/ but not installed by requirements.txt: {sorted(missing)}"
