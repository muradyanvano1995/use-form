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
- `react-dom`: optional peer
- React remains in `devDependencies` for demo/tests
- Do not promise React 18 or React Native without tests

## Module format

ESM only. Do not claim CommonJS without `require()` tests.

## Identity blockers

Do not invent package scope, license, repository URL, author, or homepage. If missing, document as a release blocker. Keep `private: true` until the owner publishes.

Current workspace `name` is `react-hooks` (generic). README install commands use `<package-name>`.

## Scripts

`verify` is the full non-destructive suite. There is no `prepublishOnly`. `pack:dry-run` inspects the archive without publishing.

Size budgets live in `scripts/size-budget.json` and are measured from minified consumer bundles with React external. Initial measured sizes (minified): core 81 kB / 21 kB gzip, DevTools ~31 kB / ~8 kB gzip (themed inspector + error cards), resolver 5.3 kB / 1.9 kB gzip, `rules`-only 11 kB, `useForm`-only 65 kB. Budgets include headroom above those measurements.

## Docs

- Inventory: `docs/public-api.md`
- Checklist: `docs/releasing.md`
- CI: `docs/ci.md` (provider not chosen)
- TypeDoc: `npm run docs:api` → `api-docs/` (gitignored)
- Storybook: `npm run storybook` / `build:storybook` (devDependency, not packed, not deployed)
- Storybook contributor rules: `docs/storybook.md` (theme layers, Controls, Actions, play tests, a11y, visual checklist, consumer `source.code` snippets, CodePanel copy)
- Consumer snippets: `src/stories/snippets/consumerSnippets.ts`. Autodocs is enabled. Docs canvas `sourceState: 'shown'`. CodePanel Copy code button.
- Pre-rebuild audit: `docs/storybook-audit.md`
- Addons: `@storybook/addon-docs`, `@storybook/addon-a11y`. Preview toolbar `theme`: light | dark | system. Manager themes via `addons.setConfig`. Backgrounds disabled.
- Scripts: `test:storybook` (Vitest for `src/stories`, including RTL flows that mirror CSF `play` functions), `test:storybook-visual` (Playwright screenshots of `storybook-static`; not part of `verify`; gitignored `storybook-visual/`)
