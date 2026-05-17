using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TheSynergizingOfIsaac.Models;

namespace TheSynergizingOfIsaac.ViewModels;

public partial class AddSynergyViewModel : ViewModelBase
{
    // ── Source lists for autocomplete ──────────────────────────────
    public List<IsaacItem> AllItems { get; }
    public List<Trinket> AllTrinkets { get; }
    public List<Character> AllCharacters { get; }
    public List<string> Ratings { get; } = ["S", "A", "B", "C", "D"];

    // ── Chip collections ──────────────────────────────────────────
    public ObservableCollection<string> SelectedItems { get; } = [];
    public ObservableCollection<string> SelectedTrinkets { get; } = [];
    public ObservableCollection<string> SelectedCharacters { get; } = [];

    // ── Form fields ───────────────────────────────────────────────
    [ObservableProperty]
    private string _description = "";

    [ObservableProperty]
    private string _selectedRating = "A";

    [ObservableProperty]
    private string _validationError = "";

    /// <summary>True when the user saved (not cancelled).</summary>
    public bool Saved { get; private set; }

    /// <summary>The synergy built from the form, available after Save.</summary>
    public SynergyEntry? Result { get; private set; }

    // ── Events the View subscribes to for clearing autocomplete text ──
    public event Action? ClearItemText;
    public event Action? ClearTrinketText;
    public event Action? ClearCharacterText;

    public AddSynergyViewModel(List<IsaacItem> items, List<Trinket> trinkets, List<Character> characters)
    {
        AllItems = items;
        AllTrinkets = trinkets;
        AllCharacters = characters;
    }

    // ── Add / Remove chips ────────────────────────────────────────

    public void OnItemSelected(IsaacItem? item)
    {
        if (item is null) return;
        if (!SelectedItems.Contains(item.Name))
            SelectedItems.Add(item.Name);
        ClearItemText?.Invoke();
        ClearValidation();
    }

    public void OnTrinketSelected(Trinket? trinket)
    {
        if (trinket is null) return;
        if (!SelectedTrinkets.Contains(trinket.Name))
            SelectedTrinkets.Add(trinket.Name);
        ClearTrinketText?.Invoke();
        ClearValidation();
    }

    public void OnCharacterSelected(Character? character)
    {
        if (character is null) return;
        if (!SelectedCharacters.Contains(character.Name))
            SelectedCharacters.Add(character.Name);
        ClearCharacterText?.Invoke();
        ClearValidation();
    }

    [RelayCommand]
    private void RemoveItem(string name) => SelectedItems.Remove(name);

    [RelayCommand]
    private void RemoveTrinket(string name) => SelectedTrinkets.Remove(name);

    [RelayCommand]
    private void RemoveCharacter(string name) => SelectedCharacters.Remove(name);

    // ── Save ──────────────────────────────────────────────────────

    [RelayCommand]
    private void Save()
    {
        // Validate
        int totalInputs = SelectedItems.Count + SelectedTrinkets.Count;
        if (totalInputs < 2)
        {
            ValidationError = "A synergy needs at least 2 items/trinkets.";
            return;
        }

        if (string.IsNullOrWhiteSpace(Description))
        {
            ValidationError = "Please enter a description.";
            return;
        }

        Result = new SynergyEntry
        {
            Items = SelectedItems.ToList(),
            Trinkets = SelectedTrinkets.ToList(),
            Characters = SelectedCharacters.ToList(),
            Description = Description.Trim(),
            Rating = SelectedRating
        };
        Saved = true;
    }

    private void ClearValidation()
    {
        if (!string.IsNullOrEmpty(ValidationError))
            ValidationError = "";
    }
}
