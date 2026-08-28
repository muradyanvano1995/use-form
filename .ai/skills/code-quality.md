# Code quality

## Scripts

| Script                            | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `npm run typecheck`               | `tsc -b`                                     |
| `npm run lint`                    | ESLint (type-aware `recommendedTypeChecked`) |
| `npm run format` / `format:check` | Prettier                                     |
| `npm run test`                    | Vitest run                                   |
| `npm run test:coverage`           | Vitest + V8 coverage (thresholds)            |
| `npm run build:lib`               | ESM library + declarations → `dist/`         |
| `npm run build:app`               | Demo Vite build → `dist-app/`                |
| `npm run build`                   | Alias of `build:lib`                         |
| `npm run build:storybook`         | Static Storybook → `storybook-static/`       |
| `npm run test:storybook`          | Storybook Vitest suite (`src/stories`)       |
| `npm run verify`                  | Full non-destructive release-readiness suite |
| `npm run lockfile:check`          | `npm ci --dry-run` lockfile consistency      |

See `.ai/skills/package-release.md` for packing, size, Storybook, and TypeDoc. Do not add `prepublishOnly`.

Prettier: no semicolons, single quotes, trailing commas, width 100 (`.prettierrc`).

## ESLint

- Flat config in `eslint.config.js` uses `typescript-eslint` **`recommendedTypeChecked`** with `parserOptions.projectService`.
- React form handlers may return promises (`handleSubmit`); `no-misused-promises` allows promise-returning JSX/DOM attributes.
- `*.type-test.ts` and `*.{test,spec}.{ts,tsx}` relax noisy type-aware rules (casts, `any` from mocks, unused `async`).
- Prefer fixing types over `eslint-disable`. Do not disable type-aware rules casually in library source.

## IDE inspections (WebStorm)

These are separate from ESLint. Prefer fixing the code when the warning is real:

- Do not use a void-typed callback’s return value; cast to `() => unknown` only for runtime thenable guards.
- Do not throw solely to be caught in the same `try` — assign an error and rethrow after cleanup.
- Prefer `async`/`await` over `.then()` chains on public promise APIs when equivalent.
  Keep synchronous guards (`assertNotInBatch`) outside `async` functions so they still throw synchronously.
- Prefer directory barrels at **public boundaries** (`../hooks/useForm`, `../../lib`) over `.../index.ts`. Inside a feature folder, prefer direct module imports with `.ts` / `.tsx` extensions when that improves dependency clarity. Avoid circular barrels.

Weak warnings about redundant type arguments, deprecated `DirtyFields` re-exports, and docs-only duplication can stay unless they block review.

## Rules of thumb

- No `any` unless documented and unavoidable
- Do not disable lint rules casually
- Comments explain non-obvious decisions only
- Keep diffs focused; do not rewrite unrelated Vite/ESLint/Prettier config
- Update `.ai/skills` in the same change as behavior changes
- Prefer `as const` objects over TypeScript enums (`erasableSyntaxOnly`)
- Do not re-export internal store constructors (`createFormStore`) or `getControlInternals` from the public barrel
- Keep `FormControl` opaque; never put mutable store APIs on the public type
- Field-array keys and remappers stay internal (`fieldArrayUtilities.ts` is not a public export)
- Debounce timer registries / async-rule WeakMaps stay internal (`validationScheduler.ts`, `asyncRule.ts` helpers)
- Defaults-load generation / abort controllers stay internal (`defaultValuesLoader.ts` exports types + pure merge only)
- Pending-unregister registries / element ref counts stay internal (`fieldRegistration.ts` exports types + pure helpers only)
- Do not add concrete schema libraries (Zod/Yup/Valibot) as core runtime dependencies; use `FormResolver` / Standard Schema adapters
- Do not add speculative caching options (`cache`, `dedupe`, `staleTime`) without a separate cache contract
- Do not export internal error builders (`fieldErrorFromIssues`, merge/strip helpers) from the public barrel
- Do not export the validation message resolver, catalog snapshot symbol, or rule metadata WeakMaps
- Do not export `FormDevTools` or `safeSerialize` from the core barrel
- Do not export store transaction helpers or batch queues from the public barrel

## Dependencies policy

- Reuse React / Vite tooling already present
- Add focused libs only with clear value (Vitest/RTL were added for the form system)
- Do not add React Hook Form / Formik / similar form frameworks
