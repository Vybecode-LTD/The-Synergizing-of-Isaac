# Onboarding — The Synergizing of Isaac

## Quick Summary

This is a **.NET 9 / Avalonia 12 desktop app** — a companion tool for *The Binding of Isaac: Repentance*. Users build hypothetical item loadouts and see matching synergies from a 458-entry curated database, with optional AI analysis via Anthropic/OpenAI/Gemini.

## How to Build

```bash
dotnet build src/TheSynergizingOfIsaac/TheSynergizingOfIsaac.csproj
dotnet run --project src/TheSynergizingOfIsaac/TheSynergizingOfIsaac.csproj
```

No special setup needed. NuGet packages restore automatically. The `.csproj` copies `Assets/Data/` and `Assets/Images/` to the output directory.

## Architecture at a Glance

**MVVM with CommunityToolkit.Mvvm** (source-generated `[ObservableProperty]` + `[RelayCommand]`).

```
Models/          # POCOs: IsaacItem, Trinket, Character, SynergyEntry, AppSettings
Services/        # GameDataService (JSON I/O), SynergyEngine (matching), AiService (3 LLM providers), SettingsService
ViewModels/      # MainWindowViewModel (orchestrator), PedestalSlotViewModel, TrinketSlotViewModel, SettingsViewModel, AddSynergyViewModel
Views/           # Avalonia AXAML + code-behind. Dialogs use callback pattern (VM exposes Func<Task>, View sets it)
  Controls/      # PedestalControl, TrinketSlotControl (reusable UserControls)
Assets/Data/     # JSON databases: 607 items, 171 trinkets, 34 characters, 458 synergies
Assets/Images/   # 989 item sprites, 171 trinket sprites, 34 character sprites, 1 background mosaic
```

## Key Files to Know

| File | What it does |
|------|-------------|
| `MainWindowViewModel.cs` | Central orchestrator — owns pedestal/trinket VMs, character selection, synergy computation, AI toggle, add-synergy dialog |
| `SynergyEngine.cs` | Scoring algorithm — matches all 458 entries against the current loadout, ranks by relevance |
| `AiService.cs` | HTTP calls to Anthropic/OpenAI/Gemini with game-aware system prompt |
| `GameDataService.cs` | Loads all JSON at startup; writes synergies back when user adds new ones |
| `AddSynergyViewModel.cs` | Chip-based multi-select form with validation (needs 2+ items/trinkets, non-empty description) |
| `MainWindow.axaml` | Primary UI layout — title bar, character panel, 3 pedestals, 2 trinkets, synergy panel with AI toggle + add synergy button |
| `synergies.json` | The synergy database that the engine queries and users can append to |

## Avalonia Gotchas

- **Version 12** does NOT have `ItemsRepeater` or `WrapLayout`. Use `ItemsControl` + `WrapPanel` in `ItemsPanelTemplate`.
- **Compiled bindings** are on globally. Every AXAML file needs `x:DataType`.
- **AutoCompleteBox** clear: can't do it via binding. Code-behind subscribes to VM `ClearRequested` event and imperatively sets `Text = ""`.
- **Images load from disk** at runtime (`new Bitmap(path)`), not as Avalonia embedded resources.

## Data Format

**synergies.json** entries look like:
```json
{
  "items": ["Brimstone", "Tammy's Head"],
  "trinkets": [],
  "characters": [],
  "description": "Using Tammy's Head fires 10 Brimstone lasers...",
  "rating": "S"
}
```

**items.json**: `{ "id": 1, "name": "The Sad Onion", "description": "Tears up", "quote": "Tears up", "quality": 1, "imageName": "collectibles_001.png" }`

**trinkets.json**: `{ "id": 1, "name": "Swallowed Penny", "description": "Spawns a coin when Isaac takes damage.", "imageName": "trinket_001.png" }`

**characters.json**: `{ "name": "Isaac", "health": "3 Red Hearts", "damage": 3.5, "speed": 1.0, "range": 6.5, "tears": 1.0, "luck": 0.0, "startingItems": ["The D6"], "imageName": "isaac.png" }`

## UI Theme

Dark Isaac-inspired palette. Key colors: background `#1a1a2e`, text `#e0d5c1`, gold accent `#c9a96e`, purple headers `#8888cc`. All sprites use `BitmapInterpolationMode="None"` (nearest-neighbor).

## Settings

API keys stored at `%APPDATA%/TheSynergizingOfIsaac/settings.json`. Fields: `anthropicApiKey`, `openAiApiKey`, `geminiApiKey`, `selectedProvider`.

## Current Feature Set

1. Character select (34 chars with sprites)
2. 3 item pedestals (607 items, autocomplete + sprite + description card)
3. 2 trinket slots (171 trinkets, autocomplete + sprite)
4. Synergy matching engine (458 entries, ranked by relevance)
5. AI analysis toggle (Anthropic/OpenAI/Gemini, 800ms debounce)
6. Add Synergy dialog (chip multi-select, rating, description, saves to disk + rebuilds engine)
7. Settings dialog (API keys + provider selection)
8. Background mosaic (12x12 TBOI screenshots, variable opacity)
9. Clear All button
