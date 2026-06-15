import { beforeEach, describe, expect, it } from "vitest";
import { enhanceSettingsModal } from "../src/modal-enhancer";
import type { SettingsModalMatch } from "../src/modal-detector";
import { DEFAULT_SETTINGS, type PersistedGeometry } from "../src/settings";

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

describe("settings modal enhancer", () => {
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

  it("adds classes, handles, and centered geometry", () => {
    const match = createSettingsMatch();

    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
    });

    expect(match.modalEl.classList.contains("setmove--settings-modal")).toBe(true);
    expect(match.modalEl.querySelector('[data-setmove-role="drag-handle"]')).not.toBeNull();
    expect(match.modalEl.querySelector('[data-setmove-role="resize-handle"]')).not.toBeNull();
    expect(
      Array.from(
        match.modalEl.querySelectorAll<HTMLElement>(
          '[data-setmove-role="preset-controls"]',
        ),
      ).map((controls) => controls.dataset.setmovePlacement),
    ).toEqual([
      "top-right-horizontal",
      "bottom-right-horizontal",
      "bottom-left-vertical",
    ]);
    expect(match.modalEl.querySelectorAll('[data-setmove-role="preset-control"]')).toHaveLength(9);
    expect(
      Array.from(
        match.modalEl.querySelectorAll<HTMLElement>(
          '[data-setmove-role="preset-controls"]',
        ),
      ).map((controls) => [controls.dataset.setmovePlacement, controls.hidden]),
    ).toEqual([
      ["top-right-horizontal", true],
      ["bottom-right-horizontal", false],
      ["bottom-left-vertical", true],
    ]);
    expect(
      Array.from(
        match.modalEl.querySelectorAll<HTMLElement>(
          '[data-setmove-placement="top-right-horizontal"] [data-setmove-role="preset-control"]',
        ),
      ).map((control) => control.getAttribute("aria-label")),
    ).toEqual([
      "Dock window left",
      "Dock window right",
      "Reset window geometry",
    ]);
    expect(match.modalEl.style.position).toBe("fixed");
    expect(match.modalEl.style.left).toBe("270px");
    expect(match.modalEl.style.top).toBe("130px");
    expect(match.modalEl.style.width).toBe("900px");
    expect(match.modalEl.style.height).toBe("640px");

    enhancer.destroy();
  });

  it("restores remembered geometry and exposes preset methods", () => {
    const match = createSettingsMatch();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
        geometry: savedGeometry,
      },
    });

    expect(match.modalEl.style.left).toBe("48px");
    expect(match.modalEl.style.top).toBe("72px");

    enhancer.dockRight();
    expect(match.modalEl.style.left).toBe("800px");
    expect(match.modalEl.style.top).toBe("0px");
    expect(match.modalEl.style.width).toBe("640px");
    expect(match.modalEl.style.height).toBe("900px");

    enhancer.center();
    expect(match.modalEl.style.left).toBe("400px");
    expect(match.modalEl.style.top).toBe("0px");
    expect(match.modalEl.style.width).toBe("640px");
    expect(match.modalEl.style.height).toBe("900px");

    enhancer.reset();
    expect(match.modalEl.style.left).toBe("270px");
    expect(match.modalEl.style.top).toBe("130px");
    expect(match.modalEl.style.width).toBe("900px");
    expect(match.modalEl.style.height).toBe("640px");

    enhancer.destroy();
  });

  it("reuses one enhancer per modal and does not duplicate handles", () => {
    const match = createSettingsMatch();
    const first = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
    });
    const second = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
        movable: false,
      },
    });

    expect(second).toBe(first);
    expect(
      match.modalEl.querySelectorAll('[data-setmove-role="drag-handle"]'),
    ).toHaveLength(1);
    expect(
      match.modalEl.querySelectorAll('[data-setmove-role="resize-handle"]'),
    ).toHaveLength(1);
    expect(
      match.modalEl.querySelectorAll('[data-setmove-role="preset-controls"]'),
    ).toHaveLength(3);
    expect(
      match.modalEl.querySelectorAll('[data-setmove-role="preset-control"]'),
    ).toHaveLength(9);
    expect(
      (match.modalEl.querySelector('[data-setmove-role="drag-handle"]') as HTMLElement)
        .hidden,
    ).toBe(true);
    expect(
      (match.modalEl.querySelector('[data-setmove-role="resize-handle"]') as HTMLElement)
        .style.display,
    ).not.toBe("none");

    first.destroy();
  });

  it("applies preset button actions and routes reset through the callback", () => {
    const match = createSettingsMatch();
    let resetCalls = 0;
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
      onResetGeometry: () => {
        resetCalls += 1;
      },
    });

    const bottomHorizontalControls = match.modalEl.querySelector<HTMLElement>(
      '[data-setmove-placement="bottom-right-horizontal"]',
    );
    const dockRightButton = bottomHorizontalControls?.querySelector<HTMLButtonElement>(
      '[aria-label="Dock window right"]',
    );
    dockRightButton?.click();

    expect(match.modalEl.style.left).toBe("800px");
    expect(match.modalEl.style.top).toBe("0px");

    const resetButton = bottomHorizontalControls?.querySelector<HTMLButtonElement>(
      '[aria-label="Reset window geometry"]',
    );
    resetButton?.click();

    expect(resetCalls).toBe(1);

    enhancer.destroy();
  });

  it("renders position icons as a consistent window-thirds family", () => {
    const match = createSettingsMatch();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
    });

    const controls = match.modalEl.querySelector<HTMLElement>(
      '[data-setmove-placement="bottom-right-horizontal"]',
    );
    const leftIcon = controls?.querySelector<SVGSVGElement>(
      '[aria-label="Dock window left"] svg',
    );
    const rightIcon = controls?.querySelector<SVGSVGElement>(
      '[aria-label="Dock window right"] svg',
    );
    const resetIcon = controls?.querySelector<SVGSVGElement>(
      '[aria-label="Reset window geometry"] svg',
    );

    expect(controls?.querySelector('[aria-label="Center window"]')).toBeNull();
    expect(leftIcon?.querySelector("rect")?.getAttribute("x")).toBe("4");
    expect(rightIcon?.querySelector("rect")?.getAttribute("x")).toBe("15");
    expect(leftIcon?.querySelectorAll("path")).toHaveLength(2);
    expect(rightIcon?.querySelectorAll("path")).toHaveLength(2);
    expect(resetIcon?.querySelector("path")?.getAttribute("fill")).toBe("#777799");
    expect(leftIcon?.querySelector("path")?.getAttribute("stroke")).toBe("#777799");
    expect(resetIcon?.querySelector("path")?.getAttribute("d")).toContain(
      "H4.2V4.9z",
    );

    enhancer.destroy();
  });

  it("fully hides the resize handle when resizing is disabled", () => {
    const match = createSettingsMatch();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
    });

    enhancer.updateSettings({ resizable: false });

    const resizeHandle = match.modalEl.querySelector<HTMLElement>(
      '[data-setmove-role="resize-handle"]',
    );

    expect(resizeHandle?.hidden).toBe(true);
    expect(resizeHandle?.style.display).toBe("none");
    expect(resizeHandle?.style.pointerEvents).toBe("none");
    expect(resizeHandle?.style.cursor).toBe("default");

    enhancer.destroy();
  });

  it("enhances catalog dialogs without settings content rewrites", () => {
    const match = createCatalogMatch();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
        geometry: null,
        rememberGeometry: false,
      },
    });

    expect(enhancer.kind).toBe("catalog");
    expect(match.modalEl.classList.contains("setmove--settings-modal")).toBe(true);
    expect(match.modalEl.querySelector('[data-setmove-role="drag-handle"]')).not.toBeNull();
    expect(match.modalEl.querySelector('[data-setmove-role="resize-handle"]')).not.toBeNull();
    expect(match.modalEl.querySelectorAll('[data-setmove-role="preset-controls"]')).toHaveLength(3);
    expect(match.modalEl.querySelector(".setmove--settings-content")).toBeNull();

    enhancer.destroy();
  });

  it("reclamps current geometry when the host window shrinks", () => {
    const match = createSettingsMatch();
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
        geometry: savedGeometry,
      },
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 820,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 640,
    });

    window.dispatchEvent(new Event("resize"));

    expect(match.modalEl.style.left).toBe("0px");
    expect(match.modalEl.style.top).toBe("0px");
    expect(match.modalEl.style.width).toBe("820px");
    expect(match.modalEl.style.height).toBe("640px");

    enhancer.destroy();
  });

  it("cleans up classes, styles, handles, and settings-shell state on destroy", () => {
    const match = createSettingsMatch();
    match.modalEl.style.position = "relative";
    match.modalEl.style.left = "12px";
    const enhancer = enhanceSettingsModal(match, {
      settings: {
        ...DEFAULT_SETTINGS,
      },
    });

    enhancer.destroy();

    expect(match.modalEl.classList.contains("setmove--settings-modal")).toBe(false);
    expect(match.modalEl.querySelector('[data-setmove-role="drag-handle"]')).toBeNull();
    expect(match.modalEl.querySelector('[data-setmove-role="resize-handle"]')).toBeNull();
    expect(match.modalEl.querySelector('[data-setmove-role="preset-controls"]')).toBeNull();
    expect(match.modalEl.style.position).toBe("relative");
    expect(match.modalEl.style.left).toBe("12px");
    expect(match.contentEl.style.overflow).toBe("");
  });
});

function createSettingsMatch(): SettingsModalMatch & { contentEl: HTMLElement } {
  document.body.innerHTML = `
    <div class="modal-container mod-dim">
      <div class="modal mod-settings">
        <button class="modal-close-button" aria-label="Close"></button>
        <div class="vertical-tab-header"></div>
        <div class="vertical-tab-content-container"></div>
      </div>
    </div>
  `;

  const modalEl = document.querySelector<HTMLElement>(".modal.mod-settings");
  const containerEl = document.querySelector<HTMLElement>(".modal-container");
  const contentEl = document.querySelector<HTMLElement>(".vertical-tab-content-container");

  if (!modalEl || !containerEl || !contentEl) {
    throw new Error("Missing settings modal fixture.");
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
    kind: "settings",
    win: window,
  };
}

function createCatalogMatch(): SettingsModalMatch {
  document.body.innerHTML = `
    <div class="modal-container mod-dim">
      <div class="modal">
        <button class="modal-close-button" aria-label="Close"></button>
        <input type="text" placeholder="Filter..." />
        <div>Showing 366 themes</div>
      </div>
    </div>
  `;

  const modalEl = document.querySelector<HTMLElement>(".modal");
  const containerEl = document.querySelector<HTMLElement>(".modal-container");

  if (!modalEl || !containerEl) {
    throw new Error("Missing catalog modal fixture.");
  }

  Object.defineProperty(modalEl, "offsetWidth", {
    configurable: true,
    value: 1100,
  });
  Object.defineProperty(modalEl, "offsetHeight", {
    configurable: true,
    value: 720,
  });
  modalEl.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 1100,
      height: 720,
      top: 0,
      right: 1100,
      bottom: 720,
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
    kind: "catalog",
    win: window,
  };
}
