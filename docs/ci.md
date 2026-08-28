# CI readiness

GitHub Actions is configured at `.github/workflows/ci.yml` (remote is GitHub). The workflow runs on `push`/`pull_request` to `main` with Node `20.19.x` and `22.x`.

## Local vs CI

| Command             | Includes                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`    | Lockfile check, typecheck, lint, format, unit tests + coverage, library build, package/SSR/exports, size, TypeDoc, Storybook **build**, Storybook **Vitest mirrors**, pack dry-run, demo app build |
| `npm run verify:ci` | Everything in `verify`, plus Playwright Chromium install, **real Storybook browser play + a11y** (`test:storybook-browser`), and light visual smoke (`test:storybook-visual`)                      |

`test:storybook` alone is **not** complete Storybook verification — it mirrors play flows in jsdom/RTL. Browser play + axe run only via `test:storybook-browser` / `verify:ci` / GitHub Actions.

## Provider-neutral job

Use a Node version compatible with Vite 8 and `package.json` `engines` (`^20.19.0 || >=22.12.0`, npm `>=10.8.0`). Verified with npm **10.8.x–11.19.x** on Ubuntu (GitHub Actions) and Linux/Windows locally.

```text
npm ci
npm run lockfile:check
npm run release:check
npm run verify:ci
```

`lockfile:check` runs `npm ci --dry-run` so lockfile drift fails before the rest of the suite.

## Policy

- Do not upload coverage or provenance artifacts without authorization.
- Public Storybook deploys only from `.github/workflows/deploy-storybook.yml` (stable releases or authorized `workflow_dispatch`).
- Do not publish from CI until the owner triggers `.github/workflows/publish.yml` (Trusted Publishing, protected `npm-publish` environment).
- Prefer `npm ci`. Install Playwright Chromium reproducibly (`npx playwright install chromium --with-deps` in CI).
- Visual screenshots stay in gitignored `storybook-visual/` and are not packed.
