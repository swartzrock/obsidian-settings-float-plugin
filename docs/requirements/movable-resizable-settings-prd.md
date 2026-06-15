---
date: 2026-06-12
topic: movable-resizable-settings
type: product_requirements
---

# Product Requirements: Movable and Resizable Obsidian Settings

## Summary

Build an Obsidian community plugin, written in TypeScript, that lets users move and resize the core Settings window and supported catalog dialogs. The primary use case is appearance tuning: users should be able to adjust fonts, themes, CSS snippets, zoom, and similar visual settings while still seeing the note or workspace behind Settings.

The first release should be a focused utility, not a general modal/window manager. It should enhance the existing Settings modal and selected catalog browser dialogs with safe drag and resize behavior while avoiding private Obsidian API patches wherever possible.

## Problem

Obsidian Settings opens as a large centered modal that obscures the active workspace. When changing appearance-related settings, users cannot see the effect of their changes in context. They must close Settings, inspect the workspace, remember what changed, reopen Settings, and navigate back to the relevant section.

This creates two pains:

- Slow feedback cycles while tuning visual settings.
- Unnecessary memory burden because the setting value and visual result are separated in time.

The motivating screenshot shows the Appearance settings page and a nested Text font dialog covering the note beneath, which means the plugin must handle both the main Settings modal and child dialogs carefully.

## Goals

- Let users move the Settings window so the active note/workspace remains visible.
- Let users resize the Settings window without breaking Settings layout or controls.
- Let users move and resize theme and community plugin browser dialogs so catalog browsing does not obscure live preview context.
- Remember safe window geometry between Settings opens.
- Provide recovery controls when the modal is moved or resized into an undesirable state.
- Avoid affecting unrelated Obsidian modals unless explicitly added in a later release.
- Keep behavior reversible and easy to disable.

## Non-Goals

- Do not recreate Obsidian Settings as a custom pane.
- Do not open Settings in a separate native Electron window.
- Do not patch Obsidian internals or monkey-patch Settings constructors for the first release.
- Do not make every Obsidian modal movable and resizable.
- Do not implement a screenshot comparison workflow.
- Do not replace themes, snippets, or Appearance settings themselves.

## Target Users

- Users who frequently customize themes, fonts, CSS snippets, and visual settings.
- Theme builders who need to see live visual effects while changing Settings.
- Plugin developers and power users who often move between Settings and live workspace state.
- Users on laptops or single-monitor setups where the Settings modal consumes most of the available screen.

## Core User Stories

- As a user changing my text font, I want to move Settings aside so I can see the current note while selecting fonts.
- As a theme customizer, I want to resize Settings so the Appearance controls remain usable while more of the workspace is visible.
- As a user choosing a theme, I want the theme browser dialog to move aside so I can see the theme applied to my workspace.
- As a user with a preferred layout, I want Settings to reopen in the same place and size next time.
- As a user who moves Settings too far, I want a settings-tab reset action to restore the default centered position.
- As a user interacting with a nested font picker, I want child dialogs to keep working normally.

## Functional Requirements

- R1. The plugin enhances the core Obsidian Settings modal when it opens.
- R1a. The plugin enhances Obsidian's theme and community plugin browser dialogs when they open.
- R2. The plugin adds a clear drag affordance to the Settings modal, preferably in the header or an inserted handle strip.
- R3. The plugin allows resizing the Settings modal from at least the bottom-right corner.
- R4. The plugin enforces minimum width and height values so Settings remains usable.
- R5. The plugin clamps the modal to the visible Obsidian window after drag, resize, open, and host window resize.
- R6. The plugin persists Settings modal geometry per vault.
- R7. The plugin validates persisted geometry before applying it.
- R8. The plugin exposes a settings-tab action to reset Settings geometry to Obsidian's default centered layout.
- R9. The plugin does not expose command palette actions for positioning in the first release.
- R10. The plugin can be disabled from its own settings tab.
- R11. The plugin does not apply drag or resize behavior to nested child dialogs by default.
- R12. The plugin does not interfere with form controls, sliders, dropdowns, buttons, search inputs, or nested modal focus.
- R13. The plugin cleans up all DOM additions and event listeners on unload.
- R14. The plugin uses isolated CSS class names to avoid theme conflicts.

## Settings

The plugin settings should be minimal for the first release:

- Enable movable Settings: default on.
- Enable resizable Settings: default on.
- Remember last position and size: default on.
- Reset saved geometry: action button.
- Advanced: disable on mobile or narrow windows: default on.

## Commands

No command palette actions ship in version 0.1.

Optional later commands:

- Reset Settings window position and size.
- Center Settings.
- Dock Settings left.
- Dock Settings right.
- Toggle movable Settings.
- Narrow Settings.
- Widen Settings.
- Move Settings by keyboard increment.

## Interaction Requirements

Dragging:

- Dragging should only start from the handle/header affordance.
- Dragging should not start from setting rows, text inputs, sliders, dropdowns, or buttons.
- Dragging should maintain pointer capture until release.
- Dragging should clamp the modal to the visible workspace.

Resizing:

- Resize should be available from an explicit handle.
- Resize should respect minimum dimensions.
- Resize should clamp maximum dimensions to the visible Obsidian window.
- Resize should not introduce scroll traps in the Settings content area.

Nested dialogs:

- Child dialogs, such as font selector dialogs, should remain centered or follow Obsidian's default behavior unless a later release intentionally supports positioning them.
- The plugin should avoid attaching handles to child dialogs.
- Theme and community plugin browser dialogs are explicitly supported exceptions because they block appearance/plugin browsing preview workflows.
- The plugin should preserve Escape, close buttons, focus management, and click-outside behavior.

## Accessibility Requirements

- Handles must have accessible labels if they are focusable or visible controls.
- The plugin must not make Settings unreachable by keyboard.
- The reset settings-tab action must clear saved geometry even if Settings is currently offscreen or partially clipped.
- Visual handles must have sufficient contrast across light and dark themes.

## Compatibility Requirements

- The plugin should target current Obsidian desktop releases and avoid mobile behavior in the first release unless testing proves it safe.
- The plugin should not rely on undocumented class names more than necessary.
- Any DOM selectors used to identify the Settings modal should be centralized and easy to update.
- The plugin should degrade gracefully if the Settings modal DOM shape changes.
- The plugin should use Obsidian CSS variables where possible.

## Success Metrics

- A user can change Appearance font settings while keeping at least part of the active note visible.
- A user can browse themes or community plugins while keeping at least part of the active workspace visible.
- A user can move and resize Settings without breaking Settings controls.
- A user can close and reopen Settings and see their preferred geometry restored.
- A user can recover from bad geometry using the plugin settings reset action.
- The plugin does not apply behavior to nested child dialogs in the motivating font-selection workflow.

## Acceptance Criteria

- AC1. Opening Settings with the plugin enabled shows a draggable affordance on the Settings modal.
- AC2. Dragging the affordance moves the Settings modal and does not trigger settings controls.
- AC3. Resizing from the resize handle changes modal dimensions and preserves usable Settings content.
- AC4. Closing and reopening Settings restores the last valid geometry when persistence is enabled.
- AC5. If the Obsidian window is resized, the Settings modal remains visible or is clamped back into view.
- AC6. The reset settings-tab action restores the default centered Settings layout on the next open and immediately recenters the current Settings modal if it is open.
- AC7. The plugin does not add center, dock-left, dock-right, reset, or toggle-movable command palette actions in version 0.1.
- AC8. Opening the Text font dialog from Appearance settings does not add drag/resize handles to that child dialog.
- AC8a. Opening the theme or community plugin browser adds drag/resize behavior to that browser dialog.
- AC9. Disabling the plugin removes its handles/classes and returns Settings behavior to normal after reopening Settings.
- AC10. Unloading the plugin removes event listeners and DOM additions without requiring an Obsidian restart.

## Release Scope

### Version 0.1

- Detect and enhance the core Settings modal.
- Detect and enhance theme and community plugin browser dialogs.
- Add drag handle.
- Add bottom-right resize handle.
- Persist and validate geometry.
- Add minimal plugin settings.
- Disable or no-op on mobile/narrow windows.
- Document limitations and recovery behavior.

### Later Versions

- Keyboard increment move/resize controls.
- Named geometry profiles for laptop and external monitor layouts.
- Optional child-dialog positioning.
- Optional visible preset buttons inside the Settings modal.
- Broader support for selected non-Settings modals if users ask for it.

## Risks and Open Questions

- Obsidian may change Settings modal DOM structure, requiring selector updates.
- Themes may style modals in ways that conflict with inserted handles.
- Nested modal behavior may vary across Settings sections and community plugin settings tabs.
- The plugin needs real manual testing inside Obsidian because DOM behavior is difficult to validate with unit tests alone.
- It is unclear whether the Settings modal should persist geometry globally or per vault; per vault is the safer first assumption.

## Source Ideation

This requirements document is based on the ideation artifact at `docs/ideation/2026-06-12-movable-resizable-obsidian-settings-ideation.html`.
