# Contributing

This repository is a library plus a Vite demo app. Do not publish, tag, or push as part of ordinary development.

## Install

```bash
npm install
```

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

Storybook is local documentation only. Follow [docs/storybook.md](docs/storybook.md). Review light, dark, mobile, and desktop before considering docs complete. Do not log passwords or file contents in Actions.

`verify` is the full non-destructive release-readiness suite. It does not publish.

## Documentation updates

- User guides: `docs/`
- Public export inventory: `docs/public-api.md`
- Agent instructions: read `.ai/README.md`, then every relevant file under `.ai/skills/`
- After behavior changes, update the matching skill files in the same change

## Package identity

Do not invent an npm scope, license, repository URL, or author. See [docs/releasing.md](docs/releasing.md).
