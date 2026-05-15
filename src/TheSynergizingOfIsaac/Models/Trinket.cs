using System.Text.Json.Serialization;

namespace TheSynergizingOfIsaac.Models;

public sealed class Trinket
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("imageName")]
    public string ImageName { get; set; } = "";

    public override string ToString() => Name;
}
