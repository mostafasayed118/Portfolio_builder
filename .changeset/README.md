# Changesets

This project uses [Changesets](https://github.com/changesets/versions) to manage
versioning and changelog generation across the pnpm workspace.

## Workflow

1. When you make a change that should be released, run:

   ```bash
   pnpm changeset
   ```

   This prompts you for the packages affected and a semantic version bump, then
   creates a markdown file in `.changeset/`.

2. Merge the changeset along with your code.

3. To consume all pending changesets and produce version bumps + changelogs:

   ```bash
   pnpm changeset version
   ```

4. To publish (if this repo is ever published to a registry):

   ```bash
   pnpm changeset publish
   ```

> All packages are `"private": true` and unpublished, so Changesets is used here
> primarily for tracking release intent and generating changelogs. Set
> `"access": "restricted"` and configure `publishConfig` before publishing to npm.
