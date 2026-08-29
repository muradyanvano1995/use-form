# Releasing

This is a **manual** checklist. Do not run publish, tag, push, or deploy steps unless the owner explicitly authorizes them.

For the exact GitHub UI order (CI → Trusted Publishing → environment approval → npm verify → tag → Release → Storybook Pages), use **[github-release-workflow.md](github-release-workflow.md)**. This page keeps package identity and policy; avoid duplicating every click here.

## Package identity

| Field      | Value                                               |
| ---------- | --------------------------------------------------- |
| Name       | `@muradyanvano/use-form`                            |
| Homepage   | https://muradyanvano1995.github.io/use-form/        |
| Repository | https://github.com/muradyanvano1995/use-form        |
| Bugs       | https://github.com/muradyanvano1995/use-form/issues |
| License    | MIT                                                 |
| `private`  | **`false`** (public npm package)                    |

Install stable releases with `npm install @muradyanvano/use-form`. Install prereleases with `npm install @muradyanvano/use-form@beta`. See [CHANGELOG.md](../CHANGELOG.md) for released versions.

Public Storybook documentation: [https://muradyanvano1995.github.io/use-form/](https://muradyanvano1995.github.io/use-form/).

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
| Stable       | `0.1.1`        | `latest`     |

The workflow rejects prereleases sent to `latest` and stable versions sent to `beta`.

## Storybook deployment

- Workflow: `.github/workflows/deploy-storybook.yml` (filename must not change).
- A **stable** GitHub Release (`prerelease: false`) builds Storybook from the exact release tag and deploys to GitHub Pages.
- Prerelease GitHub Releases do **not** update the public documentation site.
- Manual `workflow_dispatch` can deploy a specific tag or commit via the `ref` input.
- Output directory: `storybook-static` (gitignored; not committed).
- For a stable release, public Storybook must be deployed from the exact stable Git tag — not from an arbitrary unverified working tree.
- After a stable GitHub Release is published, verify that Deploy Storybook ran for the matching tag and that https://muradyanvano1995.github.io/use-form/ remains healthy (`index.html`, `index.json`, and manager JS assets load).

Optional production smoke after deploy (manual or future CI): retry briefly for Pages propagation, then confirm HTTP 200 for `/`, `/index.json`, and at least one `sb-manager` asset. Do not duplicate the full Storybook browser suite against production.

## Local checklist (authorized without publishing)

1. Read `package.json` as the canonical version.
2. Inspect npm read-only: `npm view @muradyanvano/use-form versions --json` and `dist-tags --json`.
3. Confirm whether `homepage`, repository, bugs, README links, and Storybook URL need updates for this release.
4. Update [CHANGELOG.md](../CHANGELOG.md) with the target version.
5. Run `npm run release:check`.
6. Run `npm ci` from a clean tree.
7. Run `npm run verify:ci`.
8. Run `npm pack --json` and inspect the tarball (scoped packages produce names like `muradyanvano-use-form-0.1.1.tgz`).
9. Run `npm run test:package`, `npm run test:ssr`, and `npm run test:exports` against the packed tarball.
10. Confirm size budgets (`npm run size`).
11. Run `npm publish --dry-run --access public --tag latest` (or `--tag beta` for prereleases).

## After the owner authorizes publish

These steps are documented only. Do **not** execute them from an agent session unless the user explicitly asks to publish. Follow the detailed UI sequence in [github-release-workflow.md](github-release-workflow.md):

1. Ensure CI is green on `main` and the working tree is clean.
2. Confirm the target version is **not** already on npm.
3. Trigger **Publish npm package** (`publish.yml`) with matching `version` and `channel`; approve `npm-publish`.
4. Verify with `npm view` and a fresh `npm install` (see the GitHub guide).
5. Create the matching Git tag and GitHub Release **only after** npm publish succeeds.
6. For stable releases, confirm Deploy Storybook runs from the release tag and the public Storybook URL stays healthy.
7. Optionally update the GitHub repository **About → Website** to https://muradyanvano1995.github.io/use-form/.

## Safety

- Do not store tokens in the repository.
- Do not hardcode dist-tags in `package.json`; the workflow selects the channel.
- Do not upload coverage or Storybook without authorization.
- Do not claim a version is on npm until `npm publish` has completed successfully.
- Never publish from a dirty tree or before CI succeeds.

See also [docs/stable-release-audit.md](stable-release-audit.md) for the 0.1.0 preparation audit.
