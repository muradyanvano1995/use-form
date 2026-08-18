# CI readiness

No CI provider is configured in this repository (no GitHub Actions workflows, no GitLab CI file). Do not assume GitHub Actions.

## Provider-neutral job

Use a Node version compatible with Vite 8 and the current `package-lock.json` (Node 22 is a reasonable default; confirm locally).

```text
npm ci
npm run verify
```

`verify` already includes library build, package consumer tests, Storybook build, TypeDoc, and `npm pack --dry-run`.

Optional extra jobs, if the owner wants them split:

```text
npm run build:storybook
npm run docs:api
npm run pack:dry-run
```

## Policy

- Do not upload coverage, Storybook, or provenance artifacts without authorization.
- Do not publish from CI until package name, license, and npm trusted publishing are configured.
- Cache `node_modules` according to the chosen provider; prefer `npm ci`.
