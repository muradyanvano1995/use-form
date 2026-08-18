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
  devtools/                   # Separate entry — FormDevTools, safeSerialize (not core barrel)
    FormDevTools.tsx / FormDevTools.test.tsx / safeSerialize.ts / safeSerialize.test.ts / index.ts / devtools.type-test.ts
  examples/                   # Login, Registration, LocalizedRegistration, Profile, AsyncDefaults, ConditionalCompany, UsernameAvailability, DependentFields, FileUpload, ControlledFields, ContextProfile, OrderItems, ResolverRegistration, PasswordQuality, BatchedAddress, DevToolsInspector
  stories/                    # Storybook (not packed)
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
```

Test naming: one `Module.test.ts` (or `.tsx` when JSX is required) beside each production module. Nested path behavior lives in `useForm.test.ts` describes + `pathUtilities.test.ts`. Details: `skills/testing.md`.

## Boundaries

- Public form contracts live in `formTypes.ts` (`UseFormOptions` is an **interface** with a local `rules` field). `types.ts` only re-exports `formTypes` for compatibility.
- `dependencies.ts` owns pure reverse-index traversal; do not duplicate graph logic in `useForm.ts`. Pathless resolver errors are `rootError` / `rootErrorDetails`, separate from API-facing `submitError`.
- `errors.ts` owns canonical structured-error normalization. String maps are derived views.
- Export core APIs through `src/lib/index.ts` (re-exports `src/hooks/useForm/index.ts`). Demo examples may still import `../hooks/useForm`.
- DevTools is a separate entry (`src/devtools/index.ts` → package `./devtools`). Core must not import it.
- `standardSchemaResolver` is a separate entry (`src/resolvers/standard-schema` → package `./resolvers/standard-schema`). Do not re-export it from core.
- Examples under `src/examples` demonstrate the public API; they must not import private internals.
- Library build: `npm run build:lib` → `dist/`. Demo: `npm run build:app` → `dist-app/`.
- Do not add React Hook Form, Formik, or another full form-state library.

## Defaults

- Prefer named exports for hooks, utilities, and types.
- `errors.ts` is the canonical error module; do not re-export merge/normalization helpers from the public barrel.
- Use `.ts` / `.tsx` extensions in relative file imports; directory barrels may omit `/index.ts`.
- Do not rewrite Vite / ESLint / Prettier setup unless a task explicitly requires it.
- Prefer `as const` objects over enums for shared runtime constants.
