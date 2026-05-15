using System;
using Avalonia.Controls;
using TheSynergizingOfIsaac.Models;
using TheSynergizingOfIsaac.ViewModels;

namespace TheSynergizingOfIsaac.Views.Controls;

public partial class TrinketSlotControl : UserControl
{
    private TrinketSlotViewModel? _currentVm;

    public TrinketSlotControl()
    {
        InitializeComponent();
        TrinketAutoComplete.SelectionChanged += OnAutoCompleteSelectionChanged;
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        // Unsubscribe from old VM
        if (_currentVm is not null)
            _currentVm.ClearRequested -= OnClearRequested;

        _currentVm = DataContext as TrinketSlotViewModel;

        // Subscribe to new VM
        if (_currentVm is not null)
            _currentVm.ClearRequested += OnClearRequested;
    }

    private void OnClearRequested()
    {
        TrinketAutoComplete.SelectedItem = null;
        TrinketAutoComplete.Text = "";
    }

    private void OnAutoCompleteSelectionChanged(object? sender, SelectionChangedEventArgs args)
    {
        if (_currentVm is not null && args.AddedItems.Count > 0)
        {
            if (args.AddedItems[0] is Trinket trinket)
                _currentVm.OnTrinketSelected(trinket);
        }
    }
}
