using System;
using System.Collections.Generic;
using Avalonia.Media.Imaging;
using CommunityToolkit.Mvvm.ComponentModel;
using TheSynergizingOfIsaac.Models;

namespace TheSynergizingOfIsaac.ViewModels;

public partial class TrinketSlotViewModel : ViewModelBase
{
    private readonly Action _onSelectionChanged;

    [ObservableProperty]
    private Trinket? _selectedTrinket;

    [ObservableProperty]
    private Bitmap? _trinketImage;

    public List<Trinket> AllTrinkets { get; }
    public string SlotLabel { get; }

    /// <summary>Raised when the view should clear the AutoCompleteBox text.</summary>
    public event Action? ClearRequested;

    public TrinketSlotViewModel(string label, List<Trinket> allTrinkets, Action onSelectionChanged)
    {
        SlotLabel = label;
        AllTrinkets = allTrinkets;
        _onSelectionChanged = onSelectionChanged;
    }

    public void OnTrinketSelected(Trinket? trinket)
    {
        if (trinket is null) return;
        SelectedTrinket = trinket;
        LoadTrinketImage(trinket);
        _onSelectionChanged();
    }

    private void LoadTrinketImage(Trinket trinket)
    {
        try
        {
            var path = System.IO.Path.Combine(
                AppContext.BaseDirectory, "Assets", "Images", "Trinkets", trinket.ImageName);
            if (System.IO.File.Exists(path))
                TrinketImage = new Bitmap(path);
            else
                TrinketImage = null;
        }
        catch
        {
            TrinketImage = null;
        }
    }

    public void Clear()
    {
        SelectedTrinket = null;
        TrinketImage = null;
        ClearRequested?.Invoke();
        _onSelectionChanged();
    }
}
