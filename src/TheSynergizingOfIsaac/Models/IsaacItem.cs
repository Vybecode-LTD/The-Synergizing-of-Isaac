using System.Text.Json.Serialization;

namespace TheSynergizingOfIsaac.Models;

public sealed class IsaacItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("quote")]
    public string Quote { get; set; } = "";

    [JsonPropertyName("quality")]
    public int Quality { get; set; }

    [JsonPropertyName("imageName")]
    public string ImageName { get; set; } = "";

    public override string ToString() => Name;
}
