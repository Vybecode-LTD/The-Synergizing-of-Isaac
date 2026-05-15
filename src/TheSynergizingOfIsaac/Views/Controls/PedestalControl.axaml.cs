using System;
using Avalonia.Controls;
using TheSynergizingOfIsaac.Models;
using TheSynergizingOfIsaac.ViewModels;

namespace TheSynergizingOfIsaac.Views.Controls;

public partial class PedestalControl : UserControl
{
    private PedestalSlotViewModel? _currentVm;

    public PedestalControl()
    {
        InitializeComponent();
        ItemAutoComplete.SelectionChanged += OnAutoCompleteSelectionChanged;
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        // Unsubscribe from old VM
        if (_currentVm is not null)
            _currentVm.ClearRequested -= OnClearRequested;

        _currentVm = DataContext as PedestalSlotViewModel;

        // Subscribe to new VM
        if (_currentVm is not null)
            _currentVm.ClearRequested += OnClearRequested;
    }

    private void OnClearRequested()
    {
        ItemAutoComplete.SelectedItem = null;
        ItemAutoComplete.Text = "";
    }

    private void OnAutoCompleteSelectionChanged(object? sender, SelectionChangedEventArgs args)
    {
        if (_currentVm is not null && args.AddedItems.Count > 0)
        {
            if (args.AddedItems[0] is IsaacItem item)
                _currentVm.OnItemSelected(item);
        }
    }
}
