import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDragResizeSession } from "../src/drag-resize";
import { enhanceSettingsModal } from "../src/modal-enhancer";
import { DEFAULT_SETTINGS } from "../src/settings";
import { installObsidianDomHelpers } from "./obsidian-dom";

installObsidianDomHelpers();

describe("drag and resize sessions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("updates during drag, commits on pointerup, and toggles interaction state", () => {
    const handleEl = document.createElement("div");
    const modalEl = document.createElement("div");
    const onUpdate = vi.fn();
    const onCommit = vi.fn();
    const onStateChange = vi.fn();
    stubPointerCapture(handleEl);

    const session = createDragResizeSession({
      isEnabled: () => true,
      handleEl,
      modalEl,
      mode: "drag",
      canStart: () => true,
      getCurrentRect: () => ({
        x: 100,
        y: 120,
        width: 900,
        height: 640,
      }),
      getHostBounds: () => ({
        x: 0,
        y: 0,
        width: 1440,
        height: 900,
      }),
      onUpdate,
      onCommit,
      onStateChange,
    });

    handleEl.dispatchEvent(pointerEvent("pointerdown", { pointerId: 7, clientX: 20, clientY: 30 }));
    expect(modalEl.classList.contains("setmove--is-dragging")).toBe(true);
    handleEl.dispatchEvent(pointerEvent("pointermove", { pointerId: 7, clientX: 70, clientY: 90 }));
    handleEl.dispatchEvent(pointerEvent("pointerup", { pointerId: 7, clientX: 70, clientY: 90 }));

    expect(onStateChange).toHaveBeenNthCalledWith(1, true);
    expect(onUpdate).toHaveBeenLastCalledWith({
      x: 150,
      y: 180,
      width: 900,
      height: 640,
    });
    expect(onCommit).toHaveBeenCalledWith({
      x: 150,
      y: 180,
      width: 900,
      height: 640,
    });
    expect(onStateChange).toHaveBeenLastCalledWith(false);
    expect(modalEl.classList.contains("setmove--is-interacting")).toBe(false);
    expect(modalEl.classList.contains("setmove--is-dragging")).toBe(false);

    session.destroy();
  });

  it("ignores secondary buttons and cancels back to the starting rect", () => {
    const handleEl = document.createElement("div");
    handleEl.dataset.setmoveRole = "resize-handle";
    const modalEl = document.createElement("div");
    const onUpdate = vi.fn();
    const onCommit = vi.fn();
    stubPointerCapture(handleEl);

    const session = createDragResizeSession({
      isEnabled: () => true,
      handleEl,
      modalEl,
      mode: "resize",
      canStart: () => true,
      getCurrentRect: () => ({
        x: 20,
        y: 30,
        width: 900,
        height: 640,
      }),
      getHostBounds: () => ({
        x: 0,
        y: 0,
        width: 1000,
        height: 700,
      }),
      onUpdate,
      onCommit,
    });

    handleEl.dispatchEvent(pointerEvent("pointerdown", { button: 2, pointerId: 2, clientX: 10, clientY: 10 }));
    handleEl.dispatchEvent(pointerEvent("pointermove", { pointerId: 2, clientX: 50, clientY: 50 }));
    expect(onUpdate).not.toHaveBeenCalled();

    handleEl.dispatchEvent(pointerEvent("pointerdown", { pointerId: 3, clientX: 10, clientY: 10 }));
    expect(modalEl.classList.contains("setmove--is-resizing")).toBe(true);
    handleEl.dispatchEvent(pointerEvent("pointermove", { pointerId: 3, clientX: 60, clientY: 70 }));
    handleEl.dispatchEvent(pointerEvent("pointercancel", { pointerId: 3, clientX: 60, clientY: 70 }));

    expect(onUpdate).toHaveBeenLastCalledWith({
      x: 20,
      y: 30,
      width: 900,
      height: 640,
    });
    expect(modalEl.classList.contains("setmove--is-resizing")).toBe(false);
    expect(onCommit).not.toHaveBeenCalled();

    session.destroy();
  });
});

describe("modal enhancer interactions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
  });

  it("persists geometry after drag ends and ignores disabled drag", () => {
    const match = createSettingsFixture();
    const onGeometryPersist = vi.fn();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
      onGeometryPersist,
    });

    const dragHandle = match.modalEl.querySelector<HTMLElement>('[data-setmove-role="drag-handle"]');
    if (!dragHandle) {
      throw new Error("Missing drag handle");
    }
    stubPointerCapture(dragHandle);

    dragHandle.dispatchEvent(pointerEvent("pointerdown", { pointerId: 9, clientX: 10, clientY: 10 }));
    dragHandle.dispatchEvent(pointerEvent("pointermove", { pointerId: 9, clientX: 110, clientY: 90 }));
    dragHandle.dispatchEvent(pointerEvent("pointerup", { pointerId: 9, clientX: 110, clientY: 90 }));

    expect(match.modalEl.style.left).toBe("370px");
    expect(match.modalEl.style.top).toBe("210px");
    expect(onGeometryPersist).toHaveBeenCalledTimes(1);
    expect(onGeometryPersist.mock.calls[0]?.[0]).toMatchObject({
      x: 370,
      y: 210,
      width: 900,
      height: 640,
    });

    enhancer.updateSettings({ movable: false });
    dragHandle.dispatchEvent(pointerEvent("pointerdown", { pointerId: 10, clientX: 10, clientY: 10 }));
    dragHandle.dispatchEvent(pointerEvent("pointermove", { pointerId: 10, clientX: 200, clientY: 200 }));
    dragHandle.dispatchEvent(pointerEvent("pointerup", { pointerId: 10, clientX: 200, clientY: 200 }));

    expect(onGeometryPersist).toHaveBeenCalledTimes(1);

    enhancer.destroy();
  });

  it("allows dragging from whitespace but not from setting rows", () => {
    const match = createSettingsFixture({
      extraContent: `
        <div class="settings-view">
          <div class="settings-view-header"></div>
        </div>
        <div class="setting-item">
          <button class="clickable-icon" type="button">Action</button>
        </div>
      `,
    });
    const onGeometryPersist = vi.fn();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
      onGeometryPersist,
    });

    stubPointerCapture(match.modalEl);

    match.contentEl.dispatchEvent(
      pointerEvent("pointerdown", { pointerId: 20, clientX: 10, clientY: 10 }),
    );
    match.contentEl.dispatchEvent(
      pointerEvent("pointermove", { pointerId: 20, clientX: 110, clientY: 90 }),
    );
    match.contentEl.dispatchEvent(
      pointerEvent("pointerup", { pointerId: 20, clientX: 110, clientY: 90 }),
    );

    expect(match.modalEl.style.left).toBe("370px");
    expect(match.modalEl.style.top).toBe("210px");

    const nestedWhitespace = match.modalEl.querySelector<HTMLElement>(".settings-view-header");
    if (!nestedWhitespace) {
      throw new Error("Missing nested whitespace");
    }

    nestedWhitespace.dispatchEvent(
      pointerEvent("pointerdown", { pointerId: 22, clientX: 20, clientY: 20 }),
    );
    nestedWhitespace.dispatchEvent(
      pointerEvent("pointermove", { pointerId: 22, clientX: 70, clientY: 70 }),
    );
    nestedWhitespace.dispatchEvent(
      pointerEvent("pointerup", { pointerId: 22, clientX: 70, clientY: 70 }),
    );

    expect(match.modalEl.style.left).toBe("420px");
    expect(match.modalEl.style.top).toBe("260px");

    const settingButton = match.modalEl.querySelector<HTMLElement>(".clickable-icon");
    if (!settingButton) {
      throw new Error("Missing setting button");
    }

    const persistedCalls = onGeometryPersist.mock.calls.length;
    settingButton.dispatchEvent(
      pointerEvent("pointerdown", { pointerId: 21, clientX: 20, clientY: 20 }),
    );
    settingButton.dispatchEvent(
      pointerEvent("pointermove", { pointerId: 21, clientX: 200, clientY: 200 }),
    );
    settingButton.dispatchEvent(
      pointerEvent("pointerup", { pointerId: 21, clientX: 200, clientY: 200 }),
    );

    expect(onGeometryPersist).toHaveBeenCalledTimes(persistedCalls);

    enhancer.destroy();
  });

  it("does not drag from a custom color picker", () => {
    const match = createSettingsFixture({
      extraContent: `
        <div class="pcr-app" role="window" aria-label="Color picker dialog">
          <div class="pcr-selection">
            <div class="pcr-color-palette">
              <div class="pcr-palette" role="listbox" aria-label="Color selection area"></div>
            </div>
          </div>
        </div>
      `,
    });
    const onGeometryPersist = vi.fn();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
      onGeometryPersist,
    });

    stubPointerCapture(match.modalEl);

    const palette = match.modalEl.querySelector<HTMLElement>(".pcr-palette");
    if (!palette) {
      throw new Error("Missing color picker palette");
    }

    palette.dispatchEvent(
      pointerEvent("pointerdown", { pointerId: 23, clientX: 20, clientY: 20 }),
    );
    palette.dispatchEvent(
      pointerEvent("pointermove", { pointerId: 23, clientX: 120, clientY: 100 }),
    );
    palette.dispatchEvent(
      pointerEvent("pointerup", { pointerId: 23, clientX: 120, clientY: 100 }),
    );

    expect(match.modalEl.style.left).toBe("270px");
    expect(match.modalEl.style.top).toBe("130px");
    expect(onGeometryPersist).not.toHaveBeenCalled();

    enhancer.destroy();
  });

  it("persists geometry after resize and clamps it into the host bounds", () => {
    const match = createSettingsFixture();
    const onGeometryPersist = vi.fn();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
      onGeometryPersist,
    });

    const resizeHandle = match.modalEl.querySelector<HTMLElement>('[data-setmove-role="resize-handle"]');
    if (!resizeHandle) {
      throw new Error("Missing resize handle");
    }
    stubPointerCapture(resizeHandle);

    resizeHandle.dispatchEvent(pointerEvent("pointerdown", { pointerId: 11, clientX: 10, clientY: 10 }));
    resizeHandle.dispatchEvent(pointerEvent("pointermove", { pointerId: 11, clientX: 800, clientY: 800 }));
    resizeHandle.dispatchEvent(pointerEvent("pointerup", { pointerId: 11, clientX: 800, clientY: 800 }));

    expect(match.modalEl.style.width).toBe("1440px");
    expect(match.modalEl.style.height).toBe("900px");
    expect(onGeometryPersist).toHaveBeenCalledTimes(1);

    enhancer.destroy();
  });

  it("allows catalog header dragging without hijacking catalog cards", () => {
    const match = createCatalogFixture();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
        geometry: null,
        rememberGeometry: false,
      },
    });

    stubPointerCapture(match.modalEl);

    const header = match.modalEl.querySelector<HTMLElement>(".catalog-header");
    const card = match.modalEl.querySelector<HTMLElement>(".community-item");
    if (!header || !card) {
      throw new Error("Missing catalog fixture elements");
    }

    header.dispatchEvent(
      pointerEvent("pointerdown", { pointerId: 30, clientX: 10, clientY: 10 }),
    );
    header.dispatchEvent(
      pointerEvent("pointermove", { pointerId: 30, clientX: 110, clientY: 90 }),
    );
    header.dispatchEvent(
      pointerEvent("pointerup", { pointerId: 30, clientX: 110, clientY: 90 }),
    );

    expect(match.modalEl.style.left).toBe("370px");
    expect(match.modalEl.style.top).toBe("210px");

    card.dispatchEvent(
      pointerEvent("pointerdown", { pointerId: 31, clientX: 10, clientY: 10 }),
    );
    card.dispatchEvent(
      pointerEvent("pointermove", { pointerId: 31, clientX: 210, clientY: 210 }),
    );
    card.dispatchEvent(
      pointerEvent("pointerup", { pointerId: 31, clientX: 210, clientY: 210 }),
    );

    expect(match.modalEl.style.left).toBe("370px");
    expect(match.modalEl.style.top).toBe("210px");

    enhancer.destroy();
  });
});

function stubPointerCapture(element: HTMLElement): void {
  Object.defineProperty(element, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(element, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
}

function pointerEvent(
  type: string,
  init: { button?: number; clientX?: number; clientY?: number; pointerId?: number },
): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: init.button ?? 0,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
  }) as MouseEvent & { pointerId: number };
  Object.defineProperty(event, "pointerId", {
    configurable: true,
    value: init.pointerId ?? 1,
  });
  return event;
}

function createSettingsFixture(options?: { extraContent?: string }) {
  document.body.innerHTML = `
    <div class="modal-container mod-dim">
      <div class="modal mod-settings">
        <button class="modal-close-button" aria-label="Close"></button>
        <div class="vertical-tab-header"></div>
        <div class="vertical-tab-content-container">${options?.extraContent ?? ""}</div>
      </div>
    </div>
  `;

  const modalEl = document.querySelector<HTMLElement>(".modal.mod-settings");
  const containerEl = document.querySelector<HTMLElement>(".modal-container");
  const contentEl = document.querySelector<HTMLElement>(".vertical-tab-content-container");

  if (!modalEl || !containerEl || !contentEl) {
    throw new Error("Missing settings fixture.");
  }

  Object.defineProperty(modalEl, "offsetWidth", {
    configurable: true,
    value: 900,
  });
  Object.defineProperty(modalEl, "offsetHeight", {
    configurable: true,
    value: 640,
  });
  modalEl.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 900,
      height: 640,
      top: 0,
      right: 900,
      bottom: 640,
      left: 0,
      toJSON() {
        return {};
      },
    }) as DOMRect;

  return {
    modalEl,
    containerEl,
    contentEl,
    doc: document,
    kind: "settings" as const,
    win: window,
  };
}

function createCatalogFixture() {
  document.body.innerHTML = `
    <div class="modal-container mod-dim">
      <div class="modal">
        <button class="modal-close-button" aria-label="Close"></button>
        <div class="catalog-header">Showing 366 themes</div>
        <input type="text" placeholder="Filter..." />
        <div class="community-modal-search-results">
          <div class="community-item">Minimal</div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.querySelector<HTMLElement>(".modal");
  const containerEl = document.querySelector<HTMLElement>(".modal-container");

  if (!modalEl || !containerEl) {
    throw new Error("Missing catalog fixture.");
  }

  Object.defineProperty(modalEl, "offsetWidth", {
    configurable: true,
    value: 900,
  });
  Object.defineProperty(modalEl, "offsetHeight", {
    configurable: true,
    value: 640,
  });
  modalEl.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 900,
      height: 640,
      top: 0,
      right: 900,
      bottom: 640,
      left: 0,
      toJSON() {
        return {};
      },
    }) as DOMRect;

  return {
    modalEl,
    containerEl,
    contentEl: null,
    doc: document,
    kind: "catalog" as const,
    win: window,
  };
}
