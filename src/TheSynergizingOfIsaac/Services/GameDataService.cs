using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using TheSynergizingOfIsaac.Models;

namespace TheSynergizingOfIsaac.Services;

public sealed class GameDataService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public List<IsaacItem> Items { get; private set; } = [];
    public List<Trinket> Trinkets { get; private set; } = [];
    public List<Character> Characters { get; private set; } = [];
    public List<SynergyEntry> Synergies { get; private set; } = [];

    public async Task LoadAllAsync()
    {
        Items = await LoadJsonAsync<List<IsaacItem>>("items.json") ?? [];
        Trinkets = await LoadJsonAsync<List<Trinket>>("trinkets.json") ?? [];
        Characters = await LoadJsonAsync<List<Character>>("characters.json") ?? [];
        Synergies = await LoadJsonAsync<List<SynergyEntry>>("synergies.json") ?? [];
    }

    public void AddSynergy(SynergyEntry entry)
    {
        Synergies.Add(entry);
    }

    public async Task SaveSynergiesAsync()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Assets", "Data", "synergies.json");
        var json = JsonSerializer.Serialize(Synergies, WriteOptions);
        await File.WriteAllTextAsync(path, json);
    }

    private static readonly JsonSerializerOptions WriteOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    private static async Task<T?> LoadJsonAsync<T>(string filename)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Assets", "Data", filename);
        if (!File.Exists(path))
            return default;

        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions);
    }
}
