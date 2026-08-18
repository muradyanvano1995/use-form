# Releasing

This is a **manual** checklist. Do not run publish, tag, push, or deploy steps unless the owner explicitly authorizes them. This document does not grant that authorization.

## Blockers that must be resolved first

1. Choose/confirm the public npm package name and scope.
2. Choose/confirm a license and add `LICENSE` plus a `package.json` `license` field.
3. Confirm repository, homepage, bugs, and author metadata.
4. Confirm a CI provider and wire `npm run verify` there.
5. Set `private` to `false` only when publication is actually intended.

The current workspace name `react-hooks` is generic and is **not** a publishing decision.

## Local checklist (authorized without publishing)

1. Inspect `CHANGELOG.md` `[Unreleased]`.
2. Determine the semantic version (there is no published baseline yet).
3. Run `npm run verify`.
4. Run `npm run build:lib`.
5. Run `npm pack --dry-run` and inspect the file list.
6. Run `npm run test:package` against a packed tarball in a temp directory.
7. Confirm size budgets still pass.

## After the owner authorizes a public release

These steps are documented only. Do **not** execute them from an agent session unless the user explicitly asks to publish:

8. Confirm npm authentication and 2FA.
9. Publish with provenance where supported.
10. Tag and create a GitHub/GitLab release only after publish succeeds.
11. Move `[Unreleased]` notes into a versioned changelog section.

## Safety

- Keep `private: true` until the owner is ready.
- Do not store tokens in the repository.
- Do not upload coverage or Storybook without authorization.
