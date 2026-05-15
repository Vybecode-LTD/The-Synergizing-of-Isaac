using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace TheSynergizingOfIsaac.Models;

public sealed class SynergyEntry
{
    [JsonPropertyName("items")]
    public List<string> Items { get; set; } = [];

    [JsonPropertyName("trinkets")]
    public List<string> Trinkets { get; set; } = [];

    [JsonPropertyName("characters")]
    public List<string> Characters { get; set; } = [];

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("rating")]
    public string Rating { get; set; } = "";
}
