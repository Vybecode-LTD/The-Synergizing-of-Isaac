using System;
using Avalonia.Controls;
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
        }
    }

    protected override async void OnOpened(EventArgs e)
    {
        base.OnOpened(e);

        if (DataContext is MainWindowViewModel vm)
            await vm.InitializeAsync();
    }
}
