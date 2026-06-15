export const SETTINGS_SCHEMA_VERSION = 1;
export const GEOMETRY_SCHEMA_VERSION = 1;

export interface GeometryBoundsMetadata {
  width: number;
  height: number;
}

export interface PersistedGeometry {
  schemaVersion: typeof GEOMETRY_SCHEMA_VERSION;
  x: number;
  y: number;
  width: number;
  height: number;
  lastAppliedBounds: GeometryBoundsMetadata;
}

export interface SetmoveSettings {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  movable: boolean;
  resizable: boolean;
  rememberGeometry: boolean;
  showPresetControls: boolean;
  disableOnMobile: boolean;
  disableOnNarrowWindows: boolean;
  narrowWindowThreshold: number;
  geometry: PersistedGeometry | null;
}

export interface PluginDataStore {
  loadData(): Promise<unknown>;
  saveData(data: SetmoveSettings): Promise<void>;
}

const DEFAULT_NARROW_WINDOW_THRESHOLD = 720;

export const DEFAULT_SETTINGS: SetmoveSettings = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  movable: true,
  resizable: true,
  rememberGeometry: true,
  showPresetControls: true,
  disableOnMobile: true,
  disableOnNarrowWindows: true,
  narrowWindowThreshold: DEFAULT_NARROW_WINDOW_THRESHOLD,
  geometry: null,
});

type RecordLike = Record<string, unknown>;

export function migrateSettingsData(data: unknown): SetmoveSettings {
  if (!isRecord(data)) {
    return cloneSettings(DEFAULT_SETTINGS);
  }

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    movable: readBoolean(data.movable, DEFAULT_SETTINGS.movable),
    resizable: readBoolean(data.resizable, DEFAULT_SETTINGS.resizable),
    rememberGeometry: readBoolean(
      data.rememberGeometry,
      DEFAULT_SETTINGS.rememberGeometry,
    ),
    showPresetControls: readBoolean(
      data.showPresetControls,
      DEFAULT_SETTINGS.showPresetControls,
    ),
    disableOnMobile: readBoolean(
      data.disableOnMobile,
      DEFAULT_SETTINGS.disableOnMobile,
    ),
    disableOnNarrowWindows: readBoolean(
      data.disableOnNarrowWindows,
      DEFAULT_SETTINGS.disableOnNarrowWindows,
    ),
    narrowWindowThreshold: readPositiveNumber(
      data.narrowWindowThreshold,
      DEFAULT_SETTINGS.narrowWindowThreshold,
    ),
    geometry: parseGeometry(data.geometry),
  };
}

export async function loadSettings(
  dataStore: PluginDataStore,
): Promise<SetmoveSettings> {
  return migrateSettingsData(await dataStore.loadData());
}

export async function saveSettings(
  dataStore: PluginDataStore,
  settings: SetmoveSettings,
): Promise<void> {
  await dataStore.saveData(serializeSettings(settings));
}

export function clearSavedGeometry(settings: SetmoveSettings): SetmoveSettings {
  return {
    ...serializeSettings(settings),
    geometry: null,
  };
}

export async function resetSavedGeometry(
  dataStore: PluginDataStore,
  settings: SetmoveSettings,
): Promise<SetmoveSettings> {
  const nextSettings = clearSavedGeometry(settings);

  await saveSettings(dataStore, nextSettings);
  return nextSettings;
}

export function serializeSettings(settings: SetmoveSettings): SetmoveSettings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    movable: settings.movable,
    resizable: settings.resizable,
    rememberGeometry: settings.rememberGeometry,
    showPresetControls: settings.showPresetControls,
    disableOnMobile: settings.disableOnMobile,
    disableOnNarrowWindows: settings.disableOnNarrowWindows,
    narrowWindowThreshold: settings.narrowWindowThreshold,
    geometry: settings.geometry ? cloneGeometry(settings.geometry) : null,
  };
}

function parseGeometry(value: unknown): PersistedGeometry | null {
  if (!isRecord(value)) {
    return null;
  }

  const x = readFiniteNumber(value.x);
  const y = readFiniteNumber(value.y);
  const width = readPositiveNumber(value.width);
  const height = readPositiveNumber(value.height);
  const lastAppliedBounds = parseBoundsMetadata(value.lastAppliedBounds);

  if (
    x === null ||
    y === null ||
    width === null ||
    height === null ||
    lastAppliedBounds === null
  ) {
    return null;
  }

  return {
    schemaVersion: GEOMETRY_SCHEMA_VERSION,
    x,
    y,
    width,
    height,
    lastAppliedBounds,
  };
}

function parseBoundsMetadata(value: unknown): GeometryBoundsMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  const width = readPositiveNumber(value.width);
  const height = readPositiveNumber(value.height);

  if (width === null || height === null) {
    return null;
  }

  return { width, height };
}

function cloneSettings(settings: SetmoveSettings): SetmoveSettings {
  return serializeSettings(settings);
}

function cloneGeometry(geometry: PersistedGeometry): PersistedGeometry {
  return {
    schemaVersion: GEOMETRY_SCHEMA_VERSION,
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    lastAppliedBounds: {
      width: geometry.lastAppliedBounds.width,
      height: geometry.lastAppliedBounds.height,
    },
  };
}

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPositiveNumber(value: unknown, fallback: number): number;
function readPositiveNumber(value: unknown): number | null;
function readPositiveNumber(
  value: unknown,
  fallback?: number,
): number | null {
  const numberValue = readFiniteNumber(value);

  if (numberValue !== null && numberValue > 0) {
    return numberValue;
  }

  return fallback ?? null;
}
