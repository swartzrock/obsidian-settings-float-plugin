# Changelog

## 0.2.3

### Patch Changes

- 386252b: cleaned up release assets

## 0.2.2

### Patch Changes

- 98aa8cf: Add Changesets-managed version PRs and automatic GitHub releases.
- 73a2264: Fixed the color-picker selection bug

Changes to the Settings Float plugin for Obsidian.

# [0.2.0](https://github.com/swartzrock/obsidian-settings-float-plugin/releases/tag/0.2.0)

Maintenance release for Obsidian community plugin submission feedback and release workflow cleanup.

## Fixed

- Uses Obsidian's `setCssStyles` helper for dynamic modal styles instead of assigning inline style properties directly.
- Uses Obsidian's `Setting(...).setHeading()` pattern for the plugin settings heading.
- Removes an unsafe iterator return in the open-enhancer lookup.
- Keeps numeric release tags aligned with `manifest.json` and `versions.json` instead of requiring a `v` prefix.
- Makes the narrow-window setting actually disable modal enhancement below the configured threshold.
- Corrects package repository, issues, and homepage metadata to the published repository URL.
- Uses Obsidian theme variables and focus-visible outlines for plugin controls.

## Changed

- Updates the plugin description to explicitly mention Settings, Theme, and Community Plugins dialogs.
- Adds test coverage support for Obsidian DOM helper methods in the JSDOM test environment.

## Compatibility

- Desktop-only release.
- Minimum Obsidian app version remains `1.6.0`.
- `versions.json` maps `0.2.0` to `1.6.0`.

## Release Artifacts

- `manifest.json`
- `main.js`
- `styles.css`

# [0.1.0](https://github.com/swartzrock/obsidian-settings-float-plugin/releases/tag/0.1.0)

Initial desktop release for moving and resizing the core Obsidian Settings modal.

## Added

- Detects and enhances only the main Obsidian Settings modal.
- Detects and enhances Obsidian's theme and community plugin browser dialogs.
- Moves Settings by dragging non-interactive empty space inside the dialog.
- Resizes Settings from a bottom-right corner grip.
- Persists valid Settings geometry per vault and restores it on reopen.
- Clamps geometry to the visible Obsidian window on open, resize, and host-window resize.
- Adds a plugin settings tab for movement, resizing, persistence, narrow-window, mobile, and reset controls.
- Leaves nested child dialogs, such as font pickers, untouched.

## Compatibility

- Desktop-only release.
- Mobile behavior is disabled.
- Settings modal selectors are centralized for future Obsidian DOM changes.
- Theme compatibility uses isolated CSS classes and Obsidian CSS variables, but custom themes still need manual validation.

## Release Artifacts

- `manifest.json`
- `main.js`
- `styles.css`
