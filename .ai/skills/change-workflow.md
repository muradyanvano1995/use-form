# Change workflow

Operational skill for AI agents after making any repository change. Detailed human/agent guide: [`docs/development-workflow.md`](../../docs/development-workflow.md).

## Never without explicit authorization

- `npm publish` / dist-tag changes
- git push, force-push, tags, GitHub Releases
- Storybook deploy / Pages uploads
- Discarding unrelated uncommitted work

## Mandatory sequence

1. **Classify** the change (docs, Storybook, internal, runtime, validation, public API, DevTools, metadata, deps, build, CI, security, release).
2. **Choose verification level** from the guide:
   - Level 1 — targeted checks while implementing
   - Level 2 — `npm run verify` before committing meaningful code
   - Level 3 — `npm ci` + `lockfile:check` + `release:check` + `verify` + `verify:ci` before high-risk merge, release, or publish
3. **Run targeted tests** for the classification (see the guide’s test-selection table).
4. **Update** docs, Storybook, and only affected `.ai` skills when instructions/examples became stale.
5. **Diff hygiene**: `git status`, `git diff`, `git diff --check`; no debug leftovers, secrets, or generated artifacts.
6. **Do not** push, tag, publish, or deploy unless the owner explicitly asks.
7. After an authorized push, **confirm GitHub Actions CI** is green before claiming completion.

## Verification levels (commands that exist today)

| Level | When                                | Commands                                                           |
| ----- | ----------------------------------- | ------------------------------------------------------------------ |
| 1     | Iterating                           | Focused Vitest/`node --test`, `typecheck`, `lint`, `format:check`  |
| 2     | Before commit of meaningful code    | `npm run verify`                                                   |
| 3     | High-risk merge / release / publish | `npm ci`, `lockfile:check`, `release:check`, `verify`, `verify:ci` |

`format` rewrites files; `format:check` only verifies. Prefer check in CI-like gates; use `format` when you intend to apply Prettier.

## Boundaries

- Public imports in consumer docs: `@muradyanvano/use-form`, `/devtools`, `/resolvers/standard-schema`.
- Release / deploy operations (npm publish, tags, GitHub Releases, Storybook/Pages, environment approval, failure recovery): [`package-release.md`](package-release.md) + [`docs/github-release-workflow.md`](../../docs/github-release-workflow.md) + [`docs/releasing.md`](../../docs/releasing.md).
- Form/validation work: also open [`form-system.md`](form-system.md) / [`validation.md`](validation.md).
- Do not invent npm scripts; only document commands present in `package.json`.
