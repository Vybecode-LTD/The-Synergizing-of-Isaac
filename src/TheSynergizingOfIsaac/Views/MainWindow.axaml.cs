using System;
using System.Threading.Tasks;
using Avalonia.Controls;
using TheSynergizingOfIsaac.Models;
using TheSynergizingOfIsaac.Services;
using TheSynergizingOfIsaac.ViewModels;

namespace TheSynergizingOfIsaac.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        if (DataContext is MainWindowViewModel vm)
        {
            vm.ShowSettingsDialog = async () =>
            {
                var settingsVm = new SettingsViewModel(new SettingsService());
                var window = new SettingsWindow { DataContext = settingsVm };
                await window.ShowDialog(this);
            };

            vm.ShowAddSynergyDialog = async () =>
            {
                var addVm = new AddSynergyViewModel(
                    vm.DataService.Items,
                    vm.DataService.Trinkets,
                    vm.DataService.Characters);
                var window = new AddSynergyWindow { DataContext = addVm };
                await window.ShowDialog(this);
                return addVm.Saved ? addVm.Result : null;
            };
        }
    }

    protected override async void OnOpened(EventArgs e)
    {
        base.OnOpened(e);

        if (DataContext is MainWindowViewModel vm)
            await vm.InitializeAsync();
    }
}
