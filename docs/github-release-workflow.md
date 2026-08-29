# GitHub build, release and Storybook workflow

Maintainer manual for GitHub Actions, npm Trusted Publishing, Git tags, GitHub Releases, and Storybook on GitHub Pages.

This guide complements (does not replace):

- [development-workflow.md](development-workflow.md) — day-to-day change verification
- [releasing.md](releasing.md) — package identity and release policy summary
- [`.ai/skills/package-release.md`](../.ai/skills/package-release.md) — agent packaging checklist
- [`.ai/skills/change-workflow.md`](../.ai/skills/change-workflow.md) — post-change verification levels

Focus here: **exact release order** and **GitHub UI / operational steps**.

## Release-flow overview

1. Prepare version locally
2. Run local verification
3. Commit
4. Push to `main` (explicit authorization)
5. Wait for GitHub CI
6. Publish the npm package through GitHub Actions
7. Approve the `npm-publish` environment
8. Verify npm publication
9. Create the Git tag
10. Create the GitHub Release
11. Deploy Storybook automatically (stable releases only)
12. Verify GitHub Pages

Hard rules:

- **npm publication happens before** creating the Git tag and GitHub Release.
- **Storybook deployment happens after** a stable GitHub Release.
- **Prerelease** GitHub Releases do **not** update stable Storybook.
- **Never** republish the same npm version.
- **Never** create a stable GitHub Release before npm publication succeeds.

| Resource   | URL                                                  |
| ---------- | ---------------------------------------------------- |
| Repository | https://github.com/muradyanvano1995/use-form         |
| npm        | https://www.npmjs.com/package/@muradyanvano/use-form |
| Storybook  | https://muradyanvano1995.github.io/use-form/         |

## 1. Required GitHub configuration

### Workflows

| File                                     | Role                                               |
| ---------------------------------------- | -------------------------------------------------- |
| `.github/workflows/ci.yml`               | Push/PR verification (including browser Storybook) |
| `.github/workflows/publish.yml`          | Manual Trusted Publishing to npm                   |
| `.github/workflows/deploy-storybook.yml` | Stable release → GitHub Pages Storybook            |

### Environments

Navigate: **Repository → Settings → Environments**.

#### `npm-publish`

- Used by `publish.yml` publish job (`environment: npm-publish`).
- Protected approval before npm publication.
- **No npm token** in the repository — OIDC Trusted Publishing.
- Allow branch `main` when configuring deployment branches.
- Required reviewer when environment protection is configured.

#### `github-pages`

- Used by `deploy-storybook.yml` deploy job (`environment: github-pages`).
- Needs GitHub Pages permissions (`pages: write`, `id-token: write` on the deploy job).
- **No custom deployment secret.**
- Allowed sources must include branch `main` and release tags matching `v*`.

Configure tag allowance:

1. Open **github-pages**.
2. Find **Deployment branches and tags**.
3. Select **Selected branches and tags**.
4. Add branch rule: `main`.
5. Add tag rule: `v*`.
6. Save protection rules.

Without `v*`, a release-tag deployment fails with:

> Tag vX.Y.Z is not allowed to deploy to github-pages due to environment protection rules.

## 2. npm Trusted Publisher configuration

Package: `@muradyanvano/use-form`  
Provider: **GitHub Actions**

| Field                    | Value              |
| ------------------------ | ------------------ |
| GitHub organization/user | `muradyanvano1995` |
| Repository               | `use-form`         |
| Workflow filename        | `publish.yml`      |
| Environment              | `npm-publish`      |
| Allowed action           | `npm publish`      |

Notes:

- Use only `publish.yml` in the npm Trusted Publisher UI — **not** `.github/workflows/publish.yml`.
- Values are case-sensitive.
- Package `repository` metadata must match this GitHub repo.
- GitHub-hosted runners are required (this repo uses `ubuntu-latest`).
- Publish job must have `id-token: write` (already set in `publish.yml`).
- No `NPM_TOKEN` is needed; provenance comes from Trusted Publishing.
- Never commit npm authentication secrets, OTPs, or credentials.

## 3. Prepare a version locally

Bump with `--no-git-tag-version` so tags are not created before npm succeeds:

```bash
npm version patch --no-git-tag-version
npm version minor --no-git-tag-version
npm version 0.2.0 --no-git-tag-version
npm version prerelease --preid=beta --no-git-tag-version
```

Effects:

- Updates `package.json` and `package-lock.json`.
- Does **not** create a Git tag.
- Update `CHANGELOG.md` for the target version.
- Update migration docs for breaking consumer-facing changes.
- Confirm the version does **not** already exist on npm.

Read-only checks:

```bash
npm view @muradyanvano/use-form versions --json
npm view @muradyanvano/use-form dist-tags --json
```

Channel mapping:

| Version kind | Example          | Channel  |
| ------------ | ---------------- | -------- |
| Stable       | `0.1.2`, `0.2.0` | `latest` |
| Prerelease   | `0.2.0-beta.1`   | `beta`   |

## 4. Local release verification

```bash
npm ci
npm run lockfile:check
npm run release:check
npm run verify
npm run verify:ci
npm publish --dry-run --access public --tag latest
```

For beta:

```bash
npm publish --dry-run --access public --tag beta
```

- Dry run is allowed locally; **real publish must go through GitHub**.
- Inspect the tarball: no `.ai`, `.github`, tests, Storybook source, coverage, or credentials.
- Working tree should contain only intentional release changes.

## 5. Commit and push

```bash
git status
git diff --check
git diff --stat
git diff
```

Then (only with explicit authorization to push):

```bash
git add .
git commit -m "chore: prepare vX.Y.Z"
git push origin main
```

At this stage:

- Do **not** force-push `main`.
- Do **not** create the Git tag yet.
- Do **not** create the GitHub Release yet.
- npm publication has **not** occurred.

## 6. Verify GitHub CI

1. Open the repository.
2. Click **Actions**.
3. Select the **CI** workflow (`.github/workflows/ci.yml`).
4. Open the run for the release-preparation commit.
5. Confirm all Node-version matrix jobs pass.
6. Confirm package, SSR, exports, Storybook build/mirrors, browser play, accessibility, visual smoke, and size-related steps pass.
7. Do **not** publish while required CI is red or pending.

Rerun failed jobs: **Actions → Workflow run → Re-run jobs → Re-run failed jobs**. Investigate root cause before repeating reruns.

## 7. Publish through GitHub

1. Open the repository.
2. Click **Actions**.
3. Select **Publish npm package**.
4. Click **Run workflow**.
5. Select branch **main**.
6. Enter the exact package version (must match `package.json`).
7. Select the channel (`latest` or `beta`).
8. Click **Run workflow**.
9. Wait for the **Verify** job (`verify:ci`).
10. Review the **Publish to npm** job.
11. Approve **npm-publish** when requested (see §8).

Examples:

| Input   | Stable   | Beta           |
| ------- | -------- | -------------- |
| version | `0.1.2`  | `0.2.0-beta.1` |
| channel | `latest` | `beta`         |

The workflow rejects: version mismatch, malformed SemVer, already-published version, beta→`latest`, stable→`beta`, `private: true`, wrong package name, failed verification, or failed pack audit.

## 8. Approve the npm environment

1. Open the waiting workflow run.
2. Click **Review deployments**.
3. Select **npm-publish**.
4. Review version and channel.
5. Click **Approve and deploy**.

Before approval confirm: correct commit, version, channel, green CI, version unpublished on npm, CHANGELOG correct.

Approval is the final human safety gate before registry write.

## 9. Verify npm publication

```bash
npm view @muradyanvano/use-form version
npm view @muradyanvano/use-form dist-tags
npm view @muradyanvano/use-form@X.Y.Z
npm view @muradyanvano/use-form description
npm view @muradyanvano/use-form keywords --json
```

Fresh install:

```bash
mkdir /tmp/use-form-smoke && cd /tmp/use-form-smoke
npm init -y
npm install @muradyanvano/use-form
npm list @muradyanvano/use-form
```

Beta: `npm install @muradyanvano/use-form@beta`.

Confirm public imports resolve for core, `@muradyanvano/use-form/devtools`, and `@muradyanvano/use-form/resolvers/standard-schema`.

If npm succeeded but later GitHub steps fail: **do not republish**. Continue from tag/release.

## 10. Create the Git tag

Only after npm succeeds:

```bash
git checkout main
git pull
git status
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

- Tag must point at the **exact commit** published to npm.
- Do not move or silently recreate published release tags.
- Do not tag before npm publication.
- Stable and beta tags use the same `vX.Y.Z` / `vX.Y.Z-beta.N` convention matching the package version.

## 11. Create GitHub Release

1. Open the repository.
2. Open **Releases**.
3. Click **Draft a new release**.
4. Select the matching tag.
5. Set title to `vX.Y.Z`.
6. Paste consumer-facing CHANGELOG notes.
7. Stable: do **not** mark prerelease; mark as latest where appropriate.
8. Beta: mark as **prerelease**; do **not** mark as latest.
9. Publish the GitHub Release.

Notes:

- Stable release triggers Storybook deployment (`deploy-storybook.yml`, skips when `prerelease: true`).
- Beta/prerelease must not replace stable Storybook.
- npm is the canonical package download source; attaching the tarball manually is normally unnecessary.

## 12. Storybook deployment (automatic stable flow)

1. Stable GitHub Release is published.
2. **Deploy Storybook** starts.
3. Workflow checks out the exact Git tag.
4. Storybook builds (`npm run build:storybook`).
5. `storybook-static` is uploaded as a Pages artifact.
6. Deploy job uses environment `github-pages`.
7. Public docs update at https://muradyanvano1995.github.io/use-form/

Verify: root page, `index.html`, `index.json`, JS/CSS assets, Introduction, Getting Started, API Reference, representative examples, direct story URLs, mobile layout, console, npm/GitHub links. Allow several minutes for Pages propagation.

## 13. Manual Storybook deployment

Appropriate for: initial Pages setup, retry after environment configuration, restore an already-published stable tag, or workflow correction.

1. **Actions** → **Deploy Storybook** → **Run workflow**.
2. Enter the exact stable tag (for example `v0.1.2`).
3. Run; approve **github-pages** if required.

Do **not** manually deploy arbitrary unverified branches, prerelease tags to stable docs, or dirty local builds.

## 14. Deployment failure recovery

| Failure                                     | Resolution                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Tag not allowed to deploy to `github-pages` | Settings → Environments → `github-pages` → Selected branches and tags → add `v*` → save → rerun job  |
| Deployment rejected by protection rules     | Check allowed tag, required reviewer, environment name `github-pages`, then approve                  |
| Storybook build fails                       | Reproduce with `npm run build:storybook`; fix; commit/push; do not move published tags casually      |
| Pages returns 404                           | Confirm Pages source is GitHub Actions; workflow succeeded; artifact uploaded; wait; check URL       |
| Old content appears                         | Confirm expected tag was deployed; wait; hard refresh; inspect deployment; do not bump npm for cache |

## 15. npm failure recovery

| Situation                                      | Action                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Version already exists                         | Do not overwrite; prepare a **new** version                                                                                                      |
| Trusted Publishing auth fails                  | Check publisher config, `publish.yml` name, owner/repo, `npm-publish`, `id-token: write`, hosted runner; avoid long-lived tokens as first resort |
| Publish succeeded but workflow reporting broke | Confirm with `npm view`; **do not republish**; proceed to tag/release                                                                            |
| Publish failed before registry creation        | Diagnose, fix, rerun workflow after CI; **do not** create tag/release yet                                                                        |

## 16. Release checklist

### Before push

- [ ] Version updated
- [ ] Lockfile synchronized
- [ ] CHANGELOG updated
- [ ] Documentation updated
- [ ] Skills updated if affected
- [ ] `release:check` passed
- [ ] `verify` passed
- [ ] `verify:ci` passed
- [ ] Pack audit passed
- [ ] Publish dry run passed
- [ ] Git status reviewed

### After push

- [ ] GitHub CI passed
- [ ] Correct version/channel selected
- [ ] `npm-publish` approved
- [ ] npm publication verified
- [ ] Fresh registry installation tested
- [ ] Git tag created
- [ ] GitHub Release created
- [ ] Storybook deployment passed (stable)
- [ ] Public Storybook verified (stable)
- [ ] npm dist-tags verified
- [ ] GitHub About/version links remain correct
