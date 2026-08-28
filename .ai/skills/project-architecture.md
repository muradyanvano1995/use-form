# Project architecture

## Stack

- Vite 8 + React 19 + TypeScript 6
- ESLint flat config + Prettier
- Vitest + React Testing Library + jsdom

## Source layout

```text
src/
  lib/index.ts                # Core package entry ('use client')
  resolvers/standard-schema/  # standardSchemaResolver (no React)
  hooks/useForm/              # Shared form infrastructure
    useForm.ts / useForm.test.ts
    formStore.ts              # External form store + opaque FormControl (WeakMap)
    subscriptions.ts          # useWatch / useFormState / useFieldState
    useController.ts          # Controlled / custom-component bindings
    useFieldArray.ts          # Dynamic field arrays + stable keys
    dependencies.ts           # Dependent → source graph and eligibility helpers
    defaultValuesLoader.ts    # Async defaults merge + loader types
    fieldRegistration.ts      # Unregister options, deferred scheduler, element registry
    fieldArrayUtilities.ts    # Internal remappers (not public)
    FormProvider.tsx          # FormProvider component
    formContext.ts            # useFormContext / resolveControl
    pathUtilities.ts          # Immutable nested + indexed path read/write/merge
    fileHelpers.ts            # SSR-safe File parsing / native input clearing
    utilities.ts / utilities.test.ts
    validation/               # Modes, rules, runners, resolvers, async debounce (+ matching *.test.ts)
    paths.type-test.ts
    files.type-test.ts
    subscriptions.type-test.ts
    useController.type-test.ts
    formContext.type-test.ts
    useFieldArray.type-test.ts
    dependencies.type-test.ts
    defaultValuesLoader.type-test.ts
    fieldRegistration.type-test.ts
    errors.ts / errors.test.ts / errors.type-test.ts
    formGetters.ts / formGetters.test.ts / formGetters.type-test.ts
    formBatch.ts / formBatch.test.ts / formBatch.type-test.ts
    validation/validationMessages.ts / validationMessages.test.ts / validationMessages.type-test.ts
    validation/rules.type-test.ts
    validation/resolver.type-test.ts
  devtools/                   # Separate entry — FormDevTools (not core barrel); requires react-dom
    index.ts / FormDevTools.tsx / FormDevTools.test.tsx / styles.ts / dirtyFields.ts
    safeSerialize.ts / safeSerialize.test.ts / devtools.type-test.ts
    components/                # DevToolsPanel, JsonTree, ErrorPanel, ResizeHandles (+ UI tests)
    hooks/                     # useFloatingPanel, usePanelPersistence, useDevToolsSnapshot
  examples/                   # Login, Registration, LocalizedRegistration, Profile, AsyncDefaults, ConditionalCompany, UsernameAvailability, DependentFields, FileUpload, ControlledFields, ContextProfile, OrderItems, ResolverRegistration, PasswordQuality, BatchedAddress, DevToolsInspector, Checkout, RadioCheckbox, StandardSchema, Watchers
  stories/                    # Storybook only (not packed): documentation/, core/, validation/, fields/, state/, tools/, examples/ (Complete Examples E2E), styles/, preview/, theme/ (light-only), components/, snippets/
  test/setup.ts
  App.tsx
docs/
  public-api.md
  releasing.md
  migration.md
  ci.md
  package-roadmap.md
  structured-errors.md
  internationalization.md
  form-state.md
  controlled-components.md
  form-context.md
  field-arrays.md
  schema-resolvers.md
  async-validation.md
  async-default-values.md
  dependent-fields.md
  validation.md
  conditional-fields.md
  imperative-api.md
  batching.md
  devtools.md
  storybook.md
  storybook-audit.md
  useform-maintainability.md
  production-readiness-audit.md
```

`useForm.ts` remains the coordinating hook. Further extractions follow `docs/useform-maintainability.md`. Do not relocate `src/hooks/useForm`.

Test naming: one `Module.test.ts` (or `.tsx` when JSX is required) beside each production module. Nested path behavior lives in `useForm.test.ts` describes + `pathUtilities.test.ts`. Details: `skills/testing.md`.

## Boundaries

- Public form contracts live in `formTypes.ts` (`UseFormOptions` is an **interface** with a local `rules` field). `types.ts` only re-exports `formTypes` for compatibility.
- `dependencies.ts` owns pure reverse-index traversal; do not duplicate graph logic in `useForm.ts`. Pathless resolver errors are `rootError` / `rootErrorDetails`, separate from API-facing `submitError`.
- `errors.ts` owns canonical structured-error normalization. String maps are derived views.
- Export core APIs through `src/lib/index.ts` (re-exports `src/hooks/useForm/index.ts`). Demo examples may still import `../hooks/useForm`.
- DevTools is a separate entry (`src/devtools/index.ts` → package `./devtools`). Core must not import it or `react-dom`. The DevTools subpath requires `react-dom` (portals); `react-dom` stays an optional package peer so core-only consumers are not forced to install it.
- DevTools styles are a JS string (`styles.ts`) injected by the panel — not a CSS file — so `"sideEffects": false` cannot tree-shake them away.
- DevTools subscribes via `useDevToolsSnapshot` (store selector) rather than `useFormState`, so the consumer bundle does not pull `pathUtilities` dirty helpers; State-tab dirty maps use `dirtyFields.ts`.
- `standardSchemaResolver` is a separate entry (`src/resolvers/standard-schema` → package `./resolvers/standard-schema`). Do not re-export it from core.
- Examples under `src/examples` demonstrate the public API; they must not import private internals.
- Library build: `npm run build:lib` → `dist/`. Demo: `npm run build:app` → `dist-app/`.
- Do not add React Hook Form, Formik, or another full form-state library.

## Defaults

- Prefer named exports for hooks, utilities, and types.
- `errors.ts` is the canonical error module; do not re-export merge/normalization helpers from the public barrel.
- Use `.ts` / `.tsx` extensions in relative file imports. Public/package boundaries may use directory barrels (omit `/index.ts`). Internal modules should prefer direct imports when that clarifies dependencies; avoid circular barrels.
- Do not rewrite Vite / ESLint / Prettier setup unless a task explicitly requires it.
- Prefer `as const` objects over enums for shared runtime constants.
