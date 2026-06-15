import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  clearSavedGeometry,
  loadSettings,
  migrateSettingsData,
  resetSavedGeometry,
  saveSettings,
  serializeSettings,
  type PluginDataStore,
  type PersistedGeometry,
  type SetmoveSettings,
} from "../src/settings";

class MemoryDataStore implements PluginDataStore {
  constructor(private data: unknown = null) {}

  async loadData(): Promise<unknown> {
    return this.data;
  }

  async saveData(data: SetmoveSettings): Promise<void> {
    this.data = data;
  }

  peek(): unknown {
    return this.data;
  }
}

const savedGeometry: PersistedGeometry = {
  schemaVersion: 1,
  x: 48,
  y: 72,
  width: 900,
  height: 640,
  lastAppliedBounds: {
    width: 1440,
    height: 900,
  },
};

describe("settings persistence", () => {
  it("uses defaults when no saved data exists", () => {
    expect(migrateSettingsData(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial saved data with current defaults", () => {
    expect(
      migrateSettingsData({
        movable: false,
        rememberGeometry: false,
        geometry: savedGeometry,
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      movable: false,
      rememberGeometry: false,
      geometry: savedGeometry,
    });
  });

  it("loads and saves a typed, unknown-free settings payload", async () => {
    const dataStore = new MemoryDataStore({
      movable: false,
      extraFutureField: "ignored",
      geometry: {
        ...savedGeometry,
        unknownGeometryField: true,
      },
    });

    const settings = await loadSettings(dataStore);
    await saveSettings(dataStore, settings);

    expect(dataStore.peek()).toEqual({
      ...DEFAULT_SETTINGS,
      movable: false,
      geometry: savedGeometry,
    });
    expect(JSON.stringify(dataStore.peek())).not.toContain("extraFutureField");
    expect(JSON.stringify(dataStore.peek())).not.toContain(
      "unknownGeometryField",
    );
  });

  it("clears saved geometry without changing unrelated settings", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      movable: false,
      resizable: false,
      geometry: savedGeometry,
    };

    expect(clearSavedGeometry(settings)).toEqual({
      ...settings,
      geometry: null,
    });
  });

  it("persists a geometry reset without clearing unrelated settings", async () => {
    const dataStore = new MemoryDataStore();
    const settings = {
      ...DEFAULT_SETTINGS,
      showPresetControls: false,
      disableOnNarrowWindows: false,
      geometry: savedGeometry,
    };

    const nextSettings = await resetSavedGeometry(dataStore, settings);

    expect(nextSettings).toEqual({
      ...settings,
      geometry: null,
    });
    expect(dataStore.peek()).toEqual(nextSettings);
  });

  it("recovers from invalid saved values", () => {
    expect(
      migrateSettingsData({
        movable: "yes",
        resizable: 0,
        rememberGeometry: false,
        showPresetControls: false,
        disableOnMobile: false,
        disableOnNarrowWindows: false,
        narrowWindowThreshold: -1,
        geometry: {
          x: Number.NaN,
          y: 40,
          width: 0,
          height: 500,
          lastAppliedBounds: {
            width: 1000,
            height: Infinity,
          },
        },
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      rememberGeometry: false,
      showPresetControls: false,
      disableOnMobile: false,
      disableOnNarrowWindows: false,
      geometry: null,
    });
  });

  it("serializes settings as a deep copy", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      geometry: savedGeometry,
    };

    const serialized = serializeSettings(settings);

    expect(serialized).toEqual(settings);
    expect(serialized).not.toBe(settings);
    expect(serialized.geometry).not.toBe(settings.geometry);
  });
});
