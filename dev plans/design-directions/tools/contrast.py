"""Contrast of every text-on-background pair the three directions use."""

from __future__ import annotations


def lum(h: str) -> float:
    c = [int(h.lstrip("#")[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a: str, b: str) -> float:
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


PAIRS = {
    "A Pedestal": [
        ("bone on cellar", "#EFE6D6", "#15110E", 4.5),
        ("ash on cellar", "#B3A692", "#15110E", 4.5),
        ("ash on stone", "#B3A692", "#231C17", 4.5),
        ("ash on plinth", "#B3A692", "#2F2620", 4.5),
        ("bone on plinth", "#EFE6D6", "#2F2620", 4.5),
        ("candle on cellar", "#F0A43A", "#15110E", 4.5),
        ("candle on stone", "#F0A43A", "#231C17", 4.5),
        ("cellar on candle (S)", "#15110E", "#F0A43A", 4.5),
        ("cellar on gilt (A)", "#15110E", "#D8C49A", 4.5),
        ("cellar on verdigris (B)", "#15110E", "#8DB5A2", 4.5),
        ("cellar on ash (C)", "#15110E", "#A39684", 4.5),
        ("bone on ember (D)", "#FFF4E6", "#A8361F", 4.5),
        ("cellar on candle button", "#15110E", "#F0A43A", 4.5),
    ],
    "B Toy Box": [
        ("ink on chalk", "#1A1E3A", "#EEF1F8", 4.5),
        ("ink-muted on chalk", "#474D6E", "#EEF1F8", 4.5),
        ("ink-muted on white", "#474D6E", "#FFFFFF", 4.5),
        ("ink-muted on tray", "#474D6E", "#DCE2F0", 4.5),
        ("ink on sun (S)", "#1A1E3A", "#FFC21A", 4.5),
        ("white on pool (A)", "#FFFFFF", "#1F5FE0", 4.5),
        ("ink on mint (B)", "#1A1E3A", "#2FCB8E", 4.5),
        ("ink on cloud (C)", "#1A1E3A", "#C9D0E2", 4.5),
        ("white on grape (D)", "#FFFFFF", "#6B3FD4", 4.5),
        ("white on tomato button", "#FFFFFF", "#C93A17", 4.5),
        ("ink on tomato-soft", "#1A1E3A", "#FFD9CC", 4.5),
        ("white on ink", "#FFFFFF", "#1A1E3A", 4.5),
    ],
    "C Almanac": [
        ("ink on paper", "#1C2230", "#F3F3EE", 4.5),
        ("ink-2 on paper", "#545A66", "#F3F3EE", 4.5),
        ("ink-2 on page", "#545A66", "#FBFBF8", 4.5),
        ("stamp red on page (S)", "#B42318", "#FBFBF8", 4.5),
        ("navy on page (A)", "#22407A", "#FBFBF8", 4.5),
        ("moss on page (B)", "#2C6A3D", "#FBFBF8", 4.5),
        ("slate on page (C)", "#5F646D", "#FBFBF8", 4.5),
        ("plum on page (D)", "#6A3C8E", "#FBFBF8", 4.5),
        ("page on ink button", "#FBFBF8", "#1C2230", 4.5),
        ("stamp red on paper", "#B42318", "#F3F3EE", 4.5),
    ],
}

for name, rows in PAIRS.items():
    print(name)
    for label, fg, bg, need in rows:
        r = ratio(fg, bg)
        print(f"  {'ok  ' if r >= need else 'FAIL'} {r:5.2f}  {label}")
