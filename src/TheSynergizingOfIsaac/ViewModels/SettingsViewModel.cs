using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TheSynergizingOfIsaac.Models;
using TheSynergizingOfIsaac.Services;

namespace TheSynergizingOfIsaac.ViewModels;

public partial class SettingsViewModel : ViewModelBase
{
    private readonly SettingsService _settingsService;

    [ObservableProperty]
    private string _anthropicApiKey = "";

    [ObservableProperty]
    private string _openAiApiKey = "";

    [ObservableProperty]
    private string _geminiApiKey = "";

    [ObservableProperty]
    private bool _isAnthropicSelected;

    [ObservableProperty]
    private bool _isOpenAiSelected;

    [ObservableProperty]
    private bool _isGeminiSelected;

    public bool Saved { get; private set; }

    public SettingsViewModel(SettingsService settingsService)
    {
        _settingsService = settingsService;
        var s = _settingsService.Load();

        AnthropicApiKey = s.AnthropicApiKey;
        OpenAiApiKey = s.OpenAiApiKey;
        GeminiApiKey = s.GeminiApiKey;

        IsAnthropicSelected = s.SelectedProvider == "anthropic";
        IsOpenAiSelected = s.SelectedProvider == "openai";
        IsGeminiSelected = s.SelectedProvider == "gemini";

        // Default to Anthropic if nothing selected
        if (!IsAnthropicSelected && !IsOpenAiSelected && !IsGeminiSelected)
            IsAnthropicSelected = true;
    }

    [RelayCommand]
    private void Save()
    {
        var provider = IsAnthropicSelected ? "anthropic" :
                       IsOpenAiSelected ? "openai" :
                       IsGeminiSelected ? "gemini" : "";

        _settingsService.Save(new AppSettings
        {
            AnthropicApiKey = AnthropicApiKey,
            OpenAiApiKey = OpenAiApiKey,
            GeminiApiKey = GeminiApiKey,
            SelectedProvider = provider
        });
        Saved = true;
    }
}
