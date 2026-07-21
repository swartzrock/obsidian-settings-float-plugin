# Settings Float

[![Obsidian](https://img.shields.io/badge/Obsidian-1.6.0%2B-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md)
[![Platform](https://img.shields.io/badge/platform-desktop-4B5563)](#compatibility-notes)
[![Language](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Package manager](https://img.shields.io/badge/package_manager-bun_1.3.14-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![CI](https://github.com/swartzrock/obsidian-settings-float-plugin/actions/workflows/main.yml/badge.svg)](https://github.com/swartzrock/obsidian-settings-float-plugin/actions/workflows/main.yml)
[![GitHub release](https://img.shields.io/github/v/release/swartzrock/obsidian-settings-float-plugin?include_prereleases&label=release)](https://github.com/swartzrock/obsidian-settings-float-plugin/releases)
[![GitHub release date](https://img.shields.io/github/release-date/swartzrock/obsidian-settings-float-plugin)](https://github.com/swartzrock/obsidian-settings-float-plugin/releases)
[![Last commit](https://img.shields.io/github/last-commit/swartzrock/obsidian-settings-float-plugin)](https://github.com/swartzrock/obsidian-settings-float-plugin/commits/main)
[![Issues](https://img.shields.io/github/issues/swartzrock/obsidian-settings-float-plugin)](https://github.com/swartzrock/obsidian-settings-float-plugin/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Settings Float is an Obsidian desktop plugin that makes the core Settings modal and supported catalog dialogs movable and resizable. It is built for appearance-tuning workflows where you want Settings, theme browsing, or plugin browsing open while still seeing the note or workspace behind it.

## Demo

<video controls width="100%" src="https://github.com/user-attachments/assets/844d1333-963a-4454-9825-0eae6d5b51c3">
  <a href="https://github.com/user-attachments/assets/844d1333-963a-4454-9825-0eae6d5b51c3">Watch the demo video</a>
</video>

## Table of Contents

- [Installation](#installation)
- [Workflow](#workflow)
- [Settings](#settings)
- [Recovery](#recovery)
- [Development](#development)
- [Compatibility Notes](#compatibility-notes)
- [License](#license)

## Installation

Settings Float is not listed in Obsidian's community plugin catalog yet. Install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat), from a GitHub release, or from a local build.

### Install with BRAT

BRAT is the easiest way to try unreleased Obsidian plugins and keep them updated from GitHub.

1. In Obsidian, install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Community plugins.
2. Open BRAT settings and choose `Add Beta plugin`.
3. Paste this repository URL:

   ```text
   https://github.com/swartzrock/obsidian-settings-float-plugin
   ```

4. Choose `Add Plugin`, then enable `Settings Float` from Obsidian's Community plugins list.

### Install Manually from a Release

1. Download the latest release from [GitHub Releases](https://github.com/swartzrock/obsidian-settings-float-plugin/releases).
2. In your vault, create this folder if it does not already exist:

   ```text
   .obsidian/plugins/settings-float/
   ```

3. Copy these release files into that folder:

   ```text
   manifest.json
   main.js
   styles.css
   ```

4. Restart Obsidian or reload the app.
5. Enable `Settings Float` from `Settings -> Community plugins -> Installed plugins`.

### Install from a Local Build

Use this path when testing changes from source.

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/swartzrock/obsidian-settings-float-plugin.git
   cd obsidian-settings-float-plugin
   bun install
   ```

2. Build the plugin:

   ```bash
   bun run build
   ```

3. Copy `manifest.json`, `main.js`, and `styles.css` into your vault's `.obsidian/plugins/settings-float/` folder.
4. Reload Obsidian and enable the plugin.

## Workflow

Open Obsidian Settings, move the modal by dragging empty space inside the dialog, then resize from the bottom-right corner. Theme and community plugin browser dialogs can also be moved and resized, which makes it easier to preview themes or inspect plugins without covering the whole workspace.

The plugin enhances the main Settings modal plus Obsidian's theme and community plugin browser dialogs. Other nested dialogs, such as font pickers, are left to Obsidian's default behavior.

## Settings

- `Enable movable dialogs`: lets empty dialog space move supported dialogs.
- `Enable resizable dialogs`: shows the bottom-right resize corner on supported dialogs.
- `Remember window geometry`: restores the last valid position and size in this vault.
- `Disable on narrow windows`: keeps behavior conservative on cramped desktop windows.
- `Disable on mobile`: leaves mobile as a no-op for this release.
- `Reset saved geometry`: clears the persisted position and size.

## Recovery

If Settings ends up in an awkward position, use the reset button in the plugin settings tab. Saved geometry is validated and clamped to the visible Obsidian window before it is applied.

## Development

1. Install dependencies with `bun install`.
2. Run `bun run dev` for watch mode or `bun run build` for a production bundle.
3. Use `bun run typecheck`, `bun run lint`, and `bun run test` before packaging.
4. Run `bun run changeset` for releasable changes and commit the generated changeset file.
5. Merging the generated release PR publishes `manifest.json`, `main.js`, `styles.css`, and `settings-float-<version>.zip` to a GitHub release.

## Compatibility Notes

- Desktop is the intended target; mobile behavior is disabled.
- The plugin relies on Obsidian's current Settings and catalog dialog DOM shapes. Selectors are centralized so they can be updated if Obsidian changes those structures.
- Custom themes may affect modal spacing, shadows, or scrollbar placement. The plugin uses isolated classes and Obsidian CSS variables where possible.
- Manual validation in Obsidian is still required before publishing a release.

## License

Settings Float is released under the [MIT License](LICENSE).
