using System;
using Avalonia.Controls;
using Avalonia.Interactivity;
using TheSynergizingOfIsaac.Models;
using TheSynergizingOfIsaac.ViewModels;

namespace TheSynergizingOfIsaac.Views;

public partial class AddSynergyWindow : Window
{
    private AddSynergyViewModel? _vm;

    public AddSynergyWindow()
    {
        InitializeComponent();

        ItemAutoComplete.SelectionChanged += OnItemSelectionChanged;
        TrinketAutoComplete.SelectionChanged += OnTrinketSelectionChanged;
        CharacterAutoComplete.SelectionChanged += OnCharacterSelectionChanged;

        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        if (_vm is not null)
        {
            _vm.ClearItemText -= ClearItemBox;
            _vm.ClearTrinketText -= ClearTrinketBox;
            _vm.ClearCharacterText -= ClearCharacterBox;
        }

        _vm = DataContext as AddSynergyViewModel;

        if (_vm is not null)
        {
            _vm.ClearItemText += ClearItemBox;
            _vm.ClearTrinketText += ClearTrinketBox;
            _vm.ClearCharacterText += ClearCharacterBox;
        }
    }

    private void ClearItemBox()
    {
        ItemAutoComplete.SelectedItem = null;
        ItemAutoComplete.Text = "";
    }

    private void ClearTrinketBox()
    {
        TrinketAutoComplete.SelectedItem = null;
        TrinketAutoComplete.Text = "";
    }

    private void ClearCharacterBox()
    {
        CharacterAutoComplete.SelectedItem = null;
        CharacterAutoComplete.Text = "";
    }

    private void OnItemSelectionChanged(object? sender, SelectionChangedEventArgs args)
    {
        if (_vm is not null && args.AddedItems.Count > 0 && args.AddedItems[0] is IsaacItem item)
            _vm.OnItemSelected(item);
    }

    private void OnTrinketSelectionChanged(object? sender, SelectionChangedEventArgs args)
    {
        if (_vm is not null && args.AddedItems.Count > 0 && args.AddedItems[0] is Trinket trinket)
            _vm.OnTrinketSelected(trinket);
    }

    private void OnCharacterSelectionChanged(object? sender, SelectionChangedEventArgs args)
    {
        if (_vm is not null && args.AddedItems.Count > 0 && args.AddedItems[0] is Character character)
            _vm.OnCharacterSelected(character);
    }

    private void OnSaveClick(object? sender, RoutedEventArgs e)
    {
        if (_vm is null) return;

        _vm.SaveCommand.Execute(null);

        if (_vm.Saved)
            Close(true);
    }

    private void OnCancelClick(object? sender, RoutedEventArgs e)
    {
        Close(false);
    }
}
