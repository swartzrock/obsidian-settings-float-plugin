---
title: "feat: Add movable and resizable Obsidian Settings"
type: feat
date: 2026-06-12
origin: docs/requirements/movable-resizable-settings-prd.md
---

# TODO: Movable and Resizable Obsidian Settings Plugin

## Summary

Build a TypeScript Obsidian community plugin that enhances the core Settings modal and selected catalog browser dialogs with safe move, resize, persistence, and recovery controls. The first release should stay focused on Settings plus theme/community plugin browsing so users can preview appearance changes against the active workspace without closing and reopening dialogs.

## Scope

In scope:

- Scaffold a standard Obsidian plugin project.
- Detect the core Settings modal plus theme/community plugin browser dialogs, and enhance only those supported dialogs.
- Add explicit drag and resize affordances.
- Persist safe geometry per vault through plugin data.
- Clamp modal geometry to the visible Obsidian window.
- Provide a settings-tab reset action for saved Settings geometry.
- Add minimal plugin settings and user-facing documentation.
- Add focused automated tests for pure geometry/state logic and manual QA coverage for Obsidian DOM behavior.

Out of scope:

- Recreating Obsidian Settings as a custom pane.
- Opening Settings in a separate native Electron window.
- Patching private Obsidian internals or monkey-patching Settings constructors.
- Making every Obsidian modal movable.
- Handling child-dialog positioning beyond avoiding interference.
- Mobile support beyond safe disable/no-op behavior.


## Goal Mode Instructions

If this file is used with `/goal`, the goal for a single run is NOT to finish this whole file. The goal for a single run is:

> Complete all unchecked tasks in exactly one phase, report manual test instructions, and stop.

Stopping after one phase is a successful completion of that run. Do not continue just because there are more unchecked phases below.

## Rules

1. Only work on ONE incomplete phase at a time.
2. Before editing code, identify the single phase you are about to complete.
3. Complete all unchecked tasks in the selected phase.
4. Do not inspect or implement later phases except to understand dependencies for the selected phase.
5. When the selected phase is fully coded and verified, mark only that phase's completed tasks as [x].
6. After finishing the selected phase, STOP immediately and report:
- what changed
- tests/build results
- manual Obsidian test instructions
1. Do not commit immediately after finishing a phase.
2. Wait for the user to manually test in Obsidian.
3. Only create a git commit after the user explicitly says `continue`.
4. When the user says `continue`, first commit the completed phase with a descriptive commit message, then begin exactly one next incomplete phase.
5. Never include unfinished phase work in the commit.
6. If there are still incomplete phases after the selected phase is complete, leave them incomplete and stop anyway.
7. Use bun for package management



## Key Technical Decisions

- KTD1. Use the official Obsidian sample plugin shape: start from a conventional `src/main.ts`, `manifest.json`, `styles.css`, `package.json`, `tsconfig.json`, and build config so the repo follows community plugin expectations.
- KTD2. Attach behavior through DOM observation and public plugin lifecycle hooks: the Obsidian API exposes DOM utilities and `registerDomEvent`, but not a first-class Settings-window API, so all DOM selectors must be centralized and easy to update.
- KTD3. Store plugin configuration and geometry with `loadData` and `saveData`: Obsidian plugin data is written to `data.json` in the plugin folder, which is the right persistence layer for per-vault geometry.
- KTD4. Treat desktop as the first-class surface: use `Platform` checks to no-op on mobile and narrow windows by default.
- KTD5. Keep generic nested modals unmodified: the motivating font-picker workflow has a child dialog, so the modal detector must identify the main Settings modal and selected catalog browser dialogs while avoiding handles on unrelated child dialogs.
- KTD6. Keep geometry logic pure where possible: bounds, presets, clamping, and persistence validation should live in testable modules rather than inside pointer-event handlers.

## Output Structure

```text
.
├── manifest.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── esbuild.config.mjs
├── eslint.config.mts
├── styles.css
├── versions.json
├── README.md
├── src/
│   ├── main.ts
│   ├── settings.ts
│   ├── settings-tab.ts
│   ├── modal-detector.ts
│   ├── modal-enhancer.ts
│   ├── geometry.ts
│   ├── drag-resize.ts
│   ├── commands.ts
│   └── platform.ts
└── tests/
    ├── geometry.test.ts
    ├── settings.test.ts
    ├── modal-detector.test.ts
    └── drag-resize.test.ts
```

## Phase 1: Project Scaffold

- [x] Create the Obsidian plugin scaffold files: `manifest.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mts`, `versions.json`, `styles.css`, and `src/main.ts`.
- [x] Choose the plugin id and display name, keeping them stable for `manifest.json`, release assets, and documentation.
- [x] Configure TypeScript and esbuild to compile `src/main.ts` into root `main.js`.
- [x] Add package scripts for development build, production build, linting, type checking, and tests.
- [x] Add test tooling for TypeScript modules that can run outside Obsidian, such as Vitest with a DOM-capable environment.
- [x] Add `.gitignore` entries for build output, dependencies, editor files, and local vault/test artifacts.
- [x] Add a minimal `README.md` with install, development, and current limitation notes.
- [x] Verify the scaffold can build before feature work begins.

## Phase 2: Settings Model and Persistence

- [x] Create `src/settings.ts` with typed plugin settings for movable behavior, resizable behavior, persistence, visible preset controls, and mobile/narrow-window disablement.
- [x] Define a persisted geometry model with `x`, `y`, `width`, `height`, schema version, and last-applied bounds metadata.
- [x] Add defaults that match the PRD: movable on, resizable on, remember geometry on, preset controls on if visible controls ship, and mobile/narrow disablement on.
- [x] Implement loading settings through `loadData`, merging missing fields with defaults.
- [x] Implement saving settings through `saveData`, preserving forward-compatible unknown-free typed data.
- [x] Add geometry reset helpers that clear saved geometry without clearing unrelated plugin settings.
- [x] Add migration handling for future schema changes, even if version 0.1 only has one schema.
- [x] Test default merging, persistence round trips, geometry reset, and invalid saved-data recovery in `tests/settings.test.ts`.

## Phase 3: Settings Modal Detection and Lifecycle

- [x] Create `src/modal-detector.ts` to identify the core Settings modal through centralized selector and structure checks.
- [x] Prefer robust signals such as Settings-specific modal structure, title/sidebar/content shape, and exclusion of child dialogs over broad `.modal` matching.
- [x] Identify theme and community plugin browser dialogs through conservative catalog-browser structure checks.
- [x] Use a `MutationObserver` or lifecycle polling strategy to notice when Settings opens without patching Obsidian internals.
- [x] Ensure the detector returns no match for nested child dialogs such as font selectors.
- [x] Ensure the detector returns no match for ordinary plugin modals and non-Settings Obsidian dialogs.
- [x] Create an attach/detach lifecycle that enhances each Settings modal once and cleans up when it closes.
- [x] Handle Obsidian popout windows by using the modal's owning `document` and `window`, not only global `document` and `window`.
- [x] Route detector cleanup through plugin unload.
- [x] Test detector behavior with representative DOM fixtures in `tests/modal-detector.test.ts`.

## Phase 4: Geometry Engine

- [x] Create `src/geometry.ts` with pure functions for measuring host bounds, validating saved geometry, clamping rectangles, and applying presets.
- [x] Define minimum modal dimensions that keep Settings usable and record the rationale in code comments or docs.
- [x] Clamp `x` and `y` so at least the full modal, or a defined recovery-safe portion, remains inside the visible Obsidian window.
- [x] Clamp `width` and `height` between minimum dimensions and available host bounds.
- [x] Add preset calculations for center, dock left, dock right, and bottom half if bottom half is kept for 0.1.
- [x] Ensure persisted geometry is ignored when dimensions are non-finite, negative, too small, or incompatible with the current host window.
- [x] Recompute geometry on host window resize.
- [x] Preserve current modal size when centering, unless it no longer fits.
- [x] Keep geometry functions independent from Obsidian imports.
- [x] Test clamping, minimums, presets, bad persisted data, host resize, and edge cases in `tests/geometry.test.ts`.

## Phase 5: Modal Enhancement Shell

- [x] Create `src/modal-enhancer.ts` to own one enhanced Settings modal instance.
- [x] Add a plugin-specific class to the Settings modal while enhanced.
- [x] Add a drag handle in the modal header or an inserted handle strip.
- [x] Add a resize handle at the bottom-right corner.
- [x] Apply geometry through inline styles or CSS variables in a way that does not fight Obsidian themes.
- [x] Keep Settings content scrollable after resizing.
- [x] Make enhancement idempotent so reopening or DOM mutation does not duplicate handles.
- [x] Detach handles, classes, inline styles, observers, and event listeners on modal close.
- [x] Expose methods for commands to center, reset, dock left, dock right, and toggle behavior.
- [x] Add integration-shaped tests with DOM fixtures where practical, plus manual QA notes for behavior that requires Obsidian.

## Phase 6: Drag and Resize Interactions

- [x] Create `src/drag-resize.ts` for pointer-event state machines shared by drag and resize behavior.
- [x] Start drag only from the drag handle, never from setting rows, inputs, sliders, dropdowns, or buttons.
- [x] Start resize only from the resize handle.
- [x] Use pointer capture during active drag/resize when available.
- [x] Disable text selection or accidental interaction only for the duration of active drag/resize.
- [x] Convert pointer deltas into geometry changes through the pure geometry engine.
- [x] Persist geometry after interaction ends when persistence is enabled.
- [x] Ignore secondary mouse buttons and unsupported touch/mobile cases for 0.1.
- [x] Handle cancel paths such as pointer cancellation, modal close, and plugin unload.
- [x] Test pointer state transitions, ignored targets, persistence callbacks, and cancellation in `tests/drag-resize.test.ts`.

## Phase 7: Commands, Presets, and Settings UI

- [x] Create `src/commands.ts` to register reset, center, dock-left, dock-right, and toggle commands from the main plugin.
- [x] Ensure reset works even when Settings is closed by clearing saved geometry and applying default behavior next open.
- [x] Ensure commands gracefully no-op or show a notice when Settings is not currently open and the command only affects a live modal.
- [x] Create `src/settings-tab.ts` with toggles for movable, resizable, persistence, preset controls, and mobile/narrow disablement.
- [x] Add a reset saved geometry button to the settings tab.
- [x] Apply setting changes to the currently open Settings modal without requiring an Obsidian restart where feasible.
- [x] Keep visible preset controls optional; if shipped in 0.1, add them as compact controls that do not crowd the Settings UI.
- [x] Test command registration and settings-state behavior with mocks where practical.

## Phase 8: Styling, Accessibility, and Theme Compatibility

- [x] Add isolated CSS classes in `styles.css` for the enhanced modal, drag handle, resize handle, active-drag state, and optional preset controls.
- [x] Use Obsidian CSS variables for colors, borders, backgrounds, shadows, and text contrast.
- [x] Ensure handles are visible in light and dark themes.
- [x] Add accessible labels or titles for visible handles and preset controls.
- [x] Preserve Escape, close button, click-outside, and focus behavior for Settings and child dialogs.
- [x] Avoid layout styles that cause nested modals or Settings content to lose scrollability.
- [x] Manually verify common built-in themes and at least one custom theme before release.

## Phase 9: Obsidian Manual QA

- [ ] Install the built plugin into a test vault under `.obsidian/plugins/<plugin-id>/`.
- [ ] Verify Settings opens normally with the plugin disabled.
- [ ] Verify Settings opens with a drag affordance and resize affordance when the plugin is enabled.
- [ ] Verify Appearance font changes can be previewed with part of the active note visible.
- [ ] Verify dragging does not trigger or block Settings controls.
- [ ] Verify resizing keeps Settings content usable and scrollable.
- [ ] Verify geometry persists after closing and reopening Settings.
- [ ] Verify reset, center, dock-left, and dock-right commands.
- [ ] Verify the Text font child dialog does not receive handles and still closes/focuses correctly.
- [ ] Verify host window resize clamps the modal back into a recoverable visible area.

## Phase 10: Documentation and Release Readiness

- [ ] Expand `README.md` with screenshots or GIFs showing the appearance-preview workflow.
- [x] Document commands, settings, recovery behavior, and mobile/narrow-window limitations.
- [x] Document known compatibility risks around Obsidian DOM changes and themes.
- [x] Add release notes for version 0.1.
- [x] Confirm release artifacts are `manifest.json`, `main.js`, and `styles.css`.
- [x] Confirm `versions.json` maps the plugin version to the intended minimum Obsidian version.
- [x] Run final build, lint, type-check, and test verification.
- [x] Manually inspect the release bundle before publishing.

## Acceptance Coverage Map

| Acceptance criterion | Primary phases |
|---|---|
| AC1. Settings shows a draggable affordance | Phase 3, Phase 5, Phase 9 |
| AC2. Dragging moves Settings without triggering controls | Phase 6, Phase 8, Phase 9 |
| AC3. Resize changes dimensions while preserving content | Phase 4, Phase 5, Phase 9 |
| AC4. Reopen restores valid geometry | Phase 2, Phase 4, Phase 9 |
| AC5. Host resize clamps modal into view | Phase 4, Phase 5, Phase 9 |
| AC6. Reset restores default centered layout | Phase 2, Phase 7, Phase 9 |
| AC7. Dock presets produce predictable layouts | Phase 4, Phase 7, Phase 9 |
| AC8. Child font dialog does not receive handles | Phase 3, Phase 5, Phase 9 |
| AC9. Disabling plugin restores normal behavior | Phase 5, Phase 7, Phase 9 |
| AC10. Plugin unload cleans up listeners and DOM additions | Phase 3, Phase 5, Phase 6 |

## Risks and Mitigations

- Obsidian Settings DOM changes: centralize selectors in `src/modal-detector.ts`, keep behavior fail-closed, and document manual QA after Obsidian updates.
- Theme conflicts: use isolated class names and Obsidian CSS variables in `styles.css`.
- Lost modal geometry: validate persisted data, clamp on every open and resize, and ship a settings-tab reset action in 0.1.
- Nested modal interference: explicitly test child dialogs and keep enhancement scoped to the main Settings modal plus selected catalog browser dialogs.
- Pointer-event regressions: keep drag/resize state isolated in `src/drag-resize.ts` and cover state transitions with tests.
- Limited automated coverage inside Obsidian: test pure modules thoroughly and maintain an explicit manual QA checklist for Obsidian-only behavior.

## Sources and References

- `docs/requirements/movable-resizable-settings-prd.md`
- `docs/ideation/2026-06-12-movable-resizable-obsidian-settings-ideation.html`
- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- Obsidian API definitions: https://raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts
- Obsidian forum request: https://forum.obsidian.md/t/resizable-settings-window/36628
