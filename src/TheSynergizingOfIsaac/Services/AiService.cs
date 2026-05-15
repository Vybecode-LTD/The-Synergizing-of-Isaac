using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using TheSynergizingOfIsaac.Models;

namespace TheSynergizingOfIsaac.Services;

public sealed class AiService
{
    private static readonly HttpClient Http = new()
    {
        Timeout = TimeSpan.FromSeconds(45)
    };

    private const string SystemPrompt =
        """
        You are an expert on The Binding of Isaac: Repentance. You have deep knowledge of every item interaction, synergy, and game mechanic.

        Key game mechanics to consider in your analysis:
        - Tear modifier precedence (highest overrides lower): Epic Fetus > Brimstone > Dr. Fetus > Monstro's Lung > Technology > Mom's Knife > default tears
        - Items sharing a precedence tier may combine (e.g. Brimstone + Technology = laser with Technology targeting)
        - Fire rate categories: A (tear delay, additive), B (direct flat additions), C (multipliers <1, speed up), D (multipliers >1, slow down)
        - Damage formula: (base + flat bonuses) * multipliers
        - Some items have unique character-specific interactions (e.g. Brimstone on Azazel, Birthright effects)
        - Certain trinkets modify item behavior in subtle ways

        Provide a concise, practical analysis. Focus on what the combination actually DOES mechanically. Keep response under 200 words.
        """;

    public async Task<string> AnalyzeSynergyAsync(
        AppSettings settings,
        List<string> items,
        List<string> trinkets,
        string? character,
        CancellationToken ct = default)
    {
        var (providerName, apiKey) = ResolveProvider(settings);
        if (providerName is null || apiKey is null)
            return "No AI provider configured. Open Settings to add an API key.";

        var userPrompt = BuildUserPrompt(items, trinkets, character);

        try
        {
            return providerName switch
            {
                "anthropic" => await CallAnthropicAsync(apiKey, userPrompt, ct),
                "openai" => await CallOpenAiAsync(apiKey, userPrompt, ct),
                "gemini" => await CallGeminiAsync(apiKey, userPrompt, ct),
                _ => "Unknown provider configured."
            };
        }
        catch (OperationCanceledException)
        {
            throw; // Let caller handle cancellation
        }
        catch (HttpRequestException ex)
        {
            return $"Network error: {ex.Message}";
        }
        catch (JsonException)
        {
            return "Failed to parse AI response.";
        }
        catch (Exception ex)
        {
            return $"Error: {ex.Message}";
        }
    }

    private static (string? name, string? key) ResolveProvider(AppSettings settings)
    {
        // Try selected provider first
        if (!string.IsNullOrWhiteSpace(settings.SelectedProvider))
        {
            var key = settings.SelectedProvider switch
            {
                "anthropic" => settings.AnthropicApiKey,
                "openai" => settings.OpenAiApiKey,
                "gemini" => settings.GeminiApiKey,
                _ => null
            };
            if (!string.IsNullOrWhiteSpace(key))
                return (settings.SelectedProvider, key);
        }

        // Fall back to first provider that has a key
        if (!string.IsNullOrWhiteSpace(settings.AnthropicApiKey))
            return ("anthropic", settings.AnthropicApiKey);
        if (!string.IsNullOrWhiteSpace(settings.OpenAiApiKey))
            return ("openai", settings.OpenAiApiKey);
        if (!string.IsNullOrWhiteSpace(settings.GeminiApiKey))
            return ("gemini", settings.GeminiApiKey);

        return (null, null);
    }

    private static string BuildUserPrompt(List<string> items, List<string> trinkets, string? character)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Analyze this Binding of Isaac item combination:");
        sb.AppendLine();

        if (items.Count > 0)
            sb.AppendLine($"Items: {string.Join(", ", items)}");
        if (trinkets.Count > 0)
            sb.AppendLine($"Trinkets: {string.Join(", ", trinkets)}");
        if (!string.IsNullOrWhiteSpace(character))
            sb.AppendLine($"Character: {character}");

        sb.AppendLine();
        sb.AppendLine("Explain:");
        sb.AppendLine("1. How the tears/attacks will look and behave");
        sb.AppendLine("2. Key synergy interactions between the items");
        sb.AppendLine("3. Overall power rating (S/A/B/C/D tier)");
        sb.AppendLine("4. Any anti-synergies or things to watch out for");

        return sb.ToString();
    }

    private static async Task<string> CallAnthropicAsync(string apiKey, string userPrompt, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");

        var body = JsonSerializer.Serialize(new
        {
            model = "claude-sonnet-4-20250514",
            max_tokens = 1024,
            system = SystemPrompt,
            messages = new[] { new { role = "user", content = userPrompt } }
        });
        request.Content = new StringContent(body, Encoding.UTF8, "application/json");

        using var response = await Http.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            if ((int)response.StatusCode == 401)
                return "Invalid Anthropic API key. Check your key in Settings.";
            return $"Anthropic API error ({(int)response.StatusCode}): {ExtractError(json)}";
        }

        using var doc = JsonDocument.Parse(json);
        var content = doc.RootElement.GetProperty("content");
        return content.GetArrayLength() > 0
            ? content[0].GetProperty("text").GetString() ?? ""
            : "";
    }

    private static async Task<string> CallOpenAiAsync(string apiKey, string userPrompt, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        request.Headers.Add("Authorization", $"Bearer {apiKey}");

        var body = JsonSerializer.Serialize(new
        {
            model = "gpt-4o-mini",
            messages = new object[]
            {
                new { role = "system", content = SystemPrompt },
                new { role = "user", content = userPrompt }
            },
            max_tokens = 1024
        });
        request.Content = new StringContent(body, Encoding.UTF8, "application/json");

        using var response = await Http.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            if ((int)response.StatusCode == 401)
                return "Invalid OpenAI API key. Check your key in Settings.";
            return $"OpenAI API error ({(int)response.StatusCode}): {ExtractError(json)}";
        }

        using var doc = JsonDocument.Parse(json);
        var choices = doc.RootElement.GetProperty("choices");
        return choices.GetArrayLength() > 0
            ? choices[0].GetProperty("message").GetProperty("content").GetString() ?? ""
            : "";
    }

    private static async Task<string> CallGeminiAsync(string apiKey, string userPrompt, CancellationToken ct)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";
        using var request = new HttpRequestMessage(HttpMethod.Post, url);

        // Gemini doesn't have a separate system role in the basic API — prepend to prompt
        var fullPrompt = SystemPrompt + "\n\n" + userPrompt;
        var body = JsonSerializer.Serialize(new
        {
            contents = new[] { new { parts = new[] { new { text = fullPrompt } } } }
        });
        request.Content = new StringContent(body, Encoding.UTF8, "application/json");

        using var response = await Http.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            if ((int)response.StatusCode is 400 or 403)
                return "Invalid Gemini API key. Check your key in Settings.";
            return $"Gemini API error ({(int)response.StatusCode}): {ExtractError(json)}";
        }

        using var doc = JsonDocument.Parse(json);
        var candidates = doc.RootElement.GetProperty("candidates");
        if (candidates.GetArrayLength() > 0)
        {
            var parts = candidates[0].GetProperty("content").GetProperty("parts");
            if (parts.GetArrayLength() > 0)
                return parts[0].GetProperty("text").GetString() ?? "";
        }
        return "";
    }

    private static string ExtractError(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("error", out var error))
            {
                if (error.TryGetProperty("message", out var msg))
                    return msg.GetString() ?? "Unknown error";
                if (error.ValueKind == JsonValueKind.String)
                    return error.GetString() ?? "Unknown error";
            }
        }
        catch { }
        return "Unknown error";
    }
}
