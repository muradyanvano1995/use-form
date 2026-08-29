# Development workflow

Canonical post-change process for human contributors and AI coding agents in `@muradyanvano/use-form`.

Use risk-based verification: run targeted checks while iterating; run `npm run verify` before committing meaningful code; run `npm run verify:ci` before merge of high-risk changes, releases, or package publication. CI still gates every push/PR.

Related guides:

- Agent routing: [`.ai/README.md`](../.ai/README.md)
- Operational skill: [`.ai/skills/change-workflow.md`](../.ai/skills/change-workflow.md)
- Publishing details: [releasing.md](releasing.md)
- GitHub release UI / order: [github-release-workflow.md](github-release-workflow.md)
- CI matrix: [ci.md](ci.md)
- Storybook contributor rules: [storybook.md](storybook.md)
- Migration policy: [migration.md](migration.md)

## 1. Before making a change

1. Understand the requested scope and stop conditions (especially publish/push/tag/deploy).
2. Read [`AGENTS.md`](../AGENTS.md).
3. Read [`.ai/README.md`](../.ai/README.md) and open every skill routed for the task.
4. Confirm branch and working tree:

   ```bash
   git status
   git branch --show-current
   git diff
   git log -1 --oneline
   ```

5. Preserve unrelated uncommitted work. Do **not** automatically `reset`, `clean`, or discard changes.
6. Fetch/pull only when appropriate and authorized.
7. Identify affected public APIs, tests, docs, Storybook pages, and package entry points.
8. Establish a baseline for the affected area (targeted tests or the relevant verification level).
9. Never begin destructive cleanup from an ambiguous directory.
10. Never expose credentials, tokens, or environment secrets.

## 2. While implementing

1. Keep the change within scope.
2. Add or update tests with behavior changes.
3. Add `*.type-test.ts` coverage for type-level behavior (compiled by `npm run typecheck`).
4. Preserve backward compatibility unless a breaking change is explicitly approved.
5. Avoid editing generated outputs (`dist/`, `dist-app/`, `storybook-static/`, `api-docs/`, coverage).
6. Avoid package self-imports inside internal source unless justified.
7. Keep public/package boundaries clear (`src/lib`, `src/devtools`, `src/resolvers/standard-schema`).
8. Update docs and Storybook with the behavior change—not after they go stale.
9. Update affected `.ai` skills when conventions or architecture change.
10. Avoid unrelated formatting or drive-by refactors.
11. Run Level 1 (targeted) checks during development.
12. Preserve accessibility, SSR/browser-import safety, subscription isolation, and entry-point separation.

Tests should validate observable behavior, not private implementation details.

## 3. Change classification

| Category                    | Targeted checks                                                           | Docs / Storybook / skills                                    | Package / SSR / exports                                   | Browser / visual                                                 | Size                        | Migration / SemVer                |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------- | --------------------------------- |
| Documentation-only          | `format:check`, link review                                               | Update affected docs; skill only if instructions stale       | No                                                        | No locally; CI after push                                        | No                          | No                                |
| Storybook docs/story-only   | `build:storybook`, `test:storybook`; browser for interactive/a11y stories | Update story copy; `docs/storybook.md` if conventions change | No                                                        | Prefer `test:storybook-browser` / visual for interactive stories | No                          | No                                |
| Internal source refactor    | Focused Vitest + `typecheck` + `lint`                                     | Skill if architecture notes change                           | Only if build graph may change                            | No                                                               | If graph may change: `size` | No unless behavior leaks          |
| Runtime behavior            | Module tests + coverage themes                                            | Guides + examples as needed                                  | Yes if consumer-visible                                   | If UI/a11y paths change                                          | Yes                         | Assess changelog                  |
| Validation behavior         | Rule/pipeline/dependency/async tests + type tests                         | Validation docs + Storybook                                  | Yes if public contracts change                            | If demos change                                                  | Yes                         | Assess changelog / migration      |
| Public API or exported type | Type tests + runtime tests                                                | `docs/public-api.md`, README, Storybook API                  | **Required** (`test:package`, `test:ssr`, `test:exports`) | Storybook + browser for usage                                    | **Required**                | **Required** (migration + SemVer) |
| DevTools                    | Component/redaction/serializer tests                                      | DevTools docs + Storybook                                    | DevTools entry package test                               | Browser + a11y                                                   | **Required**                | Assess if API surface changes     |
| Package metadata            | `release:check`, lockfile sync                                            | CHANGELOG; README only if install/meta copy changes          | Pack audit + consumers                                    | No                                                               | No unless packaging changes | Patch if npm publication needed   |
| Dependency / lockfile       | Clean `npm ci`, `lockfile:check`                                          | Note peer/engines changes                                    | Full package suite                                        | Via `verify:ci`                                                  | Yes                         | Peer range honesty                |
| Build configuration         | `build:lib`, `build:app`, pack                                            | Docs if consumer tooling changes                             | Package suite                                             | Storybook build                                                  | Yes                         | Assess                            |
| CI / workflow               | Validate YAML paths/commands exist                                        | `docs/ci.md` / releasing                                     | As workflow claims                                        | If workflow runs browser jobs                                    | If size job changes         | No                                |
| Security fix                | Regression test + full verify                                             | SECURITY/docs as needed                                      | Yes                                                       | Prefer full                                                      | Yes                         | Patch assessment                  |
| Release preparation         | Level 3 + pack/`npm publish --dry-run`                                    | CHANGELOG + releasing checklist                              | **Required**                                              | **Required**                                                     | **Required**                | Intentional SemVer bump           |

Ordinary commits do **not** require a version bump. Bump versions only when preparing a release ([releasing.md](releasing.md)).

## 4. After implementation

Ordered checklist:

1. Review changed files (`git status`, `git diff`).
2. Run `git diff --check`.
3. Remove debug statements and temporary files.
4. Confirm no credentials or secrets.
5. Format: `npm run format` to apply Prettier; `npm run format:check` to verify.
6. `npm run typecheck`
7. `npm run lint`
8. Run targeted Vitest / Node tests for the change.
9. Run category-specific package/Storybook/size checks from the table above.
10. Update docs under `docs/` and README when consumer-facing.
11. Update Storybook when consumer usage or docs pages change.
12. Update affected `.ai` skills (see skill policy below).
13. Run `npm run release:check` when metadata, changelog, or publication readiness is involved.
14. Confirm no unintended public API / export changes.
15. Confirm Git status contains only intentional changes.

## 5. Verification levels

### Level 1 — Fast targeted (while coding)

Examples:

```bash
npx vitest run path/to/file.test.ts
npm run typecheck
npm run lint
npm run format:check
node --test scripts/check-release-consistency.test.mjs
```

### Level 2 — Standard local (before committing meaningful code)

```bash
npm run verify
```

Includes lockfile check, `release:check`, typecheck, lint, format, unit tests + coverage, library build, package/SSR/exports, size, TypeDoc, Storybook build, Storybook Vitest mirrors, pack dry-run, and demo app build. Does **not** run Playwright browser/visual suites.

### Level 3 — Full release / CI (before high-risk merge, release, or publish)

```bash
npm ci
npm run lockfile:check
npm run release:check
npm run verify
npm run verify:ci
```

`verify:ci` adds Playwright Chromium install, Storybook browser play + axe, and light desktop/mobile visual smoke. It is expensive; use Level 1–2 while iterating.

For releases, also pack and inspect the tarball, run isolated consumer checks, and `npm publish --dry-run --access public --tag <channel>` (never real publish without owner authorization). See [releasing.md](releasing.md).

Documentation-only typos may skip Level 3 locally, but CI (`verify:ci` path in GitHub Actions) must still pass after push.

## 6. Test selection guide

| Change                | Prefer these checks                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Core form state       | `src/hooks/useForm/useForm.test.ts`, `subscriptions.test.tsx`, `typecheck`, then package suite        |
| Field arrays          | `useFieldArray.test.tsx`, `fieldArrayUtilities.test.ts`, path/type tests                              |
| Nested paths / files  | `useForm` nested/file describes, `pathUtilities.test.ts`, `fileHelpers.test.ts`, file type tests      |
| Validation            | `builtInRules`, `runRules`, `runValidation`, `asyncRule`, `dependencies`, message/type tests          |
| Resolvers             | `resolver.type-test.ts`, resolver runtime tests, `test:exports`, `test:ssr`, `test:package`           |
| Context / controllers | `FormProvider.test.tsx`, `useController.test.tsx`, context type tests                                 |
| Getters / batch       | `formGetters.test.ts`, `formBatch.test.ts` (+ type tests)                                             |
| DevTools              | `FormDevTools.test.tsx`, `safeSerialize.test.ts`, UI tests, Storybook browser/a11y, `size`            |
| Storybook             | `build:storybook`, `test:storybook`, `test:storybook-browser`, `test:storybook-visual`                |
| Exports / packaging   | `test:exports`, `test:package`, `test:ssr`, `pack:dry-run`, `release:check`                           |
| Dependencies          | `npm ci`, `lockfile:check`, `verify` / `verify:ci`, audit classification (no `npm audit fix --force`) |

Coverage thresholds for form-system changes: statements/functions/lines ≥ 90%, branches ≥ 75% (`npm run test:coverage`).

## 7. Documentation checklist

Review docs when changing public API, exported types, validation, defaults, async behavior, errors, package entry points, compatibility, installation, release process, or Storybook deployment.

Likely files: `README.md`, `CHANGELOG.md`, `docs/**`, Storybook pages under `src/stories/`, [migration.md](migration.md), [public-api.md](public-api.md), and relevant `.ai` skills.

Consumer examples must import public packages:

```ts
import { useForm } from '@muradyanvano/use-form'
import { FormDevTools } from '@muradyanvano/use-form/devtools'
import { standardSchemaResolver } from '@muradyanvano/use-form/resolvers/standard-schema'
```

Prefer timeless wording over hardcoding the current version in many places. Exact versions belong in `package.json`, lockfile, CHANGELOG, tags, and npm metadata.

## 8. `.ai` skill update policy

Update a skill when its instructions, examples, architecture, commands, or assumptions become stale.

Inspect routed skills; update only affected ones. Update `.ai/README.md` when a new responsibility needs routing. Keep skills concise operational instructions; keep detailed narrative in `docs/`.

Do not make meaningless edits to every skill after every change.

## 9. Before committing

- `git diff --check` passes
- Formatting, typecheck, and lint pass when applicable
- Targeted tests and the required verification level pass
- Docs / Storybook / skills updated when needed
- No debug code, credentials, generated artifacts, or unrelated files
- Package version unchanged unless preparing a release
- CHANGELOG updated for consumer-visible behavior

Preferred commit prefixes (not a hard Conventional Commits mandate): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `chore:`, `ci:`.

## 10. Before pushing

1. Confirm authorization to push.
2. Confirm correct branch and commit contents.
3. Confirm local verification for the change class.
4. Push without force. Never force-push `main`.
5. Never skip hooks merely to make a push succeed.
6. Never push secrets.

### After pushing

1. Open GitHub Actions (`.github/workflows/ci.yml`).
2. Wait for required checks.
3. Investigate failures; do not declare completion while CI is red.
4. Verify deployment only when the change includes an authorized deploy.

## 11. Version and release decision

Version changes happen when preparing a release—not on every ordinary commit.

Pre-1.0 SemVer guidance:

- **Patch** — backward-compatible fixes; docs/metadata that require npm republication
- **Minor** — backward-compatible features
- **Major** — explicitly approved breaking strategy
- **Prerelease** — beta channel testing

Follow [`.ai/skills/package-release.md`](../.ai/skills/package-release.md), [releasing.md](releasing.md), and the step-by-step GitHub UI guide [github-release-workflow.md](github-release-workflow.md). Releases require: `npm version … --no-git-tag-version`, CHANGELOG, Level 3 verification, tarball consumer tests, publish dry-run, green CI, Trusted Publishing via `.github/workflows/publish.yml`, registry verification, then Git tag + GitHub Release **after** npm succeeds. Stable Storybook must deploy from the exact stable tag via `.github/workflows/deploy-storybook.yml`.

## 12. Hotfix workflow

1. Reproduce the bug.
2. Add a failing regression test.
3. Implement the smallest safe fix.
4. Run targeted tests, then Level 2–3 verification.
5. Assess patch SemVer and update CHANGELOG.
6. Prepare package (Level 3 + pack).
7. Push and wait for CI.
8. Publish through Trusted Publishing (owner authorization).
9. Verify registry install.
10. Tag and create a normal GitHub Release.
11. Confirm stable Storybook deployment if documentation changed.

Do not bypass review or CI because the fix is urgent.

## 13. Failure handling

| Failure                        | Response                                                                |
| ------------------------------ | ----------------------------------------------------------------------- |
| `npm ci` / `lockfile:check`    | Fix lockfile via npm commands; never hand-edit lock metadata            |
| Formatting                     | Run `npm run format`; do not disable Prettier                           |
| Flaky tests                    | Stabilize or isolate; do not ignore                                     |
| Browser / a11y                 | Fix violations; do not weaken axe gates                                 |
| Size budget                    | Reduce graph or get explicit approval to raise budgets                  |
| Package / export tests         | Fix packaging or exports; keep entry boundaries                         |
| Storybook deploy               | Inspect Actions logs; redeploy authorized tag only                      |
| `npm publish` / version exists | Stop; never republish the same version; never mutate dist-tags casually |
| Local ≠ CI                     | Compare Node/npm/OS; preserve logs; do not “fix” CI with `--force`      |

Do not weaken gates, use `--force` casually, delete/recreate Git tags silently, or continue when new authorization is required.
