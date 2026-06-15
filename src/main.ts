import { Notice, Plugin, Platform } from "obsidian";
import { registerSettingsModalLifecycle } from "./modal-detector";
import {
  enhanceSettingsModal,
  type SettingsModalEnhancer,
  type SettingsModalEnhancerOptions,
} from "./modal-enhancer";
import { SetmoveSettingTab } from "./settings-tab";
import {
  DEFAULT_SETTINGS,
  clearSavedGeometry,
  loadSettings,
  saveSettings,
  type PersistedGeometry,
  type SetmoveSettings,
} from "./settings";

export default class SetmovePlugin extends Plugin {
  settings: SetmoveSettings = DEFAULT_SETTINGS;
  private stopModalLifecycle: (() => void) | null = null;
  private readonly activeEnhancers = new Set<SettingsModalEnhancer>();

  async onload(): Promise<void> {
    this.settings = await loadSettings(this);
    await saveSettings(this, this.settings);
    this.addSettingTab(new SetmoveSettingTab(this));

    if (Platform.isMobile) {
      new Notice("Setmove is disabled on mobile.");
      return;
    }

    this.stopModalLifecycle = registerSettingsModalLifecycle(this.app.workspace, {
      onAttach: (match) => {
        const enhancer = enhanceSettingsModal(match, {
          settings: this.getEnhancerSettings(match.kind),
          onGeometryPersist: match.kind === "settings"
            ? async (geometry) => {
                await this.persistGeometry(geometry);
              }
            : undefined,
          onResetGeometry:
            match.kind === "settings"
              ? async () => {
                  await this.resetSavedGeometryCommand();
                }
              : undefined,
        });
        this.activeEnhancers.add(enhancer);

        return () => {
          this.activeEnhancers.delete(enhancer);
          enhancer.destroy();
        };
      },
    });
    this.register(() => {
      this.stopModalLifecycle?.();
      this.stopModalLifecycle = null;
    });

    console.log(`[${this.manifest.name}] loaded`);
  }

  onunload(): void {
    this.stopModalLifecycle?.();
    this.stopModalLifecycle = null;
    console.log(`[${this.manifest.name}] unloaded`);
  }

  async updateSettings(partial: Partial<SetmoveSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...partial,
    };
    await saveSettings(this, this.settings);
    this.applySettingsToOpenEnhancers();
  }

  async resetSavedGeometryCommand(): Promise<void> {
    this.settings = clearSavedGeometry(this.settings);
    await saveSettings(this, this.settings);

    const enhancer = this.getOpenEnhancer();
    if (enhancer) {
      enhancer.reset();
    }

    this.applySettingsToOpenEnhancers();
    new Notice("Reset saved Settings window geometry.");
  }

  private async persistGeometry(geometry: PersistedGeometry): Promise<void> {
    this.settings = {
      ...this.settings,
      geometry,
    };
    await saveSettings(this, this.settings);
  }

  private applySettingsToOpenEnhancers(): void {
    for (const enhancer of this.activeEnhancers) {
      enhancer.updateSettings(this.getEnhancerSettings(enhancer.kind));
    }
  }

  private getOpenEnhancer(): SettingsModalEnhancer | null {
    const firstEnhancer = this.activeEnhancers.values().next();
    return firstEnhancer.done ? null : firstEnhancer.value;
  }

  private getEnhancerSettings(
    kind: SettingsModalEnhancer["kind"],
  ): SettingsModalEnhancerOptions["settings"] {
    return {
      ...this.settings,
      geometry: kind === "settings" ? this.settings.geometry : null,
      rememberGeometry: kind === "settings" && this.settings.rememberGeometry,
    };
  }
}
