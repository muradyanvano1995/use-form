# Package and release

Use this skill for library builds, `package.json` exports, packing, consumer tests, size budgets, Storybook, TypeDoc, and release checklists.

## Never without explicit authorization

- `npm publish`
- npm login / tokens / provenance upload
- git tags, GitHub/GitLab releases, pushes
- Deploying Storybook or uploading coverage

Local `build:lib`, `npm pack` (temp dir), consumer tests, and docs generation are allowed.

Ordinary code changes follow [`change-workflow.md`](change-workflow.md) / [`docs/development-workflow.md`](../../docs/development-workflow.md). This skill owns packaging and release Level 3 gates.

Before **npm publishing**, **Git tagging**, **GitHub Release creation**, **Storybook deployment**, or **npm/GitHub failure recovery**, read [`docs/github-release-workflow.md`](../../docs/github-release-workflow.md) (exact order and GitHub UI). Policy summary: [`docs/releasing.md`](../../docs/releasing.md).

## Every version release

Future agents preparing or publishing a version must:

1. Read `package.json` as the canonical version.
2. Inspect npm read-only: `npm view @muradyanvano/use-form versions --json` and `dist-tags --json`.
3. Decide the SemVer bump intentionally and explain the selected bump.
4. Run `npm version <next> --no-git-tag-version` (never create a git tag from this command).
5. Never edit lockfile version metadata manually — let `npm version` / `npm install` update `package-lock.json`.
6. Confirm `package.json` and `package-lock.json` root `name` and `version` match.
7. Verify whether these metadata need updating for the release: package name, description, keywords, version, license, homepage, repository, bugs, exports, files, publishConfig, Storybook URL, README links, GitHub About website, CHANGELOG, npm dist-tags, GitHub Release, Storybook deployment. When package capabilities or positioning change, update description and keywords only when necessary.
8. Update `CHANGELOG.md` with the target version (do not claim publication until it succeeds).
9. Update migration docs when a release introduces breaking consumer-facing changes.
10. Update README, docs, and Storybook only when affected — avoid hardcoding the current version everywhere.
11. Search for stale publication language (`Not published yet`, `Planned npm name`, `<package-name>`, `private: true remains`, `Install from npm only after`, `Storybook docs are local only`, `not deployed`).
12. Run `npm run release:check`.
13. Run clean `npm ci`.
14. Run the complete verification pipeline (`npm run verify:ci`).
15. Pack and inspect the tarball (`npm pack --json`).
16. Test the tarball in isolated consumers (`npm run test:package`, `test:ssr`, `test:exports`).
17. Confirm size budgets (`npm run size`).
18. Confirm the target npm version is unpublished (`npm view @muradyanvano/use-form@<version> version` should fail).
19. Confirm channel mapping: prerelease → `beta`, stable → `latest`.
20. Never publish from a dirty tree or before CI succeeds.
21. Never weaken release gates (lint, tests, coverage, a11y, size budgets).
22. Never publish, tag, push, release, or deploy without explicit owner authorization.
23. After publication (owner only): verify npm version/dist-tags, description, and keywords (`npm view @muradyanvano/use-form description`, `npm view @muradyanvano/use-form keywords --json`), install from npm in a fresh project, verify provenance, create the matching Git tag, create a GitHub release (prerelease for betas, normal release for stable).
24. For a stable release, public Storybook documentation must be deployed from the exact stable Git tag, not from an arbitrary unverified working tree.
25. After a stable GitHub Release is published, verify that the Deploy Storybook workflow deployed the matching tag and that the public Storybook URL remains healthy.

Inspect all potentially affected skills and update only those whose instructions, examples, package names, commands, compatibility statements, or release procedures became stale (public API, exports, compatibility, validation, architecture, TypeScript conventions, testing, CI, publishing, Storybook, documentation).

## Layout

```text
src/lib/index.ts                         # core public entry ('use client')
src/devtools/index.ts                    # DevTools entry ('use client')
src/resolvers/standard-schema/index.ts   # adapter, no React
src/hooks/useForm/                       # implementation
src/examples/, src/App.tsx, src/main.tsx # demo only
src/stories/                             # Storybook only
```

`npm run build:lib` writes `dist/`. `npm run build:app` writes `dist-app/`. Do not pack the demo, tests, `.ai`, Storybook, coverage, or `api-docs/`.

## Entries

| Subpath                       | File                                                |
| ----------------------------- | --------------------------------------------------- |
| `.`                           | `dist/lib/index.js` + `.d.ts`                       |
| `./devtools`                  | `dist/devtools/index.js` + `.d.ts`                  |
| `./resolvers/standard-schema` | `dist/resolvers/standard-schema/index.js` + `.d.ts` |

No wildcard exports. `standardSchemaResolver` stays off the core barrel.

## Peers

- `react`: `^19.0.0` (tested in this repo on React 19)
- `react-dom`: optional peer for the package overall; **required when importing `./devtools`** (portals). Core does not import `react-dom`.
- React remains in `devDependencies` for demo/tests
- Do not promise React 18 or React Native without tests

## Module format

ESM only. Do not claim CommonJS without `require()` tests.

## Identity

Published npm package: `@muradyanvano/use-form`.

| Field       | Value                                        |
| ----------- | -------------------------------------------- |
| description | Concise React form-state + validation blurb  |
| keywords    | Focused discovery tags in `package.json`     |
| homepage    | https://muradyanvano1995.github.io/use-form/ |
| repository  | GitHub source (`muradyanvano1995/use-form`)  |
| bugs        | GitHub Issues                                |

For every release, verify package name, description, keywords, version, license, homepage, repository, bugs, exports, files and publishConfig. When package capabilities or positioning change, update description and keywords only when necessary. Canonical keywords live only in `package.json` — do not duplicate the list through consumer docs.

MIT license. Consumer docs use the scoped name; implementation keeps relative imports. `private` must be `false`. Do not hardcode dist-tags in `package.json` — the publish workflow selects `beta` or `latest`.

## Scripts

`verify` is the full non-destructive suite. There is no `prepublishOnly`. `release:check` validates package/lock identity, homepage/Storybook URL, exports, active docs, and changelog entry for the current version. `pack:dry-run` inspects the archive without publishing. `lockfile:check` runs `npm ci --dry-run` and is the first step of `verify`.

Supported tooling (`package.json` `engines`): Node `^20.19.0 || >=22.12.0`, npm `>=10`. Prefer `npm ci` from the committed lockfile.

Size budgets live in `scripts/size-budget.json` and are measured from minified consumer bundles with React external. Budgets (not to raise without explicit approval): core 100 kB / 26 kB gzip, DevTools 34 kB / 9 kB gzip, resolver 7 kB / 2.5 kB gzip, `rules`-only 14 kB, `useForm`-only 80 kB. DevTools size work prefers compressed JS-string styles and avoiding `useFormState`/`pathUtilities` in the DevTools graph over raising budgets.

## Publishing

- Workflow: `.github/workflows/publish.yml` (filename must not change — npm Trusted Publishing is bound to it).
- Manual `workflow_dispatch` only with inputs `version` and `channel` (`beta` | `latest`).
- GitHub OIDC Trusted Publishing — no `NPM_TOKEN` in the repo.
- Protected environment: `npm-publish`.
- Prerelease versions must publish to `beta`; stable versions must publish to `latest`.

## Storybook

- Public URL: https://muradyanvano1995.github.io/use-form/
- Deploy workflow: `.github/workflows/deploy-storybook.yml` (filename must not change).
- Stable GitHub Releases deploy from the exact release tag; prereleases do not overwrite stable docs.
- `workflow_dispatch` can deploy a specific tag or commit.
- Build output: `storybook-static` (gitignored, not packed).
- Local: `npm run storybook` / `build:storybook` (devDependency).
- Light-only theme — no dark/system mode.
- Contributor rules: `docs/storybook.md`.

## Docs

- Inventory: `docs/public-api.md`
- Checklist: `docs/releasing.md`
- GitHub UI / release order: `docs/github-release-workflow.md`
- Stable release audit: `docs/stable-release-audit.md`
- CI: `docs/ci.md` (GitHub Actions at `.github/workflows/ci.yml`)
- TypeDoc: `npm run docs:api` → `api-docs/` (gitignored)
- Storybook contributor rules: `docs/storybook.md` (light-only theme, Controls, Actions, play tests, a11y, scrollable docs blocks with `tabIndex={0}`, visual checklist, consumer `source.code` snippets, CodePanel copy). Sidebar: Introduction → Getting Started → Core Concepts → Hooks → Fields → Validation → State & Performance → DevTools → Complete Examples (E2E only) → Accessibility → API Reference → Migration → Limitations (`storySort` in `.storybook/preview.ts`). `useForm` canvas is Login; `useFieldState` uses FieldStateForm. Snippet highlighting: `--docs-syntax-*` + `syntax.css`.
- Consumer snippets: `src/stories/snippets/consumerSnippets.ts`. Autodocs is enabled. Docs canvas `sourceState: 'shown'`. CodePanel Copy code button.
- Pre-rebuild audit: `docs/storybook-audit.md`
- Addons: `@storybook/addon-docs`, `@storybook/addon-a11y`. No theme toolbar (light-only). Manager uses `docsLightTheme` via `addons.setConfig`. Backgrounds disabled.
- Scripts: `test:storybook` (Vitest mirrors), `test:storybook-browser` (real play + axe; part of `verify:ci`), `test:storybook-visual` (Playwright screenshots; gitignored `storybook-visual/`)
- useForm extraction plan: `docs/useform-maintainability.md` (keep `src/hooks/useForm` in place)
