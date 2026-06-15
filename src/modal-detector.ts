import type { Workspace } from "obsidian";

export const SETTINGS_MODAL_SELECTORS = Object.freeze({
  modal: ".modal.mod-settings",
  modalContainer: ".modal-container",
  closeButton: ".modal-close-button",
  sidebar: ".vertical-tab-header",
  content: ".vertical-tab-content-container",
  anyModal: ".modal",
  searchInput: "input[type='search'], input[type='text'], input:not([type])",
});

export type EnhancedModalKind = "settings" | "catalog";

export interface SettingsModalMatch {
  modalEl: HTMLElement;
  containerEl: HTMLElement;
  contentEl: HTMLElement | null;
  doc: Document;
  kind: EnhancedModalKind;
  win: Window;
}

export interface SettingsModalLifecycleCallbacks {
  onAttach(match: SettingsModalMatch): void | (() => void);
  onDetach?(match: SettingsModalMatch): void;
}

interface AttachedModalRecord {
  cleanup?: () => void;
  match: SettingsModalMatch;
}

export class SettingsModalLifecycle {
  private readonly observers = new Map<Document, MutationObserver>();
  private readonly attached = new Map<HTMLElement, AttachedModalRecord>();

  constructor(private readonly callbacks: SettingsModalLifecycleCallbacks) {}

  trackDocument(doc: Document): void {
    if (this.observers.has(doc)) {
      this.scanDocument(doc);
      return;
    }

    const root = doc.body ?? doc.documentElement;
    if (!root) {
      return;
    }

    const ViewMutationObserver = doc.defaultView?.MutationObserver ?? MutationObserver;
    const observer = new ViewMutationObserver(() => {
      this.scanDocument(doc);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "placeholder", "type"],
    });

    this.observers.set(doc, observer);
    this.scanDocument(doc);
  }

  untrackDocument(doc: Document): void {
    const observer = this.observers.get(doc);
    observer?.disconnect();
    this.observers.delete(doc);

    for (const [modalEl, record] of this.attached) {
      if (record.match.doc === doc) {
        this.detachModal(modalEl, record);
      }
    }
  }

  stop(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();

    for (const [modalEl, record] of this.attached) {
      this.detachModal(modalEl, record);
    }
  }

  private scanDocument(doc: Document): void {
    const matches = findSettingsModals(doc);
    const activeModals = new Set(matches.map((match) => match.modalEl));

    for (const match of matches) {
      if (this.attached.has(match.modalEl)) {
        continue;
      }

      const cleanup = this.callbacks.onAttach(match) ?? undefined;
      this.attached.set(match.modalEl, { cleanup, match });
    }

    for (const [modalEl, record] of this.attached) {
      if (record.match.doc !== doc) {
        continue;
      }

      if (!modalEl.isConnected || !activeModals.has(modalEl)) {
        this.detachModal(modalEl, record);
      }
    }
  }

  private detachModal(
    modalEl: HTMLElement,
    record: AttachedModalRecord,
  ): void {
    this.attached.delete(modalEl);
    record.cleanup?.();
    this.callbacks.onDetach?.(record.match);
  }
}

export function registerSettingsModalLifecycle(
  workspace: Workspace,
  callbacks: SettingsModalLifecycleCallbacks,
): () => void {
  const lifecycle = new SettingsModalLifecycle(callbacks);

  lifecycle.trackDocument(window.document);

  const openRef = workspace.on("window-open", (workspaceWindow, popoutWindow) => {
    lifecycle.trackDocument(workspaceWindow.doc ?? popoutWindow.document);
  });

  const closeRef = workspace.on(
    "window-close",
    (workspaceWindow, popoutWindow) => {
      lifecycle.untrackDocument(workspaceWindow.doc ?? popoutWindow.document);
    },
  );

  return () => {
    workspace.offref(openRef);
    workspace.offref(closeRef);
    lifecycle.stop();
  };
}

export function findSettingsModal(root: ParentNode): SettingsModalMatch | null {
  return findSettingsModals(root)[0] ?? null;
}

export function findSettingsModals(root: ParentNode): SettingsModalMatch[] {
  const matches: SettingsModalMatch[] = [];
  const modalEls = Array.from(
    root.querySelectorAll<HTMLElement>(SETTINGS_MODAL_SELECTORS.anyModal),
  );

  for (const modalEl of modalEls) {
    const match = toEnhancedModalMatch(modalEl);
    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

export function isSettingsModalElement(element: Element | null): element is HTMLElement {
  return toSettingsModalMatch(element) !== null;
}

function toSettingsModalMatch(element: Element | null): SettingsModalMatch | null {
  if (!isHTMLElement(element)) {
    return null;
  }

  if (!element.matches(SETTINGS_MODAL_SELECTORS.modal)) {
    return null;
  }

  const containerEl = element.closest<HTMLElement>(
    SETTINGS_MODAL_SELECTORS.modalContainer,
  );

  if (!containerEl) {
    return null;
  }

  const contentEl = element.querySelector(SETTINGS_MODAL_SELECTORS.content);
  const hasRequiredStructure =
    isHTMLElement(element.querySelector(SETTINGS_MODAL_SELECTORS.sidebar)) &&
    isHTMLElement(contentEl) &&
    isHTMLElement(element.querySelector(SETTINGS_MODAL_SELECTORS.closeButton));

  if (!hasRequiredStructure) {
    return null;
  }

  const doc = element.ownerDocument;
  const win = doc.defaultView;

  if (!win) {
    return null;
  }

  return {
    modalEl: element,
    containerEl,
    contentEl,
    doc,
    kind: "settings",
    win,
  };
}

function toEnhancedModalMatch(element: Element | null): SettingsModalMatch | null {
  return toSettingsModalMatch(element) ?? toCatalogModalMatch(element);
}

function toCatalogModalMatch(element: Element | null): SettingsModalMatch | null {
  if (!isHTMLElement(element)) {
    return null;
  }

  if (!element.matches(SETTINGS_MODAL_SELECTORS.anyModal)) {
    return null;
  }

  if (element.matches(SETTINGS_MODAL_SELECTORS.modal)) {
    return null;
  }

  const containerEl = element.closest<HTMLElement>(
    SETTINGS_MODAL_SELECTORS.modalContainer,
  );

  if (!containerEl) {
    return null;
  }

  if (!isHTMLElement(element.querySelector(SETTINGS_MODAL_SELECTORS.closeButton))) {
    return null;
  }

  if (!looksLikeCatalogBrowser(element)) {
    return null;
  }

  const doc = element.ownerDocument;
  const win = doc.defaultView;

  if (!win) {
    return null;
  }

  return {
    modalEl: element,
    containerEl,
    contentEl: null,
    doc,
    kind: "catalog",
    win,
  };
}

function looksLikeCatalogBrowser(modalEl: HTMLElement): boolean {
  const text = modalEl.textContent ?? "";
  const hasCatalogCount = /\bShowing\s+[\d,]+\s+(themes|plugins)\b/i.test(text);
  const hasCatalogControls =
    /\bShow installed only\b/i.test(text) &&
    (/\bLight themes only\b/i.test(text) ||
      /\bthemes\b/i.test(text) ||
      /\bplugins\b/i.test(text));
  const hasCatalogResults = Boolean(
    modalEl.querySelector(
      [
        ".community-modal-search-results",
        ".community-item",
        ".community-item-name",
        ".theme-card",
        ".theme-list",
      ].join(", "),
    ),
  );
  const hasSearchInput = Array.from(
    modalEl.querySelectorAll<HTMLInputElement>(SETTINGS_MODAL_SELECTORS.searchInput),
  ).some((input) => {
    const placeholder = input.getAttribute("placeholder") ?? "";
    return /filter|search community plugins|search/i.test(placeholder);
  });

  return hasSearchInput && (hasCatalogCount || hasCatalogControls || hasCatalogResults);
}

function isHTMLElement(value: unknown): value is HTMLElement {
  if (
    typeof value !== "object" ||
    value === null ||
    !("ownerDocument" in value) ||
    !("nodeType" in value) ||
    value.nodeType !== Node.ELEMENT_NODE
  ) {
    return false;
  }

  const element = value as {
    ownerDocument: Document;
  };
  const view = element.ownerDocument.defaultView;
  return Boolean(view && value instanceof view.HTMLElement);
}
