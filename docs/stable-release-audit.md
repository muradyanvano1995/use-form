# Stable release audit — 0.1.0 preparation

> **Status:** Local stable release candidate prepared. **0.1.0 is not published to npm.** No git tags, GitHub Releases, or registry dist-tag changes were made during this audit.

## Baseline

| Item            | Value                                      |
| --------------- | ------------------------------------------ |
| Starting commit | `aa41892073efd3381d471edcf15fa132a19eb605` |
| OS              | Windows_NT (Windows 10.0.26200)            |
| Node            | v24.5.0                                    |
| npm             | 11.8.0                                     |
| Working tree    | clean at baseline                          |

### Baseline verification (pre-change)

| Command                  | Result           |
| ------------------------ | ---------------- |
| `npm ci`                 | OK               |
| `npm run lockfile:check` | OK               |
| `npm run verify`         | See final report |
| `npm run verify:ci`      | See final report |

### Initial npm registry (read-only)

| Field      | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Versions   | `0.1.0-beta.1`, `0.1.0-beta.2`                         |
| `beta` tag | `0.1.0-beta.2`                                         |
| `latest`   | `0.1.0-beta.1`                                         |
| Repository | `git+https://github.com/muradyanvano1995/use-form.git` |

## Target release

| Field     | Value                                                                                     |
| --------- | ----------------------------------------------------------------------------------------- |
| Version   | `0.1.0`                                                                                   |
| Channel   | `latest` (after owner publish)                                                            |
| Rationale | First stable-channel release; direct successor to `0.1.0-beta.2` without jumping to 1.0.0 |

## Stale reference inventory

### Active documentation corrected

| Location                                                              | Stale statement                                             | Correction                                       |
| --------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `README.md`                                                           | Planned name, not published, private, install after publish | Published install paths for stable and `@beta`   |
| `docs/releasing.md`                                                   | Pre-release blockers, private true, beta-only workflow      | Trusted Publishing, channel rules, release:check |
| `docs/public-api.md`                                                  | Planned / not published                                     | Published package wording                        |
| `docs/migration.md`                                                   | No published release                                        | 0.x policy with npm install guidance             |
| `docs/package-roadmap.md`                                             | Not published, private, blockers                            | Published betas; stable prepared locally         |
| `docs/ci.md`                                                          | Publish blockers                                            | release:check + Trusted Publishing               |
| `AGENTS.md`                                                           | Planned npm name                                            | Published package name                           |
| `.ai/skills/package-release.md`                                       | private true, planned identity                              | Every version release checklist                  |
| Storybook Introduction / Getting Started / Limitations / API Overview | Not on npm, private, planned name                           | Real install paths and published identity        |
| `.github/workflows/publish.yml`                                       | Beta-only publish                                           | version + channel inputs, stable/beta validation |
| `package.json` `publishConfig.tag`                                    | Hardcoded `beta`                                            | Removed; workflow selects channel                |

### Historical references preserved

| Location                                            | Classification                                 |
| --------------------------------------------------- | ---------------------------------------------- |
| `docs/package-identity-migration.md`                | Historical audit (2026-08-28) — labeled at top |
| `docs/production-readiness-audit.md`                | Historical audit — labeled at top              |
| `docs/package-roadmap.md` progress log (2026-08-18) | Valid dated historical note                    |
| `CHANGELOG.md` beta sections                        | Published beta history                         |
| `CHANGELOG.md` `[0.1.0]`                            | Prepared entry — explicitly not published      |

### Intentionally unchanged

| Location                                           | Reason                            |
| -------------------------------------------------- | --------------------------------- |
| `eslint-plugin-react-hooks` in lockfile            | Unrelated npm dependency name     |
| `react-hooks/exhaustive-deps` eslint disables      | ESLint rule namespace             |
| `scripts/test-package.mjs` `private: true` fixture | Test fixture for consumer project |

## Release tooling added

- `scripts/check-release-consistency.mjs` — read-only package/docs/changelog checks
- `scripts/check-release-consistency.test.mjs` — focused parser tests
- `npm run release:check` — wired into `verify` (before and after `build:lib`)
- CI job step for `release:check`

## Owner handoff (after commit, push, green CI)

1. Trigger `.github/workflows/publish.yml` manually:
   - `version`: `0.1.0`
   - `channel`: `latest`
2. Approve the `npm-publish` environment when prompted.
3. Verify registry:

   ```bash
   npm view @muradyanvano/use-form version
   npm view @muradyanvano/use-form dist-tags
   npm view @muradyanvano/use-form@0.1.0
   npm install @muradyanvano/use-form
   ```

4. Expected dist-tags after publish: `latest` → `0.1.0`, `beta` → `0.1.0-beta.2`.
5. Only after npm succeeds:

   ```bash
   git tag -a v0.1.0 -m "Release v0.1.0"
   git push origin v0.1.0
   ```

6. Create a normal GitHub Release (not a prerelease).

## Safety confirmation

- No `npm publish` executed
- No npm dist-tag mutations
- No git tags or GitHub Releases created
- No Storybook deployment
- No commits pushed without owner authorization
- No `NPM_TOKEN` or npm credentials added
