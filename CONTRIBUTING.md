# Contributing

This repository is a library plus a Vite demo app. Do not publish, tag, or push as part of ordinary development.

## Install

Requires **Node** `^20.19.0 || >=22.12.0` and **npm** `>=10.8.0` (see `package.json` `engines`). Verified on Linux (Debian bookworm) and Windows with npm **10.8.x–11.19.x**. Prefer a clean lockfile install:

```bash
npm ci
```

`npm install` is fine for local dependency bumps; commit the resulting `package-lock.json` and confirm `npm run lockfile:check` / `npm ci` still succeed.

React 19 is required for the demo, tests, and Storybook.

## Development app

```bash
npm run dev
```

The demo lives in `src/App.tsx` and `src/examples/`. It is not included in the npm package.

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:coverage
```

Type tests are `*.type-test.ts` files compiled by `typecheck`, not executed by Vitest.

## Library and docs

```bash
npm run build:lib
npm run build:app
npm run storybook
npm run build:storybook
npm run docs:api
npm run test:package
npm run test:ssr
npm run test:exports
npm run size
npm run pack:dry-run
npm run verify
```

```bash
npm run storybook
npm run build:storybook
npm run test:storybook
```

Storybook is published at [https://muradyanvano1995.github.io/use-form/](https://muradyanvano1995.github.io/use-form/). For contributor work, run `npm run storybook` locally and follow [docs/storybook.md](docs/storybook.md). Review the light canvas at mobile and desktop widths before considering docs complete. Do not log passwords or file contents in Actions.

`verify` is the full non-destructive release-readiness suite. It does not publish.

## Documentation updates

- User guides: `docs/`
- Public export inventory: `docs/public-api.md`
- Agent instructions: read `.ai/README.md`, then every relevant file under `.ai/skills/`
- After behavior changes, update the matching skill files in the same change

## Package identity

Do not invent an npm scope, license, repository URL, or author. See [docs/releasing.md](docs/releasing.md).
