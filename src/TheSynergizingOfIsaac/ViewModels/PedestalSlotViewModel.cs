using System;
using System.Collections.Generic;
using Avalonia.Media.Imaging;
using CommunityToolkit.Mvvm.ComponentModel;
using TheSynergizingOfIsaac.Models;

namespace TheSynergizingOfIsaac.ViewModels;

public partial class PedestalSlotViewModel : ViewModelBase
{
    private readonly Action _onSelectionChanged;

    [ObservableProperty]
    private IsaacItem? _selectedItem;

    [ObservableProperty]
    private Bitmap? _itemImage;

    public List<IsaacItem> AllItems { get; }
    public string SlotLabel { get; }

    /// <summary>Raised when the view should clear the AutoCompleteBox text.</summary>
    public event Action? ClearRequested;

    public PedestalSlotViewModel(string label, List<IsaacItem> allItems, Action onSelectionChanged)
    {
        SlotLabel = label;
        AllItems = allItems;
        _onSelectionChanged = onSelectionChanged;
    }

    public void OnItemSelected(IsaacItem? item)
    {
        if (item is null) return;
        SelectedItem = item;
        LoadItemImage(item);
        _onSelectionChanged();
    }

    private void LoadItemImage(IsaacItem item)
    {
        try
        {
            var path = System.IO.Path.Combine(
                AppContext.BaseDirectory, "Assets", "Images", "Items", item.ImageName);
            if (System.IO.File.Exists(path))
                ItemImage = new Bitmap(path);
            else
                ItemImage = null;
        }
        catch
        {
            ItemImage = null;
        }
    }

    public void Clear()
    {
        SelectedItem = null;
        ItemImage = null;
        ClearRequested?.Invoke();
        _onSelectionChanged();
    }
}
