using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace TheSynergizingOfIsaac.Models;

public sealed class Character
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("health")]
    public string Health { get; set; } = "";

    [JsonPropertyName("damage")]
    public double Damage { get; set; }

    [JsonPropertyName("speed")]
    public double Speed { get; set; }

    [JsonPropertyName("range")]
    public double Range { get; set; }

    [JsonPropertyName("tears")]
    public double Tears { get; set; }

    [JsonPropertyName("luck")]
    public double Luck { get; set; }

    [JsonPropertyName("startingItems")]
    public List<string> StartingItems { get; set; } = [];

    [JsonPropertyName("imageName")]
    public string ImageName { get; set; } = "";

    public override string ToString() => Name;
}
