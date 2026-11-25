# dev plans

Plans, contracts, design sources and starting prompts for this project.

| File | What it is |
|---|---|
| `contracts/toy-box-redesign.md` | Contract for the Toy Box redesign (decision 0005). Approved 2026-11-25; built in PR #3, with the changes made while building at its end |
| `design-directions/README.md` | Three redesign directions (A Pedestal, B Toy Box, C Almanac), their palettes and fonts. Live canvas: <https://claude.ai/artifact/CPYw7whXXpWSkxp2gKGqke> (private until shared) |
| `design-directions/canvas/` | The canvas's board sources (`.dc.html`) and `canvas.json`, copied from what was published |
| `design-directions/tools/` | `sample_build.py` (pulls the boards' real content from `data/`), `contrast.py` (palette contrast) |
| `NEXT_SESSION_PROMPT.md` | The starting prompt for the next agent. Overwritten at the end of every session |
| `contracts/web-app-seams.md` | Contract for the web app's seams: build-link format, `/api/analyze`, the SQLite tables, public URLs, environment variables. Status: draft, with open questions for the owner |

Decisions are in `docs/decisions/`, the current state in `docs/HANDOFF.md`.
