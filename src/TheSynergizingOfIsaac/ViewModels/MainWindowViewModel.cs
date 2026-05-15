using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Avalonia.Media.Imaging;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TheSynergizingOfIsaac.Models;
using TheSynergizingOfIsaac.Services;

namespace TheSynergizingOfIsaac.ViewModels;

public partial class MainWindowViewModel : ViewModelBase
{
    private readonly GameDataService _dataService = new();
    private readonly SettingsService _settingsService = new();
    private readonly AiService _aiService = new();
    private SynergyEngine? _synergyEngine;
    private CancellationTokenSource? _aiCts;

    [ObservableProperty]
    private bool _isLoading = true;

    [ObservableProperty]
    private Bitmap? _backgroundImage;

    [ObservableProperty]
    private PedestalSlotViewModel _pedestal1 = null!;

    [ObservableProperty]
    private PedestalSlotViewModel _pedestal2 = null!;

    [ObservableProperty]
    private PedestalSlotViewModel _pedestal3 = null!;

    [ObservableProperty]
    private TrinketSlotViewModel _trinket1 = null!;

    [ObservableProperty]
    private TrinketSlotViewModel _trinket2 = null!;

    [ObservableProperty]
    private List<Character> _characters = [];

    [ObservableProperty]
    private Character? _selectedCharacter;

    [ObservableProperty]
    private Bitmap? _characterImage;

    [ObservableProperty]
    private string _synergyText = "";

    // AI mode properties
    [ObservableProperty]
    private bool _isAiModeEnabled;

    [ObservableProperty]
    private string _aiAnalysisText = "";

    [ObservableProperty]
    private bool _isAiLoading;

    /// <summary>
    /// Callback set by the View to show the settings dialog.
    /// The ViewModel doesn't reference Views directly (MVVM pattern).
    /// </summary>
    public Func<Task>? ShowSettingsDialog { get; set; }

    public MainWindowViewModel()
    {
        Pedestal1 = new PedestalSlotViewModel("I", [], UpdateSynergies);
        Pedestal2 = new PedestalSlotViewModel("II", [], UpdateSynergies);
        Pedestal3 = new PedestalSlotViewModel("III", [], UpdateSynergies);
        Trinket1 = new TrinketSlotViewModel("T1", [], UpdateSynergies);
        Trinket2 = new TrinketSlotViewModel("T2", [], UpdateSynergies);
    }

    public async Task InitializeAsync()
    {
        IsLoading = true;
        try
        {
            await _dataService.LoadAllAsync();

            Characters = _dataService.Characters;
            _synergyEngine = new SynergyEngine(_dataService.Synergies);

            Pedestal1 = new PedestalSlotViewModel("I", _dataService.Items, UpdateSynergies);
            Pedestal2 = new PedestalSlotViewModel("II", _dataService.Items, UpdateSynergies);
            Pedestal3 = new PedestalSlotViewModel("III", _dataService.Items, UpdateSynergies);
            Trinket1 = new TrinketSlotViewModel("T1", _dataService.Trinkets, UpdateSynergies);
            Trinket2 = new TrinketSlotViewModel("T2", _dataService.Trinkets, UpdateSynergies);

            LoadBackgroundImage();
        }
        finally
        {
            IsLoading = false;
        }
    }

    partial void OnSelectedCharacterChanged(Character? value)
    {
        LoadCharacterImage(value);
        UpdateSynergies();
    }

    partial void OnIsAiModeEnabledChanged(bool value)
    {
        if (value)
        {
            RequestAiAnalysis();
        }
        else
        {
            _aiCts?.Cancel();
            AiAnalysisText = "";
            IsAiLoading = false;
        }
    }

    [RelayCommand]
    private async Task OpenSettings()
    {
        if (ShowSettingsDialog is not null)
            await ShowSettingsDialog();
    }

    private void LoadBackgroundImage()
    {
        try
        {
            var path = System.IO.Path.Combine(
                AppContext.BaseDirectory, "Assets", "Images", "bg_mosaic.png");
            if (System.IO.File.Exists(path))
                BackgroundImage = new Bitmap(path);
        }
        catch
        {
            BackgroundImage = null;
        }
    }

    private void LoadCharacterImage(Character? character)
    {
        if (character is null)
        {
            CharacterImage = null;
            return;
        }

        try
        {
            var path = System.IO.Path.Combine(
                AppContext.BaseDirectory, "Assets", "Images", "Characters", character.ImageName);
            if (System.IO.File.Exists(path))
                CharacterImage = new Bitmap(path);
            else
                CharacterImage = null;
        }
        catch
        {
            CharacterImage = null;
        }
    }

    private void UpdateSynergies()
    {
        if (_synergyEngine is null) return;

        var items = new List<string>();
        if (Pedestal1.SelectedItem is not null) items.Add(Pedestal1.SelectedItem.Name);
        if (Pedestal2.SelectedItem is not null) items.Add(Pedestal2.SelectedItem.Name);
        if (Pedestal3.SelectedItem is not null) items.Add(Pedestal3.SelectedItem.Name);

        var trinkets = new List<string>();
        if (Trinket1.SelectedTrinket is not null) trinkets.Add(Trinket1.SelectedTrinket.Name);
        if (Trinket2.SelectedTrinket is not null) trinkets.Add(Trinket2.SelectedTrinket.Name);

        SynergyText = _synergyEngine.ComputeSynergies(items, trinkets, SelectedCharacter?.Name);

        // Trigger AI analysis if enabled
        RequestAiAnalysis();
    }

    private async void RequestAiAnalysis()
    {
        if (!IsAiModeEnabled) return;

        var items = new List<string>();
        if (Pedestal1.SelectedItem is not null) items.Add(Pedestal1.SelectedItem.Name);
        if (Pedestal2.SelectedItem is not null) items.Add(Pedestal2.SelectedItem.Name);
        if (Pedestal3.SelectedItem is not null) items.Add(Pedestal3.SelectedItem.Name);

        var trinkets = new List<string>();
        if (Trinket1.SelectedTrinket is not null) trinkets.Add(Trinket1.SelectedTrinket.Name);
        if (Trinket2.SelectedTrinket is not null) trinkets.Add(Trinket2.SelectedTrinket.Name);

        // Need at least one item or trinket for AI analysis
        if (items.Count == 0 && trinkets.Count == 0)
        {
            AiAnalysisText = "";
            IsAiLoading = false;
            return;
        }

        // Cancel any in-flight request and debounce 800ms
        _aiCts?.Cancel();
        _aiCts = new CancellationTokenSource();
        var ct = _aiCts.Token;

        try
        {
            await Task.Delay(800, ct);

            IsAiLoading = true;
            AiAnalysisText = "";

            var settings = _settingsService.Load();
            AiAnalysisText = await _aiService.AnalyzeSynergyAsync(
                settings, items, trinkets, SelectedCharacter?.Name, ct);
        }
        catch (OperationCanceledException)
        {
            // Debounce or user navigated away — ignore
        }
        catch (Exception ex)
        {
            AiAnalysisText = $"Error: {ex.Message}";
        }
        finally
        {
            if (!ct.IsCancellationRequested)
                IsAiLoading = false;
        }
    }

    [RelayCommand]
    private void ClearAll()
    {
        Pedestal1.Clear();
        Pedestal2.Clear();
        Pedestal3.Clear();
        Trinket1.Clear();
        Trinket2.Clear();
        SelectedCharacter = null;
        SynergyText = "";
        _aiCts?.Cancel();
        AiAnalysisText = "";
        IsAiLoading = false;
    }
}
