import type { PersistedGeometry } from "./settings";

export interface HostBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ModalRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type GeometryPreset = "center" | "dock-left" | "dock-right" | "bottom-half";

// These minimums keep the Settings sidebar, content column, and footer controls usable.
export const MIN_MODAL_WIDTH = 640;
export const MIN_MODAL_HEIGHT = 420;

const HALF_HEIGHT_RATIO = 0.5;

export function measureHostBounds(viewport: Pick<Window, "innerWidth" | "innerHeight">): HostBounds {
  return {
    x: 0,
    y: 0,
    width: sanitizePositiveNumber(viewport.innerWidth) ?? 0,
    height: sanitizePositiveNumber(viewport.innerHeight) ?? 0,
  };
}

export function getMinimumModalSize(hostBounds: HostBounds): Size {
  return {
    width: Math.min(MIN_MODAL_WIDTH, Math.max(hostBounds.width, 0)),
    height: Math.min(MIN_MODAL_HEIGHT, Math.max(hostBounds.height, 0)),
  };
}

export function isUsableHostBounds(hostBounds: HostBounds): boolean {
  return (
    Number.isFinite(hostBounds.x) &&
    Number.isFinite(hostBounds.y) &&
    hostBounds.width > 0 &&
    hostBounds.height > 0
  );
}

export function clampModalRect(rect: ModalRect, hostBounds: HostBounds): ModalRect {
  const normalizedHost = normalizeHostBounds(hostBounds);
  const minimumSize = getMinimumModalSize(normalizedHost);
  const width = clampDimension(rect.width, normalizedHost.width, minimumSize.width);
  const height = clampDimension(rect.height, normalizedHost.height, minimumSize.height);
  const maxX = normalizedHost.x + normalizedHost.width - width;
  const maxY = normalizedHost.y + normalizedHost.height - height;

  return {
    x: clampNumber(rect.x, normalizedHost.x, maxX),
    y: clampNumber(rect.y, normalizedHost.y, maxY),
    width,
    height,
  };
}

export function getCenteredRect(
  rect: Pick<ModalRect, "width" | "height">,
  hostBounds: HostBounds,
): ModalRect {
  const normalizedHost = normalizeHostBounds(hostBounds);
  const clampedRect = clampModalRect(
    {
      x: normalizedHost.x,
      y: normalizedHost.y,
      width: rect.width,
      height: rect.height,
    },
    normalizedHost,
  );

  return {
    ...clampedRect,
    x: normalizedHost.x + (normalizedHost.width - clampedRect.width) / 2,
    y: normalizedHost.y + (normalizedHost.height - clampedRect.height) / 2,
  };
}

export function applyGeometryPreset(
  preset: GeometryPreset,
  currentRect: Pick<ModalRect, "width" | "height">,
  hostBounds: HostBounds,
): ModalRect {
  const normalizedHost = normalizeHostBounds(hostBounds);
  const minimumSize = getMinimumModalSize(normalizedHost);

  if (preset === "center") {
    return getCenteredRect(currentRect, normalizedHost);
  }

  if (preset === "bottom-half") {
    const height = clampDimension(
      normalizedHost.height,
      normalizedHost.height * HALF_HEIGHT_RATIO,
      minimumSize.height,
    );

    return clampModalRect(
      {
        x: normalizedHost.x,
        y: normalizedHost.y + normalizedHost.height - height,
        width: normalizedHost.width,
        height,
      },
      normalizedHost,
    );
  }

  const width = minimumSize.width;

  return clampModalRect(
    {
      x:
        preset === "dock-right"
          ? normalizedHost.x + normalizedHost.width - width
          : normalizedHost.x,
      y: normalizedHost.y,
      width,
      height: normalizedHost.height,
    },
    normalizedHost,
  );
}

export function getRestoredGeometry(
  geometry: PersistedGeometry | null,
  hostBounds: HostBounds,
): ModalRect | null {
  if (geometry === null) {
    return null;
  }

  if (!isUsableHostBounds(hostBounds)) {
    return null;
  }

  if (
    !isPersistedGeometryCompatible(geometry) ||
    geometry.width < MIN_MODAL_WIDTH ||
    geometry.height < MIN_MODAL_HEIGHT
  ) {
    return null;
  }

  const maximumReasonableWidth = Math.max(
    geometry.lastAppliedBounds.width,
    hostBounds.width,
  );
  const maximumReasonableHeight = Math.max(
    geometry.lastAppliedBounds.height,
    hostBounds.height,
  );

  if (
    geometry.width > maximumReasonableWidth ||
    geometry.height > maximumReasonableHeight
  ) {
    return null;
  }

  return clampModalRect(geometry, hostBounds);
}

function isPersistedGeometryCompatible(geometry: PersistedGeometry): boolean {
  return (
    isFiniteRect(geometry) &&
    geometry.lastAppliedBounds.width > 0 &&
    geometry.lastAppliedBounds.height > 0 &&
    geometry.x >= 0 &&
    geometry.y >= 0
  );
}

function isFiniteRect(rect: Pick<ModalRect, "x" | "y" | "width" | "height">): boolean {
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height)
  );
}

function normalizeHostBounds(hostBounds: HostBounds): HostBounds {
  return {
    x: Number.isFinite(hostBounds.x) ? hostBounds.x : 0,
    y: Number.isFinite(hostBounds.y) ? hostBounds.y : 0,
    width: sanitizePositiveNumber(hostBounds.width) ?? 0,
    height: sanitizePositiveNumber(hostBounds.height) ?? 0,
  };
}

function clampDimension(
  value: number,
  available: number,
  minimum: number,
): number {
  const safeAvailable = sanitizePositiveNumber(available) ?? 0;
  const safeMinimum = Math.min(sanitizePositiveNumber(minimum) ?? 0, safeAvailable);
  const safeValue = sanitizePositiveNumber(value) ?? safeMinimum;

  if (safeAvailable === 0) {
    return 0;
  }

  return clampNumber(safeValue, safeMinimum, safeAvailable);
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  if (maximum < minimum) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

function sanitizePositiveNumber(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? value : null;
}
