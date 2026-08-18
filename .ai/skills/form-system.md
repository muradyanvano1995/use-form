# Form system (`useForm`)

## Purpose

`useForm` is the shared, fully typed form-state hook for this application. It owns values, errors, touched/dirty status, validation orchestration, and submission lifecycle for **flat and nested** form value objects, including **one level of field arrays** (`products.0.name`).

Import core from `src/lib/index.ts` or `src/hooks/useForm/index.ts`. Import DevTools from `src/devtools`. Import the Standard Schema adapter from `src/resolvers/standard-schema`.

```ts
import {
  useForm,
  useWatch,
  useFormState,
  useFieldState,
  useController,
  useFieldArray,
  FormProvider,
  useFormContext,
  rules,
  ValidationMode,
  ReValidateMode,
  createRule,
  type FieldPath,
  type FieldPathValue,
  type OptionalFieldPath,
  type UnregisterOptions,
  type FieldArrayPath,
  type FieldArrayItem,
  type FieldErrors,
  type FieldError,
  type FieldErrorDetails,
  type FieldIssue,
  type ErrorSource,
  type CriteriaMode,
  type DeepPartial,
  type FormControl,
  type FormResolver,
  type FieldDependencies,
  type DependencyMode,
  type ValidationRule,
  type ValidationReason,
  type ValidationRuleContext,
  type AsyncRuleOptions,
  type ValidationMessageCatalog,
  type FieldLabels,
  type BatchOptions,
  type ImperativeFieldState,
  defaultValidationMessages,
} from '../hooks/useForm/index.ts'
```

Debounced remote checks use `rules.async(validator, { debounce, validateEmpty, type })`. See `docs/async-validation.md`. `clearRootError()` clears only pathless resolver errors; `clearErrors()` clears field errors and `rootError`. Structured details are documented in `docs/structured-errors.md`. Built-in message catalogs are documented in `docs/internationalization.md`. Imperative getters: `docs/imperative-api.md`. Batching: `docs/batching.md`. DevTools: `docs/devtools.md`.

Async defaults: pass complete sync `defaultValues` plus optional `loadDefaultValues`. See `docs/async-default-values.md` for `isLoadingDefaults` / `isDefaultsReady` / `reloadDefaultValues`.

Conditional fields: `unregister` / `shouldUnregister`. See `docs/conditional-fields.md`. Default `shouldUnregister: false` preserves values.

## Nested field paths

Values stay nested. Metadata is keyed by dot-separated paths:

```ts
values: { address: { city: 'Yerevan' } }
errors: { 'address.city': 'City is required' }
touched: { 'address.city': true }
dirtyFields: { 'address.city': true }
```

```ts
form.register('address.city')
form.setValue('address.city', 'Yerevan')
form.validateField('address.city')
```

`FieldPath<T>` / `FieldPathValue<T, P>` provide compile-time path and value typing (recursion depth capped at **5**). `FieldName<T>` is an alias of `FieldPath<T>`.

DOM `name` attributes use the path string (`name="address.city"`). Browser `FormData` therefore sees a flat key; submitted hook `values` remain nested.

### Supported value types

| Kind                                                                   | Behavior                                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `string` / `number` / `boolean` / `null` / `undefined`                 | First-class leaves                                                                  |
| Plain nested objects                                                   | Traversable paths; deep-cloned / deep-merged                                        |
| Arrays (object / primitive / `File[]`)                                 | One index level via `products.0.name`; see `docs/field-arrays.md` + `useFieldArray` |
| Nested arrays inside items                                             | **Unsupported** in Phase 4                                                          |
| `Date` / `File` / `Blob` / `Map` / `Set` / class instances / functions | **Atomic references** — not deep-cloned; equality via `Object.is`                   |

### File inputs (`File | null` / `File[]`)

- Prefer defaults `null` and `[]`. Never store `FileList` — parse to `File | null` or `File[]`.
- Register with explicit `type: 'file'` (and `multiple: true` for `File[]`).
- File registration returns **uncontrolled** props only (no `value` / `checked`).
- `setValue` can update form state; browsers cannot populate a native file selection. Setting `null` / `[]` clears the native input.
- `reset` / `resetField` restore state and clear native file inputs via `input.value = ''`.
- Non-null default `File` values cannot be restored into the DOM selection — document this limitation.

> Client-side file validation improves UX but is **not** a security boundary. Type, extension, size, content, and authorization must be validated on the server. HTML `accept` and `File.type` are not security controls.

Multipart submission is a consumer concern (do not auto-wrap in `FormData` inside `useForm`):

```ts
const data = new FormData()
data.append('name', values.name)
if (values.avatar) data.append('avatar', values.avatar)
await fetch('/api', { method: 'POST', body: data }) // do not set Content-Type manually
```

### Field arrays

Use `useFieldArray` for dynamic lists. Stable keys live outside form values. See `docs/field-arrays.md`.

### Schema resolvers

Optional `resolver` / `resolverContext` with `useForm<TInput, TOutput, TContext>()`. Live state stays `TInput`; successful submit receives `TOutput`. See `docs/schema-resolvers.md`.

### Dependent fields and root errors

Use `dependencies` (dependent → source paths) to revalidate cross-field rules after source changes. Default `dependencyMode` is `'whenTouched'`; choose `'always'` only when immediate dependent feedback is intended. Dependency traversal is transitive and cycle-safe. Exact field-array indices are positional, so consumers regenerate configuration after structural changes. Pathless resolver/schema issues map to `form.rootError`, which blocks validity and submit but is distinct from API-oriented `submitError`.

## Public API

### Options (`UseFormOptions<T>`)

| Option                   | Meaning                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `defaultValues`          | Required initial values (deep-cloned on mount per supported-value rules)              |
| `rules`                  | Preferred per-field validation rules keyed by `FieldPath`                             |
| `fieldValidators`        | Legacy per-field validators (still supported; runs after `rules`)                     |
| `validate`               | Form-level sync/async validator returning path-keyed `FieldErrors<T>`                 |
| `onSubmit`               | Sync/async submit handler `(values, helpers) => void`                                 |
| `mode`                   | `ValidationMode` / `'onSubmit'` \| `'onBlur'` \| `'onChange'` (default)               |
| `reValidateMode`         | `ReValidateMode` / after submit: `'onChange'` (default) \| `'onBlur'` \| `'onSubmit'` |
| `focusOnError`           | Focus first invalid field after failed submit (default `true`)                        |
| `preventDuplicateSubmit` | Block overlapping submits (default `true`)                                            |
| `id`                     | Stable id prefix for field/error ids (defaults to React `useId()`)                    |
| `shouldUnregister`       | Unmount unregisters after a deferred microtask (default `false`)                      |
| `criteriaMode`           | `'firstError'` (default) or `'all'`                                                   |
| `validationMessages`     | Per-form built-in message catalog; missing keys fall back to English                  |
| `fieldLabels`            | Optional display labels keyed by `FieldPath`                                          |

### Validation mode constants

Prefer `ValidationMode` / `ReValidateMode` const objects (`as const`, not enums). String literals remain valid.

### Return value highlights

State: `values`, `defaultValues`, `errors`, `errorDetails`, `touched`, `dirtyFields`, `isDirty`, `isValid`, `isSubmitting`, `isValidating`, `isSubmitted`, `submitCount`, `submitError`, `rootError`, `rootErrorDetails`, `control`

Mutations: `setValue`, `setValues` (`DeepPartial` deep merge), `setError`, `setErrors`, `clearError`, `clearErrors`, `setSubmitError`, `reset`, `resetField`, `unregister`, `batch`

Getters (non-reactive): `getValues`, `getValue`, `getErrors`, `getErrorDetails`, `getFieldState`, `getDirtyValues`, `getTouchedValues`

Validation / submit: `validate`, `validateField`, `handleSubmit`

Bindings: `register`, `getFieldProps`, `getFieldId`, `getErrorId`

### Granular subscriptions (Phase 1)

`useForm` still re-renders its calling component on any state change (backward compatible). Prefer these hooks in child components for minimal re-renders:

```ts
import { useForm, useWatch, useFormState, useFieldState } from '../hooks/useForm/index.ts'

const form = useForm({ defaultValues })

// Pass `form` or `form.control` (control identity is stable)
const email = useWatch(form, 'email')
const isSubmitting = useFormState(form, (s) => s.isSubmitting)
const emailState = useFieldState(form, 'email')
```

Architecture:

- `createFormStore` — internal external store (`getState` / `setState` / `subscribe` / `getServerSnapshot` / transactions)
- `form.control` — opaque stable `FormControl` (internals in a module `WeakMap`; no public `_store` / handlers)
- Getters always read `store.getState()` (`docs/imperative-api.md`). `form.batch()` defers notifications until the outermost transaction ends (`docs/batching.md`).
- DevTools: import from `src/devtools/index.ts`, never the core barrel (`docs/devtools.md`).
- Subscription hooks use `useSyncExternalStore` + selector equality (`Object.is` by default; `useFieldState` uses field-state equality; `useFormState` accepts custom `isEqual`)
- Context: `FormProvider control={form.control}` + `useFormContext<T>()`; hooks accept optional `control` and fall back to the nearest provider

Memoize consumers that only take `control` so parent `useForm` re-renders do not force child updates when the selected slice is unchanged.

### Form context (`FormProvider`)

```tsx
<FormProvider control={form.control}>
  <ChildFields />
</FormProvider>
```

```ts
useController<Values, 'email'>({ name: 'email' })
useWatch<Values, 'email'>({ name: 'email' })
useFormState<Values, boolean>({ selector: (s) => s.isSubmitting })
const control = useFormContext<Values>()
```

Explicit `control` still works and overrides a provider. Missing control/provider throws a named error. See `docs/form-context.md`.

### Controlled components (`useController`)

Prefer `register()` for native inputs. Use `useController({ control, name })` for value-based custom controls:

```ts
const { field, fieldState } = useController({
  control: form.control,
  name: 'profile.birthDate',
})

field.onChange(nextDate) // direct value, not a DOM event
```

Optional `parse` / `format` map display ↔ stored types. `disabled` is UI-only (value remains in state/submit). Accessibility: `field.id`, `field.errorId`, aria props. `fieldState` exposes `error`, `invalid`, `touched`, `dirty` — not form-level `isValidating` (use `useFormState` for that).

See `docs/controlled-components.md` and `src/examples/ControlledFieldsForm.tsx`.

### Type definitions

- `FieldPath<T>` — flat keys + nested `'a.b.c'` paths into plain objects (optional objects still expand)
- `OptionalFieldPath<T>` — paths that may be absent; used to type-restrict destructive `unregister`
- `FieldPathValue<T, P>` — value type at path `P`
- `DeepPartial<T>` — recursive partial for plain objects; arrays/atomics stay shallow
- `FieldErrors` / `FieldTouched` / `FieldDirtyMap` — `Partial<Record<FieldPath<T>, …>>`
- `FieldRules<T>` — rules keyed by path with correctly inferred leaf value types

## `setValue` / `setValues` / reset

- `setValue('address.city', value)` writes immutably via path utilities (sibling keys preserved).
- `setValues(partial)` deep-merges plain objects; arrays/atomics replace; `undefined` keys in the partial are **skipped**.
- `reset()` restores deep-cloned defaults and clears native file inputs.
- `reset(partial)` deep-merges into defaults (updates stored defaults unless `keepDefaultValues`).
- `resetField('address.city')` restores one leaf, clears that path’s error/touched, and clears a native file input when present.
- `keepValues: ['address.city']` accepts nested paths.

## Validation lifecycle

1. Field `rules` (path-keyed) run in declaration order (`firstError` default, or `all` via `criteriaMode`).
2. Legacy `fieldValidators` run next for that path (`source: 'field'`).
3. Form-level `validate` runs; messages for a path **override** field-level messages (`source: 'form'`).
4. Resolver errors are lowest precedence (`source: 'resolver'`).
5. Backend/`setErrors` apply after submission (`manual` by default, or `server` when requested).
6. Modes / reValidateMode unchanged from flat forms.
7. Async: form-wide generation + **per-path** field generations so concurrent nested field validates do not cancel each other. Reset/unmount invalidates in-flight work.

See `.ai/skills/validation.md` for rule semantics.

## Submission lifecycle

Unchanged flow; touches registered paths + leaf paths; focuses first error by registration order (nested paths supported). Field/error ids encode path segments with dots preserved so `address.city` never collides with `address-city`.

## Accessibility

- `register` supplies `id`, `name` (dot path), `aria-invalid`, `aria-describedby`
- Labels: `htmlFor={getFieldId('address.city')}`; errors: `id={getErrorId('address.city')}`
- Radio options: distinct element ids, shared field name and error id

## Usage examples

See `src/examples/LoginForm.tsx`, `RegistrationForm.tsx`, nested `ProfileForm.tsx`, `FileUploadForm.tsx`, `ControlledFieldsForm.tsx`, `ContextProfileForm.tsx`, `ConditionalCompanyForm.tsx`, `PasswordQualityForm.tsx`, `BatchedAddressForm.tsx`, and `DevToolsInspectorForm.tsx`.

## Known limitations (deferred)

- Nested arrays inside field-array items are **not** supported
- No built-in Zod dependency; use `FormResolver` or `standardSchemaResolver` from `src/resolvers/standard-schema`
- Unsupported mode names (`onTouched`, `all`) are intentionally omitted
- `createFormStore`, `FormStore`, and `getControlInternals` are internal (not public barrel exports)
- Context generics are compile-time assertions only (not runtime-verified)
- No public `isRegistered` subscription API
- Structured errors: `errors` is the string view; `errorDetails` is canonical (`docs/structured-errors.md`)
- Built-in i18n catalogs are implemented (`docs/internationalization.md`); no translation-library adapter. Catalog identity changes do not rewrite existing errors or auto-revalidate. Locale switchers should call `validate()` after catalogs commit when errors are already visible. `form.refreshErrorMessages()` is a documented future proposal only (built-in type/params rewrite; cannot translate resolver/server/custom strings).
- DevTools is a separate package entry (`./devtools`); core must not export it

## Extension guidelines

- Prefer adding pure helpers in `pathUtilities.ts` / `utilities.ts` over growing `useForm.ts`
- Prefer `rules` over new `fieldValidators` usage
- Array path support must ship with full typing, dirty/reset/validation tests — do not add partial array sugar

## Testing expectations

- Hook: `useForm.test.ts` (includes nested + file + unregister `describe` sections)
- Registration helpers: `fieldRegistration.test.ts`
- Store: `formStore.test.ts`
- Subscriptions: `subscriptions.test.tsx` (render-count / Strict Mode / cleanup)
- Controller: `useController.test.tsx`
- Context: `FormProvider.test.tsx`
- Path utilities: `pathUtilities.test.ts`
- File helpers: `fileHelpers.test.ts`
- Form utilities: `utilities.test.ts`
- Validation modules: matching `*.test.ts` beside each file
- Compile-time: `paths.type-test.ts`, `files.type-test.ts`, `subscriptions.type-test.ts`, `useController.type-test.ts`, `formContext.type-test.ts`, `useFieldArray.type-test.ts`, `fieldRegistration.type-test.ts`, `errors.type-test.ts`, `validation/rules.type-test.ts`
