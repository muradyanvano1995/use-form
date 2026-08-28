# Releasing

This is a **manual** checklist. Do not run publish, tag, push, or deploy steps unless the owner explicitly authorizes them. This document does not grant that authorization.

## Package identity (pre-release)

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| Name       | `@muradyanvano/use-form`                      |
| Version    | `0.1.0-beta.1` (planned first beta)           |
| Repository | https://github.com/muradyanvano1995/use-form  |
| License    | MIT                                           |
| `private`  | **`true`** until the owner intends to publish |

## Blockers before first publish

1. Owner authorization to publish and to set `private: false`.
2. npm account access and 2FA for the `@muradyanvano` scope.
3. Confirm changelog and version for the beta tag.
4. CI green on `main` with `npm run verify:ci`.

Resolved locally (still requires publish authorization):

- Package name, repository, homepage, bugs, author, and MIT `LICENSE`.
- GitHub Actions CI at `.github/workflows/ci.yml`.

## Local checklist (authorized without publishing)

1. Inspect `CHANGELOG.md` `[Unreleased]` and the prepared `0.1.0-beta.1` section.
2. Run `npm run verify`.
3. Run `npm run build:lib`.
4. Run `npm pack --json` and note the tarball name (scoped packages produce names like `muradyanvano-use-form-0.1.0-beta.1.tgz`).
5. Run `npm run test:package` against the packed tarball in a temp directory.
6. Confirm size budgets still pass (`npm run size`).

## After the owner authorizes the beta publish

These steps are documented only. Do **not** execute them from an agent session unless the user explicitly asks to publish:

1. Set `"private": false` in `package.json` (owner decision).
2. Confirm npm authentication: `npm whoami`.
3. Publish the beta to the public registry:

   ```bash
   npm publish --access public --tag beta
   ```

4. Verify the package page lists the `beta` dist-tag and correct entry points.
5. Create a git tag and GitHub Release **only after** publish succeeds and the owner requests it.
6. Move `[Unreleased]` notes into the versioned changelog section with the publication date.

## Safety

- Keep `private: true` until the owner is ready.
- Do not store tokens in the repository.
- Do not upload coverage or Storybook without authorization.
- Do not claim the package is on npm until `npm publish` has completed successfully.
