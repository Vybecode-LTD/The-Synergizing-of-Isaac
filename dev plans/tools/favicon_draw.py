"""Draw the wind-up toy block on a 32px grid and write it as an SVG, one path per colour.

Usage (repo root): python "dev plans/tools/favicon_draw.py" web/public/favicon.svg

Colours are the Toy Box primitives from web/src/styles/tokens.css, converted from OKLCH to sRGB hex.
"""
import math
import sys
from pathlib import Path

# 32 columns x 32 rows. Legend below.
GRID = """
................................
..........KKKK....KKKK..........
.........KYYYYK..KYYYYK.........
.........KYYYYYYYYYYYYK.........
.........KYYYYKYYKYYYYK.........
..........KKKKKYYKKKKK..........
..............KYYK..............
..............KYYK..............
.....KKKKKKKKKKKKKKKKKKKKKK.....
....KTTTTTTTTTTTTTTTTTTTTTTK....
....KTTTTTTTTTTTTTTTTTTTTTTKSS..
....KKKKKKKKKKKKKKKKKKKKKKKKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
....KRWWRRRRRRRRRRRRRRRRRRRKSS..
....KRWRRRRRRRRRRRRRRRRRRRRKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
....KRRRRREERRRRRRRREERRRRRKSS..
....KRRRRREWRRRRRRRREWRRRRRKSS..
....KRRRRREERRRRRRRREERRRRRKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
....KRRRPPRRRERRRRERRRPPRRRKSS..
....KRRRRRRRRREEEERRRRRRRRRKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
....KRRRRRRRRRRRRRRRRRRRRRRKSS..
.....KKKKKKKKKKKKKKKKKKKKKKSSS..
......SSSSSSSSSSSSSSSSSSSSSSSS..
......SSSSSSSSSSSSSSSSSSSSSSSS..
................................
"""


def oklch_hex(l: float, c: float, h: float) -> str:
    a, b = c * math.cos(math.radians(h)), c * math.sin(math.radians(h))
    l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3
    rgb = (
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )

    def gamma(x: float) -> int:
        x = min(max(x, 0.0), 1.0)
        x = 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
        return round(x * 255)

    return "#" + "".join(f"{gamma(x):02x}" for x in rgb)


PALETTE = {  # legend letter: (token, oklch)
    "K": ("--neutral-900, the ink", (0.247, 0.053, 276)),
    "S": ("--neutral-900, the hard shadow", (0.247, 0.053, 276)),
    "E": ("--neutral-900, eyes and smile", (0.247, 0.053, 276)),
    "Y": ("--warning-500, the sun", (0.846, 0.169, 85)),
    "T": ("--accent-400, the lit top", (0.68, 0.17, 35)),
    "R": ("--accent-500, tomato", (0.61, 0.19, 34)),
    "P": ("--accent-300, cheeks", (0.76, 0.13, 36)),
    "W": ("--neutral-0, shine", (1.0, 0.0, 0)),
}


def runs(rows: list[str], letter: str) -> str:
    """Path data for every horizontal run of one letter."""
    parts = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            if row[x] == letter:
                start = x
                while x < len(row) and row[x] == letter:
                    x += 1
                parts.append(f"M{start} {y}h{x - start}v1h-{x - start}z")
            else:
                x += 1
    return "".join(parts)


def main(out: Path) -> None:
    rows = [r for r in GRID.strip("\n").split("\n")]
    assert len(rows) == 32 and all(len(r) == 32 for r in rows), [len(r) for r in rows]
    unknown = {ch for r in rows for ch in r} - set(PALETTE) - {"."}
    assert not unknown, unknown
    # One path per colour; letters that share a colour share a path.
    by_colour: dict[str, list[str]] = {}
    for letter, (_, lch) in PALETTE.items():
        by_colour.setdefault(oklch_hex(*lch), []).append(letter)
    lines = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">',
        "  <!-- isaac.toys's own mascot: a wind-up toy block, drawn on a 32px grid in the Toy Box colours",
        "       (tokens.css: neutral-900 ink, warning-500 sun, accent-300, 400 and 500 tomato, neutral-0). -->",
    ]
    for colour, letters in by_colour.items():
        data = "".join(runs(rows, letter) for letter in letters)
        if data:
            lines.append(f'  <path fill="{colour}" d="{data}"/>')
    lines.append("</svg>")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    for letter, (token, lch) in PALETTE.items():
        print(letter, oklch_hex(*lch), token)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
