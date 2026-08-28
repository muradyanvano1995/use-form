# Releasing

This is a **manual** checklist. Do not run publish, tag, push, or deploy steps unless the owner explicitly authorizes them.

## Package identity

| Field      | Value                                        |
| ---------- | -------------------------------------------- |
| Name       | `@muradyanvano/use-form`                     |
| Repository | https://github.com/muradyanvano1995/use-form |
| License    | MIT                                          |
| `private`  | **`false`** (public npm package)             |

Install stable releases with `npm install @muradyanvano/use-form`. Install prereleases with `npm install @muradyanvano/use-form@beta`. See [CHANGELOG.md](../CHANGELOG.md) for released versions.

## Publishing model

- **Trusted Publishing** via GitHub OIDC — no `NPM_TOKEN` in the repository.
- Workflow file: `.github/workflows/publish.yml` (filename must not change; npm Trusted Publishing is bound to it).
- Manual trigger only (`workflow_dispatch`) with required inputs:
  - `version` — exact SemVer in `package.json`
  - `channel` — `beta` for prereleases, `latest` for stable releases
- Protected environment: `npm-publish` (approval required before publish).
- PRs and pushes to `main` do **not** publish automatically.

### Channel rules

| Version kind | Example        | npm dist-tag |
| ------------ | -------------- | ------------ |
| Prerelease   | `0.1.0-beta.3` | `beta`       |
| Stable       | `0.1.0`        | `latest`     |

The workflow rejects prereleases sent to `latest` and stable versions sent to `beta`.

## Local checklist (authorized without publishing)

1. Read `package.json` as the canonical version.
2. Inspect npm read-only: `npm view @muradyanvano/use-form versions --json` and `dist-tags --json`.
3. Update [CHANGELOG.md](../CHANGELOG.md) with the target version (do not claim publication until it succeeds).
4. Run `npm run release:check`.
5. Run `npm ci` from a clean tree.
6. Run `npm run verify:ci`.
7. Run `npm pack --json` and inspect the tarball (scoped packages produce names like `muradyanvano-use-form-0.1.0.tgz`).
8. Run `npm run test:package`, `npm run test:ssr`, and `npm run test:exports` against the packed tarball.
9. Confirm size budgets (`npm run size`).
10. Run `npm publish --dry-run --access public --tag latest` (or `--tag beta` for prereleases).

## After the owner authorizes publish

These steps are documented only. Do **not** execute them from an agent session unless the user explicitly asks to publish:

1. Ensure CI is green on `main` and the working tree is clean.
2. Confirm the target version is **not** already on npm.
3. Trigger `.github/workflows/publish.yml` with matching `version` and `channel`.
4. After publish succeeds, verify:

   ```bash
   npm view @muradyanvano/use-form version
   npm view @muradyanvano/use-form dist-tags
   npm view @muradyanvano/use-form@<version>
   ```

5. Install from npm in a fresh project: `npm install @muradyanvano/use-form`.
6. Create the matching Git tag and GitHub Release **only after** npm publish succeeds and the owner requests it.

## Safety

- Do not store tokens in the repository.
- Do not hardcode dist-tags in `package.json`; the workflow selects the channel.
- Do not upload coverage or Storybook without authorization.
- Do not claim a version is on npm until `npm publish` has completed successfully.
- Never publish from a dirty tree or before CI succeeds.

See also [docs/stable-release-audit.md](stable-release-audit.md) for the 0.1.0 preparation audit.
