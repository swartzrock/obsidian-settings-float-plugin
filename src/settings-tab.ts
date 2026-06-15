import { PluginSettingTab, Setting } from "obsidian";
import type SetmovePlugin from "./main";

export class SetmoveSettingTab extends PluginSettingTab {
  private readonly pluginRef: SetmovePlugin;

  constructor(plugin: SetmovePlugin) {
    super(plugin.app, plugin);
    this.pluginRef = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const plugin = this.pluginRef;

    containerEl.empty();
    new Setting(containerEl).setName("Settings Float").setHeading();
    containerEl.createEl("p", {
      cls: "setmove--settings-description",
      text: "Move and resize Obsidian Settings and catalog dialogs so you can adjust options while keeping your notes and workspace visible.",
    });

    new Setting(containerEl)
      .setName("Enable movable dialogs")
      .setDesc("Allow supported Settings and catalog dialogs to be dragged from safe empty space.")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.movable)
          .onChange(async (value) => {
            await plugin.updateSettings({ movable: value });
          }),
      );

    new Setting(containerEl)
      .setName("Enable resizable dialogs")
      .setDesc("Allow supported Settings and catalog dialogs to be resized from the bottom-right handle.")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.resizable)
          .onChange(async (value) => {
            await plugin.updateSettings({ resizable: value });
          }),
      );

    new Setting(containerEl)
      .setName("Remember window geometry")
      .setDesc("Persist the last valid Settings position and size for this vault.")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.rememberGeometry)
          .onChange(async (value) => {
            await plugin.updateSettings({ rememberGeometry: value });
          }),
      );

    new Setting(containerEl)
      .setName("Disable on narrow windows")
      .setDesc("Keep the plugin conservative on cramped desktop windows.")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.disableOnNarrowWindows)
          .onChange(async (value) => {
            await plugin.updateSettings({ disableOnNarrowWindows: value });
          }),
      );

    new Setting(containerEl)
      .setName("Disable on mobile")
      .setDesc("Leave mobile behavior as a no-op for this release.")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.disableOnMobile)
          .onChange(async (value) => {
            await plugin.updateSettings({ disableOnMobile: value });
          }),
      );

    new Setting(containerEl)
      .setName("Reset saved geometry")
      .setDesc("Forget the saved position and size so Settings reopens with the default layout.")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          await plugin.resetSavedGeometryCommand();
        }),
      );
  }
}
