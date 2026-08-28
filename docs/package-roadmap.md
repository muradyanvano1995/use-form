# Package roadmap — `useForm` capability audit

**Baseline (2026-08-18):** Phases 5–13 complete locally — schema resolvers, dependent-field revalidation, debounced async field rules, async default-value loading, unregister / conditional fields, structured / multiple errors, internationalized built-in validation messages, non-reactive getters, atomic `batch()`, a separate-entry Form DevTools inspector, and a local npm-package build.  
**Package status (current):** Published on npm as `@muradyanvano/use-form`. Betas ship on the `beta` dist-tag; stable releases use `latest`. CI runs on GitHub Actions; npm publish uses GitHub Trusted Publishing and requires owner authorization via `.github/workflows/publish.yml`.

## Capability matrix

| Area                  | Status      | Quality | Missing behavior                                                                                  | Priority                    |
| --------------------- | ----------- | ------- | ------------------------------------------------------------------------------------------------- | --------------------------- |
| Flat fields           | **Done**    | High    | —                                                                                                 | —                           |
| Nested fields         | **Done**    | High    | Path depth capped at 5; parent object paths exist in `FieldPath` but metadata is leaf-oriented    | Low (docs only)             |
| Field arrays          | **Done**    | High    | No nested arrays inside items; no wildcard `products.*.name` rules                                | P2 (future)                 |
| File inputs           | **Done**    | High    | No `toFormData` helper (intentionally deferred)                                                   | Low                         |
| Built-in validation   | **Done**    | High    | Per-form catalogs; no translation-library adapter; no `refreshErrorMessages()`                    | P2 (`refreshErrorMessages`) |
| Custom validation     | **Done**    | High    | Dependency graph supports exact paths; no wildcard dependencies                                   | P2 (future)                 |
| Async validation      | **Done**    | High    | Debounced `rules.async`; no result caching / cross-form dedupe                                    | P2 (caching later)          |
| Schema resolvers      | **Done**    | High    | No Zod/Yup first-party adapters; Standard Schema adapter only                                     | P2 (adapters)               |
| Controlled components | **Done**    | High    | —                                                                                                 | —                           |
| Field subscriptions   | **Done**    | High    | Component calling `useForm` still re-renders fully (by design); use memoized children + selectors | —                           |
| Form context          | **Done**    | High    | Runtime cannot verify caller generics; pass `FormControl` only into the provider                  | —                           |
| Dependent fields      | **Done**    | High    | Exact indexed paths are positional; consumers regenerate config after array structural changes    | P2 (future)                 |
| Async defaults        | **Done**    | High    | Requires sync fallback + `loadDefaultValues`; no Suspense                                         | —                           |
| Conditional fields    | **Done**    | High    | Destructive unregister is typed to optional paths; no public `isRegistered` API yet               | —                           |
| Structured errors     | **Done**    | High    | Dual string + `FieldError` views; `criteriaMode`; params-aware dedupe; i18n catalogs              | —                           |
| Accessibility         | **Done**    | High    | Headless IDs / aria / focus-on-error; controller exposes `id` / `errorId` / aria props            | P2                          |
| SSR safety            | **Partial** | Medium  | Stable store `getServerSnapshot`; selector cache; no dedicated SSR hydration suite                | P1                          |
| Package build         | **Done**    | High    | Published on npm (`latest` and `beta` channels)                                                   | —                           |
| Documentation         | **Done**    | High    | Public Storybook at https://muradyanvano1995.github.io/use-form/ (light-only); TypeDoc local only | —                           |

## Recommended phase order

| Phase   | Focus                                             | Depends on                    |
| ------- | ------------------------------------------------- | ----------------------------- |
| **1–4** | Store, controller, context, field arrays          | —                             |
| **5**   | Resolver architecture (+ Standard Schema adapter) | Phase 1                       |
| **6**   | Dependent-field revalidation                      | Phase 1                       |
| **7**   | Debounced async rules                             | Phase 1                       |
| **8**   | Async `defaultValues`                             | Phase 1                       |
| **9**   | `unregister` / `shouldUnregister`                 | Phases 1, 4                   |
| **10**  | Structured / multiple errors                      | Phases 1, 7, 9                |
| **11**  | i18n message factories                            | Phase 10                      |
| **12**  | Getters, `batch()`, DevTools                      | Phase 1                       |
| **Eng** | Library build, peers, exports, size               | Parallel after API stabilizes |
| **13**  | npm package and local release readiness           | Engineering                   |

## Progress log

| Date       | Completed    | Notes                                                                                                     |
| ---------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| 2026-08-16 | Phases 1–4   | Store, controller, context, field arrays                                                                  |
| 2026-08-17 | **Phase 5**  | `FormResolver` + input/output/context generics + `standardSchemaResolver` + `docs/schema-resolvers.md`    |
| 2026-08-17 | **Phase 6**  | Dependency graph, touched-aware dependent revalidation, public types, examples, and documentation         |
| 2026-08-17 | **Phase 7**  | `rules.async` debounce helper, per-field scheduler, AbortSignal, docs/async-validation.md                 |
| 2026-08-17 | **Phase 8**  | `loadDefaultValues`, preserveDirty/replace merge, reload/retry, docs/async-default-values.md              |
| 2026-08-17 | **Phase 9**  | `unregister` / `shouldUnregister`, deferred unmount, optional-path typing, docs/conditional-fields.md     |
| 2026-08-17 | **Phase 10** | Dual-view structured errors, `criteriaMode`, rule metadata, docs/structured-errors.md                     |
| 2026-08-17 | **Phase 11** | Per-form validation message catalogs, field labels, default English catalog, docs/internationalization.md |
| 2026-08-18 | **Phase 12** | Imperative getters, atomic `form.batch()`, `src/devtools` inspector (not a published subpath)             |
| 2026-08-18 | **Phase 13** | Local library build, exports, peers, Storybook, TypeDoc, package tests. **Not published.**                |

## Phase 9 details

- Public: `form.unregister`, `shouldUnregister` (form / register / useController), `UnregisterOptions`, `UnregisterOptionsFor`, `OptionalFieldPath`
- Default `shouldUnregister: false` preserves prior behavior
- Destructive removal is typed to the **exact** optional path; required children of optional parents stay required
- Deferred microtask unregister (cancelled on reconnect) — no immediate `ref(null)` unregister
- Radio options have distinct element ids and a shared error id
- Phase 11 i18n message factories **complete** — see `docs/internationalization.md`

## Future proposal: `form.refreshErrorMessages()` (not implemented)

Re-resolve **existing built-in** `errorDetails` issues from stored `type` + `params` and the current `validationMessages` / `fieldLabels` **without** rerunning field rules, `validate`, resolvers, or async checks.

Out of scope for that helper: custom validators, `rules.async` messages, form-level `validate`, schema/resolver issues, `setError`/`setErrors`, root/loader/`submitError`. Those stay as provided.

Until it ships, applications refresh visible built-in copy by calling `form.validate()` after catalogs commit. Core `useForm` will not auto-revalidate on catalog identity changes, because that would rerun async validators and resolvers unexpectedly.

## Next recommended phase

**Owner decisions for public 0.x:** trigger `.github/workflows/publish.yml` with the matching `version` and `channel` after CI is green. Prereleases use `beta`; stable releases use `latest`. Tag and GitHub Release only after npm publish succeeds.

Phase 13 details:

- Entries: `.` (core), `./devtools`, `./resolvers/standard-schema`
- Demo app: `npm run build:app` → `dist-app/`
- Library: `npm run build:lib` → `dist/`
- See `docs/public-api.md`, `docs/releasing.md`, `.ai/skills/package-release.md`

## Release readiness (honest)

Published on npm (stable and beta channels). Public Storybook is deployed from stable GitHub Releases to https://muradyanvano1995.github.io/use-form/.
