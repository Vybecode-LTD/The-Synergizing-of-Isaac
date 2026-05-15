using System.Text.Json.Serialization;

namespace TheSynergizingOfIsaac.Models;

public sealed class AppSettings
{
    [JsonPropertyName("anthropicApiKey")]
    public string AnthropicApiKey { get; set; } = "";

    [JsonPropertyName("openAiApiKey")]
    public string OpenAiApiKey { get; set; } = "";

    [JsonPropertyName("geminiApiKey")]
    public string GeminiApiKey { get; set; } = "";

    [JsonPropertyName("selectedProvider")]
    public string SelectedProvider { get; set; } = "";
}
