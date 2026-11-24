# The Synergizing of Isaac

A desktop companion app for **The Binding of Isaac: Repentance** that helps players discover and understand item synergies. Build hypothetical loadouts by selecting a character, up to three collectible items, and two trinkets, then instantly see which synergies are in play from a curated database of 458 community-contributed entries. Optionally toggle AI-powered analysis for deeper breakdowns of how your items interact mechanically.

## Features

### Loadout Builder
- **Character Selection** — Choose from all 34 playable characters (17 base + 17 tainted variants) with pixel-art sprites rendered at native resolution. Each character's stats (health, damage, speed, range, tears, luck) and starting items are tracked in the data.
- **3 Item Pedestal Slots** — Search the full 607-item database with type-ahead autocomplete. Each slot displays the item's sprite on a visual pedestal, plus a description card showing the item name, in-game quote, and detailed effect description.
- **2 Trinket Slots** — Search 171 trinkets with the same autocomplete system. Compact display with sprite and tooltip descriptions.

### Synergy Engine
- **Community-Curated Database** — 458 hand-written synergy entries describing how specific item/trinket/character combinations interact mechanically. Each entry includes a power rating (S/A/B/C/D tier).
- **Smart Matching** — The engine scores every synergy entry against your current loadout, requiring all of an entry's specified items and trinkets to be present. Character-specific synergies get a relevance boost. Results are ranked by specificity so the most relevant synergies appear first.
- **Instant Updates** — Synergies recompute every time you add, change, or remove any item, trinket, or character from your loadout.

### Add Synergy (User Contributions)
- **Chip-Based Multi-Select** — Add items, trinkets, and characters to your new synergy entry using the same autocomplete search as the main UI. Selected entries appear as removable chips.
- **Rating and Description** — Pick a power tier (S through D) and write a free-form description of the interaction.
- **Validation** — Requires at least 2 items/trinkets and a non-empty description.
- **Persisted to Disk** — New synergies are appended to `synergies.json` and the engine is immediately rebuilt, so your addition is active without restarting.

### AI Analysis (Optional)
- **Three Providers** — Supports Anthropic Claude (claude-sonnet-4-20250514), OpenAI GPT (gpt-4o-mini), and Google Gemini (gemini-2.0-flash). Configure API keys in the settings dialog.
- **Game-Aware Prompting** — The AI system prompt includes deep game mechanic context: tear modifier precedence hierarchy, fire rate categories, damage formula structure, and character-specific interaction notes.
- **Structured Output** — The AI responds with how tears/attacks will look and behave, key synergy interactions, an overall power rating, and any anti-synergies or caveats.
- **Debounced Requests** — 800ms debounce prevents API spam while you're still adjusting your loadout. In-flight requests are cancelled when the selection changes.

### Visual Design
- **Isaac-Inspired Dark Theme** — Deep navy-black backgrounds with warm parchment text, gold accents, and soft purple headers. Matches the game's basement aesthetic.
- **Mosaic Background** — A 12x12 grid of Binding of Isaac screenshots at variable opacity creates a textured depth effect behind the UI.
- **Pixel-Perfect Sprites** — All game sprites are rendered with nearest-neighbor interpolation to preserve the crisp pixel art at any display size.

## Requirements

- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) or later
- Windows, macOS, or Linux (Avalonia is cross-platform)
- (Optional) Python 3 + [Pillow](https://pypi.org/project/Pillow/) to regenerate the background mosaic

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/The-Synergizing-of-Isaac.git
cd The-Synergizing-of-Isaac

# Build
dotnet build src/TheSynergizingOfIsaac/TheSynergizingOfIsaac.csproj

# Run
dotnet run --project src/TheSynergizingOfIsaac/TheSynergizingOfIsaac.csproj
```

### Setting Up AI Analysis

1. Click the gear icon in the top-left corner of the main window.
2. Enter your API key for one or more providers (Anthropic, OpenAI, or Gemini).
3. Select your preferred provider using the radio buttons.
4. Click Save.
5. Back in the main window, toggle the "AI Analysis" button in the synergy panel to enable it.

API keys are stored locally at `%APPDATA%/TheSynergizingOfIsaac/settings.json` (Windows) and are never transmitted anywhere except to the selected AI provider's API endpoint.

### Regenerating the Background Mosaic

The background is pre-generated and committed. To regenerate it:

```bash
pip install Pillow
python build_mosaic.py
```

This downloads TBOI screenshots from Steam and RAWG, arranges them into a 12x12 grid at variable opacity, and saves the result to `Assets/Images/bg_mosaic.png`.

## Project Structure

```
TheSynergizingOfIsaac.sln               # Visual Studio solution
build_mosaic.py                          # Background mosaic generator (Python)
src/TheSynergizingOfIsaac/
  Program.cs                             # Entry point with crash logging
  App.axaml                              # Application root (dark theme, ViewLocator)
  Models/                                # Data models (AppSettings, Character, IsaacItem, SynergyEntry, Trinket)
  Services/                              # Business logic (GameDataService, SynergyEngine, AiService, SettingsService)
  ViewModels/                            # MVVM ViewModels (Main, Pedestal, Trinket, Settings, AddSynergy)
  Views/                                 # Avalonia AXAML views + code-behind
    Controls/                            # Reusable UserControls (PedestalControl, TrinketSlotControl)
  Assets/
    Data/                                # JSON databases (607 items, 171 trinkets, 34 characters, 458 synergies)
    Images/                              # Pixel-art sprites (989 items, 171 trinkets, 34 characters) + background
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | .NET 9.0 |
| UI Framework | Avalonia 12.0.3 |
| MVVM Toolkit | CommunityToolkit.Mvvm 8.4.1 |
| Theme | Avalonia.Themes.Fluent (Dark) |
| AI Integration | Raw HTTP to Anthropic, OpenAI, and Gemini REST APIs |
| Data Format | JSON (System.Text.Json) |
| Build Tool | dotnet CLI |

## Contributing Synergies

You can contribute synergy entries directly from the app:

1. Click the **"+ Add Synergy"** button in the synergy results panel.
2. Search and select the items involved (at least 2 items/trinkets required).
3. Optionally add trinkets and characters the synergy applies to.
4. Choose a power rating (S/A/B/C/D).
5. Write a clear description of what the combination does mechanically.
6. Click **Save Synergy**.

Your entry is immediately added to the local `synergies.json` database and will appear in synergy results for matching loadouts.

## License

This project is for personal and educational use. The Binding of Isaac is a trademark of Edmund McMillen. Game sprites and screenshots are property of their respective owners.
