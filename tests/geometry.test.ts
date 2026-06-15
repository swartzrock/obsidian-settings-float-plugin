import { describe, expect, it } from "vitest";
import {
  MIN_MODAL_HEIGHT,
  MIN_MODAL_WIDTH,
  applyGeometryPreset,
  clampModalRect,
  getCenteredRect,
  getMinimumModalSize,
  getRestoredGeometry,
  measureHostBounds,
  type HostBounds,
} from "../src/geometry";
import type { PersistedGeometry } from "../src/settings";

const hostBounds: HostBounds = {
  x: 0,
  y: 0,
  width: 1440,
  height: 900,
};

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

describe("geometry measurement", () => {
  it("measures host bounds from a viewport", () => {
    expect(
      measureHostBounds({
        innerWidth: 1280,
        innerHeight: 720,
      }),
    ).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
    });
  });

  it("caps minimum size to the available host space", () => {
    expect(
      getMinimumModalSize({
        x: 0,
        y: 0,
        width: 500,
        height: 360,
      }),
    ).toEqual({
      width: 500,
      height: 360,
    });
  });
});

describe("geometry clamping", () => {
  it("clamps size and position into the visible host", () => {
    expect(
      clampModalRect(
        {
          x: -200,
          y: 700,
          width: 1800,
          height: 1000,
        },
        hostBounds,
      ),
    ).toEqual({
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
    });
  });

  it("enforces minimum dimensions when the host allows them", () => {
    expect(
      clampModalRect(
        {
          x: 10,
          y: 10,
          width: 320,
          height: 260,
        },
        hostBounds,
      ),
    ).toEqual({
      x: 10,
      y: 10,
      width: MIN_MODAL_WIDTH,
      height: MIN_MODAL_HEIGHT,
    });
  });

  it("reclamps geometry after a host resize", () => {
    expect(
      clampModalRect(savedGeometry, {
        x: 0,
        y: 0,
        width: 820,
        height: 640,
      }),
    ).toEqual({
      x: 0,
      y: 0,
      width: 820,
      height: 640,
    });
  });
});

describe("geometry presets", () => {
  it("centers while preserving the current size when it fits", () => {
    expect(
      getCenteredRect(
        {
          width: 900,
          height: 640,
        },
        hostBounds,
      ),
    ).toEqual({
      x: 270,
      y: 130,
      width: 900,
      height: 640,
    });
  });

  it("calculates left and right dock presets predictably", () => {
    expect(
      applyGeometryPreset(
        "dock-left",
        {
          width: 900,
          height: 640,
        },
        hostBounds,
      ),
    ).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 900,
    });

    expect(
      applyGeometryPreset(
        "dock-right",
        {
          width: 900,
          height: 640,
        },
        hostBounds,
      ),
    ).toEqual({
      x: 800,
      y: 0,
      width: 640,
      height: 900,
    });
  });

  it("keeps dock presets as narrow as the modal allows on wide screens", () => {
    const wideHostBounds = {
      x: 0,
      y: 0,
      width: 2048,
      height: 1200,
    };

    expect(
      applyGeometryPreset(
        "dock-left",
        {
          width: 1100,
          height: 720,
        },
        wideHostBounds,
      ),
    ).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 1200,
    });

    expect(
      applyGeometryPreset(
        "dock-right",
        {
          width: 1100,
          height: 720,
        },
        wideHostBounds,
      ),
    ).toEqual({
      x: 1408,
      y: 0,
      width: 640,
      height: 1200,
    });
  });

  it("keeps the optional bottom-half preset inside bounds", () => {
    expect(
      applyGeometryPreset(
        "bottom-half",
        {
          width: 900,
          height: 640,
        },
        hostBounds,
      ),
    ).toEqual({
      x: 0,
      y: 450,
      width: 1440,
      height: 450,
    });
  });
});

describe("saved geometry restoration", () => {
  it("restores valid saved geometry and reclamps it for the current host", () => {
    expect(
      getRestoredGeometry(savedGeometry, {
        x: 0,
        y: 0,
        width: 1000,
        height: 700,
      }),
    ).toEqual({
      x: 48,
      y: 60,
      width: 900,
      height: 640,
    });
  });

  it("ignores saved geometry that is too small, non-finite, or otherwise incompatible", () => {
    expect(
      getRestoredGeometry(
        {
          ...savedGeometry,
          width: 320,
        },
        hostBounds,
      ),
    ).toBeNull();

    expect(
      getRestoredGeometry(
        {
          ...savedGeometry,
          height: Number.POSITIVE_INFINITY,
        } as PersistedGeometry,
        hostBounds,
      ),
    ).toBeNull();

    expect(
      getRestoredGeometry(
        {
          ...savedGeometry,
          width: 2000,
        },
        hostBounds,
      ),
    ).toBeNull();
  });
});
