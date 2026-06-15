import { createDragResizeSession, type DragResizeSession } from "./drag-resize";
import {
  applyGeometryPreset,
  clampModalRect,
  getCenteredRect,
  getRestoredGeometry,
  measureHostBounds,
  type GeometryPreset,
  type ModalRect,
} from "./geometry";
import type { SettingsModalMatch } from "./modal-detector";
import type { PersistedGeometry, SetmoveSettings } from "./settings";

const ENHANCED_CLASS = "setmove--settings-modal";
const HANDLE_CLASS = "setmove--drag-handle";
const RESIZE_HANDLE_CLASS = "setmove--resize-handle";
const CONTENT_CLASS = "setmove--settings-content";
const NON_DRAGGABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[contenteditable='true']",
  ".setting-item",
  ".setting-item-control",
  ".vertical-tab-nav-item",
  ".clickable-icon",
  ".slider",
  ".dropdown",
  "[data-setmove-role='resize-handle']",
  "[data-setmove-role='preset-control']",
].join(", ");
const CATALOG_NON_DRAGGABLE_SELECTOR = [
  ".community-item",
  ".community-modal-search-results",
  ".community-modal-details",
  ".theme-card",
  ".theme-list",
].join(", ");
const ENHANCEABLE_MODAL_SELECTOR = ".modal.mod-settings, .modal.setmove--settings-modal";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PRESET_ICON_COLOR = "currentColor";
type IconDefinition = {
  fillPaths?: string[];
  fillRects?: Array<{ height: number; width: number; x: number; y: number }>;
  paths?: string[];
};
const ICON_DEFINITIONS = {
  center: {
    fillRects: [{ x: 8, y: 7, width: 8, height: 10 }],
    paths: ["M4 5h16v14H4z"],
  },
  left: {
    fillRects: [{ x: 4, y: 5, width: 5, height: 14 }],
    paths: ["M4 5h16v14H4z", "M9 5v14"],
  },
  right: {
    fillRects: [{ x: 15, y: 5, width: 5, height: 14 }],
    paths: ["M4 5h16v14H4z", "M15 5v14"],
  },
  reset: {
    fillPaths: [
      "M6.7 7.4A8.6 8.6 0 1 1 5 16.6l2.3-1.3a5.9 5.9 0 1 0 1-6.3l2.1 2.1H4.2V4.9z",
    ],
  },
} as const satisfies Record<string, IconDefinition>;

type PresetControlsPlacement =
  | "top-right-horizontal"
  | "bottom-right-horizontal"
  | "bottom-left-vertical";
const VISIBLE_PRESET_CONTROLS_PLACEMENTS = new Set<PresetControlsPlacement>([
  "bottom-right-horizontal",
]);

const ENHANCER_BY_MODAL = new WeakMap<HTMLElement, SettingsModalEnhancer>();

interface InlineStyleSnapshot {
  height: string;
  left: string;
  maxHeight: string;
  maxWidth: string;
  position: string;
  top: string;
  width: string;
}

export interface SettingsModalEnhancerOptions {
  settings: Pick<
    SetmoveSettings,
    | "movable"
    | "resizable"
    | "rememberGeometry"
    | "geometry"
    | "disableOnNarrowWindows"
    | "narrowWindowThreshold"
  >;
  onGeometryPersist?: (geometry: PersistedGeometry) => void | Promise<void>;
  onResetGeometry?: () => void | Promise<void>;
}

export class SettingsModalEnhancer {
  readonly modalEl: HTMLElement;
  readonly containerEl: HTMLElement;
  readonly doc: Document;
  readonly kind: SettingsModalMatch["kind"];
  readonly win: Window;

  private readonly contentEl: HTMLElement | null;
  private readonly dragHandleEl: HTMLDivElement;
  private readonly defaultSize: Pick<ModalRect, "width" | "height">;
  private readonly presetControlsEls: HTMLDivElement[];
  private readonly resizeHandleEl: HTMLButtonElement;
  private readonly styleSnapshot: InlineStyleSnapshot;
  private readonly dragSession: DragResizeSession;
  private readonly resizeSession: DragResizeSession;
  private readonly onWindowResize = (): void => {
    this.applyEnabledState();

    if (!this.enabled || this.currentRect === null) {
      return;
    }

    this.currentRect = clampModalRect(this.currentRect, this.getHostBounds());
    this.applyRect(this.currentRect);
  };

  private settings: SettingsModalEnhancerOptions["settings"];
  private readonly onGeometryPersist?: SettingsModalEnhancerOptions["onGeometryPersist"];
  private readonly onResetGeometry?: SettingsModalEnhancerOptions["onResetGeometry"];
  private enabled = true;
  private requestedEnabled = true;
  private currentRect: ModalRect | null = null;

  constructor(match: SettingsModalMatch, options: SettingsModalEnhancerOptions) {
    this.modalEl = match.modalEl;
    this.containerEl = match.containerEl;
    this.doc = match.doc;
    this.kind = match.kind;
    this.win = match.win;
    this.settings = { ...options.settings };
    this.onGeometryPersist = options.onGeometryPersist;
    this.onResetGeometry = options.onResetGeometry;
    this.contentEl = match.contentEl;
    this.dragHandleEl = this.createDragHandle();
    this.defaultSize = this.measureModalRect();
    this.presetControlsEls = [
      this.createPresetControls("top-right-horizontal"),
      this.createPresetControls("bottom-right-horizontal"),
      this.createPresetControls("bottom-left-vertical"),
    ];
    this.resizeHandleEl = this.createResizeHandle();
    this.styleSnapshot = this.captureInlineStyles();
    this.dragSession = this.createSession("drag", this.dragHandleEl);
    this.resizeSession = this.createSession("resize", this.resizeHandleEl);

    this.attach();
  }

  center(): ModalRect {
    const nextRect = getCenteredRect(this.getCurrentSize(), this.getHostBounds());
    this.currentRect = nextRect;
    this.applyRect(nextRect);
    return nextRect;
  }

  reset(): ModalRect {
    const nextRect = getCenteredRect(this.defaultSize, this.getHostBounds());
    this.currentRect = nextRect;
    this.applyRect(nextRect);
    return nextRect;
  }

  dockLeft(): ModalRect {
    return this.applyPreset("dock-left");
  }

  dockRight(): ModalRect {
    return this.applyPreset("dock-right");
  }

  async persistCurrentGeometry(): Promise<void> {
    if (this.currentRect) {
      await this.persistGeometry(this.currentRect);
    }
  }

  toggleEnabled(force?: boolean): boolean {
    this.requestedEnabled = force ?? !this.requestedEnabled;
    this.applyEnabledState();

    return this.enabled;
  }

  updateSettings(
    settings: Partial<SettingsModalEnhancerOptions["settings"]>,
  ): void {
    this.settings = {
      ...this.settings,
      ...settings,
    };
    this.toggleEnabled(this.enabled);
  }

  destroy(): void {
    this.win.removeEventListener("resize", this.onWindowResize);
    this.dragSession.destroy();
    this.resizeSession.destroy();
    ENHANCER_BY_MODAL.delete(this.modalEl);
    this.dragHandleEl.remove();
    for (const controlsEl of this.presetControlsEls) {
      controlsEl.remove();
    }
    this.resizeHandleEl.remove();
    this.modalEl.classList.remove(ENHANCED_CLASS, `${ENHANCED_CLASS}--disabled`);
    if (this.contentEl) {
      this.contentEl.classList.remove(CONTENT_CLASS);
      this.contentEl.setCssStyles({
        minHeight: "",
        overflow: "",
      });
    }
    this.restoreInlineStyles();
  }

  private attach(): void {
    this.modalEl.classList.add(ENHANCED_CLASS);
    if (this.contentEl) {
      this.contentEl.classList.add(CONTENT_CLASS);
      this.contentEl.setCssStyles({
        minHeight: "0",
        overflow: "auto",
      });
    }

    this.modalEl.prepend(this.dragHandleEl);
    this.modalEl.append(...this.presetControlsEls);
    this.modalEl.append(this.resizeHandleEl);

    this.currentRect = this.resolveInitialRect();
    this.applyRect(this.currentRect);
    this.toggleEnabled(true);
    this.win.addEventListener("resize", this.onWindowResize);
  }

  private applyPreset(preset: GeometryPreset): ModalRect {
    const nextRect = applyGeometryPreset(
      preset,
      this.getCurrentSize(),
      this.getHostBounds(),
    );
    this.currentRect = nextRect;
    this.applyRect(nextRect);
    return nextRect;
  }

  private applyRect(rect: ModalRect): void {
    this.currentRect = rect;
    this.modalEl.setCssStyles({
      position: "fixed",
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      maxWidth: "none",
      maxHeight: "none",
    });
  }

  private resolveInitialRect(): ModalRect {
    if (this.settings.rememberGeometry) {
      const restored = getRestoredGeometry(this.settings.geometry, this.getHostBounds());
      if (restored) {
        return restored;
      }
    }

    return getCenteredRect(this.measureModalRect(), this.getHostBounds());
  }

  private getCurrentSize(): Pick<ModalRect, "width" | "height"> {
    return this.currentRect ?? this.measureModalRect();
  }

  private getCurrentRect(): ModalRect {
    return this.currentRect
      ? { ...this.currentRect }
      : {
          ...this.measureModalRect(),
          x: this.modalEl.offsetLeft || 0,
          y: this.modalEl.offsetTop || 0,
        };
  }

  private measureModalRect(): Pick<ModalRect, "width" | "height"> {
    const rect = this.modalEl.getBoundingClientRect();
    return {
      width: rect.width || this.modalEl.offsetWidth || 900,
      height: rect.height || this.modalEl.offsetHeight || 640,
    };
  }

  private getHostBounds() {
    return measureHostBounds(this.win);
  }

  private createDragHandle(): HTMLDivElement {
    const handle = this.doc.createElement("div");
    handle.className = HANDLE_CLASS;
    handle.dataset.setmoveRole = "drag-handle";
    handle.setAttribute("role", "presentation");
    return handle;
  }

  private createPresetControls(
    placement: PresetControlsPlacement,
  ): HTMLDivElement {
    const controls = this.doc.createElement("div");
    controls.className = `setmove--preset-controls setmove--preset-controls-${placement}`;
    controls.dataset.setmoveRole = "preset-controls";
    controls.dataset.setmovePlacement = placement;

    this.addPresetButton(controls, "Dock window left", "left", async () => {
      this.dockLeft();
      await this.persistCurrentGeometry();
    });
    this.addPresetButton(controls, "Dock window right", "right", async () => {
      this.dockRight();
      await this.persistCurrentGeometry();
    });
    this.addPresetButton(controls, "Reset window geometry", "reset", async () => {
      if (this.onResetGeometry) {
        await this.onResetGeometry();
        return;
      }

      this.reset();
      await this.persistCurrentGeometry();
    });

    return controls;
  }

  private addPresetButton(
    controls: HTMLElement,
    label: string,
    icon: keyof typeof ICON_DEFINITIONS,
    onClick: () => void | Promise<void>,
  ): void {
    const button = this.doc.createElement("button");
    button.type = "button";
    button.className = "setmove--preset-control";
    button.dataset.setmoveRole = "preset-control";
    button.setAttribute("aria-label", label);
    button.append(this.createIcon(icon));
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void onClick();
    });
    controls.append(button);
  }

  private createIcon(icon: keyof typeof ICON_DEFINITIONS): SVGSVGElement {
    const iconDefinition: IconDefinition = ICON_DEFINITIONS[icon];
    const svg = this.doc.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");

    for (const rectData of iconDefinition.fillRects ?? []) {
      const rect = this.doc.createElementNS(SVG_NAMESPACE, "rect");
      rect.setAttribute("x", String(rectData.x));
      rect.setAttribute("y", String(rectData.y));
      rect.setAttribute("width", String(rectData.width));
      rect.setAttribute("height", String(rectData.height));
      rect.setAttribute("rx", "0.75");
      rect.setAttribute("fill", PRESET_ICON_COLOR);
      rect.setAttribute("opacity", "0.85");
      svg.append(rect);
    }

    for (const pathData of iconDefinition.fillPaths ?? []) {
      const path = this.doc.createElementNS(SVG_NAMESPACE, "path");
      path.setAttribute("d", pathData);
      path.setAttribute("fill", PRESET_ICON_COLOR);
      svg.append(path);
    }

    for (const pathData of iconDefinition.paths ?? []) {
      const path = this.doc.createElementNS(SVG_NAMESPACE, "path");
      path.setAttribute("d", pathData);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", PRESET_ICON_COLOR);
      path.setAttribute("stroke-width", "1.8");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      svg.append(path);
    }

    return svg;
  }

  private createResizeHandle(): HTMLButtonElement {
    const handle = this.doc.createElement("button");
    handle.type = "button";
    handle.className = RESIZE_HANDLE_CLASS;
    handle.dataset.setmoveRole = "resize-handle";
    handle.setAttribute("aria-label", "Resize settings window");
    return handle;
  }

  private applyEnabledState(): void {
    this.enabled = this.requestedEnabled && this.isWideEnoughForEnhancement();
    this.modalEl.classList.toggle(`${ENHANCED_CLASS}--disabled`, !this.enabled);
    this.syncHandleState(
      this.dragHandleEl,
      this.enabled && this.settings.movable,
    );
    this.syncHandleState(
      this.resizeHandleEl,
      this.enabled && this.settings.resizable,
    );

    for (const controlsEl of this.presetControlsEls) {
      const isVisible =
        this.enabled &&
        VISIBLE_PRESET_CONTROLS_PLACEMENTS.has(
          controlsEl.dataset.setmovePlacement as PresetControlsPlacement,
        );
      controlsEl.hidden = !isVisible;
    }

    if (this.enabled) {
      this.currentRect = this.currentRect ?? this.resolveInitialRect();
      this.applyRect(this.currentRect);
    } else {
      this.restoreInlineStyles();
    }
  }

  private isWideEnoughForEnhancement(): boolean {
    return (
      !this.settings.disableOnNarrowWindows ||
      this.win.innerWidth >= this.settings.narrowWindowThreshold
    );
  }

  private syncHandleState(
    handleEl: HTMLElement,
    isVisible: boolean,
  ): void {
    handleEl.hidden = !isVisible;
    handleEl.classList.toggle("setmove--control-disabled", !isVisible);
  }

  private createSession(
    mode: "drag" | "resize",
    handleEl: HTMLElement,
  ): DragResizeSession {
    const interactionEl = mode === "drag" ? this.modalEl : handleEl;

    return createDragResizeSession({
      isEnabled: () =>
        this.enabled &&
        (mode === "drag" ? this.settings.movable : this.settings.resizable),
      handleEl: interactionEl,
      modalEl: this.modalEl,
      mode,
      canStart: (target) =>
        mode === "drag" ? this.canStartDragFrom(target) : this.canStartResizeFrom(target),
      getCurrentRect: () => this.getCurrentRect(),
      getHostBounds: () => this.getHostBounds(),
      onUpdate: (rect) => {
        this.currentRect = rect;
        this.applyRect(rect);
      },
      onCommit: (rect) => {
        this.currentRect = rect;
        void this.persistGeometry(rect);
      },
    });
  }

  private canStartDragFrom(target: Element): boolean {
    if (target.closest("[data-setmove-role='drag-handle']")) {
      return true;
    }

    if (target.closest(NON_DRAGGABLE_SELECTOR)) {
      return false;
    }

    if (this.kind === "catalog" && target.closest(CATALOG_NON_DRAGGABLE_SELECTOR)) {
      return false;
    }

    return target.closest(ENHANCEABLE_MODAL_SELECTOR) === this.modalEl;
  }

  private canStartResizeFrom(target: Element): boolean {
    return Boolean(target.closest("[data-setmove-role='resize-handle']"));
  }

  private async persistGeometry(rect: ModalRect): Promise<void> {
    if (!this.settings.rememberGeometry || !this.onGeometryPersist) {
      return;
    }

    await this.onGeometryPersist({
      schemaVersion: 1,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      lastAppliedBounds: this.getHostBounds(),
    });
  }

  private captureInlineStyles(): InlineStyleSnapshot {
    return {
      height: this.modalEl.style.height,
      left: this.modalEl.style.left,
      maxHeight: this.modalEl.style.maxHeight,
      maxWidth: this.modalEl.style.maxWidth,
      position: this.modalEl.style.position,
      top: this.modalEl.style.top,
      width: this.modalEl.style.width,
    };
  }

  private restoreInlineStyles(): void {
    this.modalEl.setCssStyles({
      height: this.styleSnapshot.height,
      left: this.styleSnapshot.left,
      maxHeight: this.styleSnapshot.maxHeight,
      maxWidth: this.styleSnapshot.maxWidth,
      position: this.styleSnapshot.position,
      top: this.styleSnapshot.top,
      width: this.styleSnapshot.width,
    });
  }
}

export function enhanceSettingsModal(
  match: SettingsModalMatch,
  options: SettingsModalEnhancerOptions,
): SettingsModalEnhancer {
  const existing = ENHANCER_BY_MODAL.get(match.modalEl);
  if (existing) {
    existing.updateSettings(options.settings);
    return existing;
  }

  const enhancer = new SettingsModalEnhancer(match, options);
  ENHANCER_BY_MODAL.set(match.modalEl, enhancer);
  return enhancer;
}
