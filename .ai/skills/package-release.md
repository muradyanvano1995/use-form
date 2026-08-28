# Package and release

Use this skill for library builds, `package.json` exports, packing, consumer tests, size budgets, Storybook, TypeDoc, and release checklists.

## Never without explicit authorization

- `npm publish`
- npm login / tokens / provenance upload
- git tags, GitHub/GitLab releases, pushes
- Deploying Storybook or uploading coverage

Local `build:lib`, `npm pack` (temp dir), consumer tests, and docs generation are allowed.

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

## Identity blockers

Do not invent package scope, license, repository URL, author, or homepage. If missing, document as a release blocker. Keep `private: true` until the owner publishes.

Current workspace `name` is `react-hooks` (generic). README install commands use `<package-name>`.

## Scripts

`verify` is the full non-destructive suite. There is no `prepublishOnly`. `pack:dry-run` inspects the archive without publishing. `lockfile:check` runs `npm ci --dry-run` and is the first step of `verify`.

Supported tooling (`package.json` `engines`): Node `^20.19.0 || >=22.12.0`, npm `>=10`. Prefer `npm ci` from the committed lockfile.

Size budgets live in `scripts/size-budget.json` and are measured from minified consumer bundles with React external. Budgets (not to raise without explicit approval): core 100 kB / 26 kB gzip, DevTools 34 kB / 9 kB gzip, resolver 7 kB / 2.5 kB gzip, `rules`-only 14 kB, `useForm`-only 80 kB. DevTools size work prefers compressed JS-string styles and avoiding `useFormState`/`pathUtilities` in the DevTools graph over raising budgets.

## Docs

- Inventory: `docs/public-api.md`
- Checklist: `docs/releasing.md`
- CI: `docs/ci.md` (GitHub Actions at `.github/workflows/ci.yml`)
- TypeDoc: `npm run docs:api` → `api-docs/` (gitignored)
- Storybook: `npm run storybook` / `build:storybook` (devDependency, not packed, not deployed)
- Storybook contributor rules: `docs/storybook.md` (light-only theme, Controls, Actions, play tests, a11y, scrollable docs blocks with `tabIndex={0}`, visual checklist, consumer `source.code` snippets, CodePanel copy). Sidebar: Introduction → Getting Started → Core Concepts → Hooks → Fields → Validation → State & Performance → DevTools → Complete Examples (E2E only) → Accessibility → API Reference → Migration → Limitations (`storySort` in `.storybook/preview.ts`). `useForm` canvas is Login; `useFieldState` uses FieldStateForm. Snippet highlighting: `--docs-syntax-*` + `syntax.css`.
- Consumer snippets: `src/stories/snippets/consumerSnippets.ts`. Autodocs is enabled. Docs canvas `sourceState: 'shown'`. CodePanel Copy code button.
- Pre-rebuild audit: `docs/storybook-audit.md`
- Addons: `@storybook/addon-docs`, `@storybook/addon-a11y`. No theme toolbar (light-only). Manager uses `docsLightTheme` via `addons.setConfig`. Backgrounds disabled.
- Scripts: `test:storybook` (Vitest mirrors), `test:storybook-browser` (real play + axe; part of `verify:ci`), `test:storybook-visual` (Playwright screenshots; gitignored `storybook-visual/`)
- useForm extraction plan: `docs/useform-maintainability.md` (keep `src/hooks/useForm` in place)
