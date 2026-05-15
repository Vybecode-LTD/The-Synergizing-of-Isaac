using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using TheSynergizingOfIsaac.Models;

namespace TheSynergizingOfIsaac.Services;

public sealed class SynergyEngine
{
    private readonly List<SynergyEntry> _entries;

    public SynergyEngine(List<SynergyEntry> entries)
    {
        _entries = entries;
    }

    public string ComputeSynergies(
        IReadOnlyList<string> selectedItems,
        IReadOnlyList<string> selectedTrinkets,
        string? selectedCharacter)
    {
        var activeItems = selectedItems
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();

        var activeTrinkets = selectedTrinkets
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();

        int totalInputs = activeItems.Count + activeTrinkets.Count;
        if (totalInputs < 2)
            return string.Empty;

        var matches = new List<(SynergyEntry Entry, int Relevance)>();

        foreach (var entry in _entries)
        {
            int relevance = ScoreEntry(entry, activeItems, activeTrinkets, selectedCharacter);
            if (relevance > 0)
                matches.Add((entry, relevance));
        }

        if (matches.Count == 0)
            return BuildGenericSynergy(activeItems, activeTrinkets, selectedCharacter);

        matches.Sort((a, b) => b.Relevance.CompareTo(a.Relevance));

        var sb = new StringBuilder();
        foreach (var (entry, _) in matches)
        {
            if (sb.Length > 0)
                sb.AppendLine().AppendLine("---").AppendLine();

            sb.Append($"[{entry.Rating}] {entry.Description}");
        }

        return sb.ToString();
    }

    private static int ScoreEntry(
        SynergyEntry entry,
        List<string> activeItems,
        List<string> activeTrinkets,
        string? character)
    {
        int matchedItems = entry.Items.Count(entryItem =>
            activeItems.Any(ai => ai.Equals(entryItem, StringComparison.OrdinalIgnoreCase)));

        int matchedTrinkets = entry.Trinkets.Count(entryTrinket =>
            activeTrinkets.Any(at => at.Equals(entryTrinket, StringComparison.OrdinalIgnoreCase)));

        bool characterMatch = entry.Characters.Count == 0 ||
            (!string.IsNullOrEmpty(character) &&
             entry.Characters.Any(c => c.Equals(character, StringComparison.OrdinalIgnoreCase)));

        int requiredItemMatches = entry.Items.Count;
        int requiredTrinketMatches = entry.Trinkets.Count;

        if (matchedItems < requiredItemMatches || matchedTrinkets < requiredTrinketMatches)
            return 0;

        if (entry.Characters.Count > 0 && !characterMatch)
            return 0;

        return matchedItems + matchedTrinkets + (characterMatch && entry.Characters.Count > 0 ? 2 : 0);
    }

    private static string BuildGenericSynergy(
        List<string> items,
        List<string> trinkets,
        string? character)
    {
        var sb = new StringBuilder();
        sb.AppendLine("No specific synergies found in the database for this combination.");
        sb.AppendLine();
        sb.Append("Current loadout: ");
        sb.AppendLine(string.Join(", ", items.Concat(trinkets)));

        if (!string.IsNullOrEmpty(character))
            sb.AppendLine($"Playing as: {character}");

        sb.AppendLine();
        sb.Append("Tip: Synergy data is community-curated. If you know of an interaction, consider adding it to synergies.json!");

        return sb.ToString();
    }
}
