import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import {
  SettingsModalLifecycle,
  findSettingsModal,
  findSettingsModals,
  isSettingsModalElement,
} from "../src/modal-detector";

describe("settings modal detection", () => {
  it("matches the core Settings modal shape", () => {
    document.body.innerHTML = `
      <div class="modal-container mod-dim">
        <div class="modal mod-settings">
          <button class="modal-close-button" aria-label="Close"></button>
          <div class="vertical-tab-header"></div>
          <div class="vertical-tab-content-container"></div>
        </div>
      </div>
    `;

    const match = findSettingsModal(document);

    expect(match).not.toBeNull();
    expect(match?.modalEl.classList.contains("mod-settings")).toBe(true);
    expect(match?.contentEl?.classList.contains("vertical-tab-content-container")).toBe(
      true,
    );
    expect(match?.kind).toBe("settings");
    expect(match?.doc).toBe(document);
    expect(match?.win).toBe(window);
  });

  it("matches theme and community plugin catalog browser dialogs", () => {
    document.body.innerHTML = `
      <div class="modal-container mod-dim">
        <div class="modal" id="theme-browser">
          <button class="modal-close-button" aria-label="Close"></button>
          <input type="text" placeholder="Filter..." />
          <div>Showing 366 themes</div>
        </div>
      </div>
      <div class="modal-container mod-dim">
        <div class="modal" id="plugin-browser">
          <button class="modal-close-button" aria-label="Close"></button>
          <input type="text" placeholder="Search community plugins..." />
          <div>Showing 4,717 plugins</div>
        </div>
      </div>
    `;

    const dialogs = findSettingsModals(document);

    expect(dialogs).toHaveLength(2);
    expect(dialogs.map((dialog) => dialog.modalEl.id)).toEqual([
      "theme-browser",
      "plugin-browser",
    ]);
    expect(dialogs.every((dialog) => dialog.kind === "catalog")).toBe(true);
    expect(dialogs.every((dialog) => dialog.contentEl === null)).toBe(true);
  });

  it("matches catalog dialogs before the showing count is populated", () => {
    document.body.innerHTML = `
      <div class="modal-container mod-dim">
        <div class="modal" id="theme-browser">
          <button class="modal-close-button" aria-label="Close"></button>
          <input type="text" placeholder="Filter..." />
          <div>Show installed only</div>
          <div>Light themes only</div>
        </div>
      </div>
    `;

    const match = findSettingsModal(document);

    expect(match?.modalEl.id).toBe("theme-browser");
    expect(match?.kind).toBe("catalog");
  });

  it("attaches to catalog dialogs when their text content updates after open", async () => {
    document.body.innerHTML = "";
    const onAttach = vi.fn();
    const lifecycle = new SettingsModalLifecycle({ onAttach });

    lifecycle.trackDocument(document);

    document.body.innerHTML = `
      <div class="modal-container mod-dim">
        <div class="modal" id="theme-browser">
          <button class="modal-close-button" aria-label="Close"></button>
          <input type="text" placeholder="Filter..." />
          <div id="count"></div>
        </div>
      </div>
    `;

    await Promise.resolve();
    expect(onAttach).toHaveBeenCalledTimes(0);

    const countEl = document.getElementById("count");
    if (!countEl) {
      throw new Error("Missing count fixture.");
    }

    countEl.textContent = "Showing 367 themes";
    await Promise.resolve();

    expect(onAttach).toHaveBeenCalledTimes(1);
    expect(onAttach.mock.calls[0]?.[0].kind).toBe("catalog");

    lifecycle.stop();
  });

  it("rejects nested child dialogs and ordinary modals", () => {
    document.body.innerHTML = `
      <div class="modal-container mod-dim">
        <div class="modal mod-settings" id="settings-modal">
          <button class="modal-close-button" aria-label="Close"></button>
          <div class="vertical-tab-header"></div>
          <div class="vertical-tab-content-container"></div>
        </div>
      </div>
      <div class="modal-container mod-dim">
        <div class="modal" id="font-dialog">
          <button class="modal-close-button" aria-label="Close"></button>
          <div class="setting-item">Font picker</div>
        </div>
      </div>
      <div class="modal-container mod-dim">
        <div class="modal mod-settings" id="fake-settings">
          <button class="modal-close-button" aria-label="Close"></button>
          <div class="setting-item">Missing settings structure</div>
        </div>
      </div>
    `;

    const dialogs = findSettingsModals(document);
    const fontDialog = document.getElementById("font-dialog");
    const fakeSettings = document.getElementById("fake-settings");

    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]?.modalEl.id).toBe("settings-modal");
    expect(isSettingsModalElement(fontDialog)).toBe(false);
    expect(isSettingsModalElement(fakeSettings)).toBe(false);
  });
});

describe("settings modal lifecycle", () => {
  it("attaches once and detaches when the modal closes", async () => {
    document.body.innerHTML = "";
    const onAttach = vi.fn(() => vi.fn());
    const onDetach = vi.fn();
    const lifecycle = new SettingsModalLifecycle({ onAttach, onDetach });

    lifecycle.trackDocument(document);

    document.body.innerHTML = `
      <div class="modal-container mod-dim">
        <div class="modal mod-settings">
          <button class="modal-close-button"></button>
          <div class="vertical-tab-header"></div>
          <div class="vertical-tab-content-container"></div>
        </div>
      </div>
    `;

    await Promise.resolve();
    expect(onAttach).toHaveBeenCalledTimes(1);

    document
      .querySelector(".modal.mod-settings")
      ?.classList.add("is-still-the-same-modal");

    await Promise.resolve();
    expect(onAttach).toHaveBeenCalledTimes(1);

    document.querySelector(".modal-container")?.remove();

    await Promise.resolve();
    expect(onDetach).toHaveBeenCalledTimes(1);

    lifecycle.stop();
  });

  it("uses the owning document and window for popout matches", async () => {
    document.body.innerHTML = "";
    const popout = new JSDOM(`<!doctype html><html><body></body></html>`);
    const onAttach = vi.fn();
    const lifecycle = new SettingsModalLifecycle({ onAttach });

    popout.window.document.body.innerHTML = `
      <div class="modal-container mod-dim">
        <div class="modal mod-settings">
          <button class="modal-close-button"></button>
          <div class="vertical-tab-header"></div>
          <div class="vertical-tab-content-container"></div>
        </div>
      </div>
    `;

    lifecycle.trackDocument(popout.window.document);
    expect(onAttach).toHaveBeenCalledTimes(1);
    expect(onAttach.mock.calls[0]?.[0].doc).toBe(popout.window.document);
    expect(onAttach.mock.calls[0]?.[0].win).toBe(popout.window);

    lifecycle.stop();
    popout.window.close();
  });
});
