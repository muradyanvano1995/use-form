# Testing

## Tooling

- Vitest (`npm run test`, `npm run test:watch`, `npm run test:coverage`)
- React Testing Library (`renderHook`, `act`, `waitFor`)
- `@testing-library/jest-dom` matchers via `src/test/setup.ts`
- Coverage via `@vitest/coverage-v8` (configured in `vite.config.ts`)
- Storybook play functions run in the Storybook UI; `npm run test:storybook` is Vitest on `src/stories` (RTL flows, not `composeStories`)

## File naming

One conventional test file per production module:

```text
useForm.ts                 → useForm.test.ts
formStore.ts               → formStore.test.ts
subscriptions.ts           → subscriptions.test.tsx
useController.ts           → useController.test.tsx
useFieldArray.ts           → useFieldArray.test.tsx
fieldArrayUtilities.ts     → fieldArrayUtilities.test.ts
FormProvider.tsx           → FormProvider.test.tsx
utilities.ts               → utilities.test.ts
pathUtilities.ts           → pathUtilities.test.ts
fileHelpers.ts             → fileHelpers.test.ts
validation/builtInRules.ts → builtInRules.test.ts
validation/runRules.ts     → runRules.test.ts
validation/validationMessages.ts → validationMessages.test.ts (+ validationMessages.type-test.ts)
validation/asyncRule.ts    → asyncRule.test.ts
validation/validationScheduler.ts → validationScheduler.test.ts
validation/runValidation.ts→ runValidation.test.ts
validation/utilities.ts    → utilities.test.ts
defaultValuesLoader.ts     → defaultValuesLoader.test.ts (+ defaultValuesLoader.type-test.ts)
fieldRegistration.ts       → fieldRegistration.test.ts (+ fieldRegistration.type-test.ts)
errors.ts                  → errors.test.ts (+ errors.type-test.ts)
formGetters.ts             → formGetters.test.ts (+ formGetters.type-test.ts)
formBatch.ts               → formBatch.test.ts (+ formBatch.type-test.ts)
devtools/FormDevTools.tsx  → FormDevTools.test.tsx
devtools/safeSerialize.ts  → safeSerialize.test.ts
src/stories/**/*.stories.tsx CSF play functions (Storybook runtime)
src/stories/storyPlay.test.tsx (RTL flows mirroring critical play paths)
src/stories/theme/resolvePreviewTheme.test.ts
src/stories/preview/safeActions.test.ts
```

Do **not** split `useForm` into thematic files. Keep all hook behavior (including nested paths, debounce integration, async defaults, and unregister) in `useForm.test.ts`. Subscription isolation (render counts) belongs in `subscriptions.test.tsx`. Controller isolation belongs in `useController.test.tsx`. Field-array behavior belongs in `useFieldArray.test.tsx`. Pure unregister helpers belong in `fieldRegistration.test.ts`.

For debounced validation and async default tests, use Vitest fake timers / controlled promises — avoid real waits.
Type-level checks (verified by `npm run typecheck`, not Vitest):

```text
paths.type-test.ts
files.type-test.ts
subscriptions.type-test.ts
useController.type-test.ts
formContext.type-test.ts
useFieldArray.type-test.ts
dependencies.type-test.ts
defaultValuesLoader.type-test.ts
fieldRegistration.type-test.ts
errors.type-test.ts
validation/rules.type-test.ts
validation/resolver.type-test.ts
validation/validationMessages.type-test.ts
formGetters.type-test.ts
formBatch.type-test.ts
```

DevTools type tests live in `src/devtools/devtools.type-test.ts`. Serializer/component tests: `safeSerialize.test.ts`, `FormDevTools.test.tsx`. Getter/batch runtime tests: `formGetters.test.ts`, `formBatch.test.ts`.

## Organization inside `useForm.test.ts`

Prefer nested Vitest `describe` blocks:

- Flat: `initialization`, `field registration`, `values`, `touched and dirty state`, `validation` (modes / field rules / form-level / async / races), `submission`, `backend errors`, `reset`, `accessibility`
- Nested: `nested registration`, `nested values`, `nested touched state`, `nested dirty state`, `nested validation`, `nested reset`, `nested submission`, `nested accessibility`
- Files: `file registration`, `file values`, `file dirty state`, `file validation`, `file reset`, `file submission`, `file accessibility`
- Unregister: `unregister and conditional fields` (explicit / automatic / radios / validation / async defaults / reset)
- Structured errors: `structured errors` (string compatibility / criteriaMode / sources / root details)
- Validation messages: `validation messages` (catalogs / labels / locale change / privacy)

## Conventions

- Test nested paths through the public API (`register('address.city')`, etc.)
- Prefer real DOM elements for `register`/`onChange`
- Unit-test path utilities for immutability, unsafe segments, and sibling preservation
- Ensure every `@ts-expect-error` in type-test files is active
- `src/test/setup.ts` runs Testing Library `cleanup()` after each test (required when mixing `render` harnesses)

## Coverage expectations

Run `npm run test:coverage` before merging form-system changes.

Thresholds: statements/functions/lines ≥ 90%, branches ≥ 75%.

Scope: `src/hooks/useForm/**` excluding barrels, tests, type-only modules, and `*.type-test.ts`.

## Required coverage themes

Flat themes plus: nested set/get, deep partial merge, leaf dirty/touched, nested rules/validate, nested reset/`keepValues`, nested focus/ids, unsafe path rejection, per-field async races, file uncontrolled registration, File/`File[]` parsing, file dirty identity, native file input clearing on reset, preserved dirty native files after async defaults, file validation rules, store subscribe/unsubscribe, selector equality for `useWatch` / `useFormState` / `useFieldState`, Strict Mode subscription survival, `useController` parse/format, controller render isolation, controller focus refs, FormProvider nested isolation, context control switching, opaque FormControl boundaries, `useFieldArray` mutations/keys/metadata reindex/async invalidation/primitive+file arrays, schema resolvers (input/output, precedence, stale submit guard, Standard Schema adapter), unregister/shouldUnregister (preserve vs remove, deferred unmount, radio groups, inactive validation).

## Commands

```bash
npm run test
npm run test:coverage
npm run typecheck
npm run lint
npm run test:storybook
npm run test:storybook-visual   # after build:storybook; needs Playwright Chromium
npm run test:package
npm run test:ssr
npm run test:exports
```

Package consumer tests (`scripts/test-*.mjs`) import the **built/packed** package, not `src/` aliases. Run them after `npm run build:lib`. Do not add them to the default Vitest suite.
