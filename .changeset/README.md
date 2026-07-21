# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

When a PR changes published behavior or release tooling, run `bun run changeset` and commit the
generated file. On merge to `main`, the release workflow opens or updates a `chore: release` PR
that bumps `package.json`, `manifest.json`, `versions.json`, and `CHANGELOG.md`. Merging that PR
builds the plugin and creates a GitHub release with the Obsidian plugin artifacts.
