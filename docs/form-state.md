# Form state and subscriptions

`useForm` keeps a single external store. The component that calls `useForm` still re-renders whenever form state changes (compatible with existing screens). Child components should subscribe narrowly.

## Stable control handle

```ts
const form = useForm({ defaultValues: { email: '', age: 0 } })

form.control // stable across renders — pass this (or `form`) into subscription hooks
```

## `useWatch`

```ts
const email = useWatch(form, 'email')
const values = useWatch(form) // entire values object
```

Re-renders only when the watched value changes by `Object.is`.

## `useFormState`

```ts
const isSubmitting = useFormState(form, (state) => state.isSubmitting)

const slice = useFormState(
  form,
  (state) => ({ dirty: state.isDirty, valid: state.isValid }),
  (a, b) => a.dirty === b.dirty && a.valid === b.valid,
)
```

The selector receives a snapshot that includes derived `dirtyFields`, `isDirty`, and `isValid`.

## Root validation errors

`form.rootError` is a pathless resolver/schema validation error. `form.rootErrorDetails` is the structured form. Both contribute to `isValid` and are separate from `submitError`. See `docs/structured-errors.md`.

## `useFieldState`

```ts
const { error, errorDetails, invalid, touched, dirty, isValidating } = useFieldState(form, 'email')
```

`isValidating` currently mirrors the form-level flag and is `true` only while validators/resolvers execute. Pending debounce delay from `rules.async` is **not** counted as validating (see `docs/async-validation.md`). Per-field pending flags are not exposed yet.

## Avoiding parent-driven re-renders

Wrap subscription-only children in `memo` and depend on `form.control` (stable) so parent `useForm` updates do not re-render children when their selected slice is unchanged.

## Controlled components

See `docs/controlled-components.md` for `useController` (custom value-based controls, parse/format, file uploaders).

## Form context

See `docs/form-context.md` for `FormProvider` / `useFormContext`. Pass `form.control` into the provider — never the full changing form return object.

## Field arrays

See `docs/field-arrays.md` for `useFieldArray`, indexed paths (`products.0.name`), and stable keys outside form values.

## Schema resolvers

See `docs/schema-resolvers.md` for `FormResolver`, input vs output types, and `resolverContext`.

## Async default values

Optional `loadDefaultValues` with complete sync fallback. See `docs/async-default-values.md` for preserve-dirty merge, reload, and submission blocking.

## Conditional fields

Optional fields can unmount without deleting required `TInput` properties. See `docs/conditional-fields.md` for `unregister`, `shouldUnregister`, and inactive vs preserved values.

## Validation message catalogs

`validationMessages` / `fieldLabels` live in `optionsRef`. Changing them does not notify subscribers until a later validation writes new error details. See `docs/internationalization.md`.

See `docs/imperative-api.md` for non-reactive snapshots (`getValues`, `getDirtyValues`, `getFieldState`). See `docs/batching.md` for atomic notifications. The store defers subscriber notification while `form.batch()` is open.

## SSR

The store’s `getServerSnapshot()` returns the same state reference until `setState` replaces it. Selector hooks cache selected snapshots with equality so repeated SSR reads stay stable. Forms are still primarily client-mounted in this app; a dedicated SSR hydration test target is not claimed yet.

`createFormStore` / `FormStore` are **internal** (not re-exported from the public barrel). Consumers should only hold `FormControl`.
