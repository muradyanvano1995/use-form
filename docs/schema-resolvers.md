# Schema resolvers

Phase 5 adds a schema-library-neutral resolver contract so forms can validate and transform values without coupling the core package to Zod, Yup, Valibot, or similar libraries.

## Purpose

- Keep **live form state** as input-shaped values (`TInput`).
- Run an optional **resolver** during validation / submit.
- Pass **transformed output** (`TOutput`) to `onSubmit` only after a successful validation cycle.
- Support typed **resolver context** (`TContext`) without using React context.

## Generics

```ts
useForm<TInput extends FormValues, TOutput = TInput, TContext = undefined>(options)
```

| Generic    | Role                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `TInput`   | `defaultValues`, `values`, `setValue`, `register`, controllers, field arrays, errors / errorDetails |
| `TOutput`  | Successful `onSubmit` payload (defaults to `TInput`)                                                |
| `TContext` | Value passed as `resolverContext` into the resolver                                                 |

Existing `useForm<TValues>({ ... })` calls remain valid (`TOutput` and `TContext` default).

## Core contract

```ts
type FormResolver<TInput, TOutput = TInput, TContext = undefined> = (
  values: Readonly<TInput>,
  options: ResolverOptions<TInput, TContext>,
) => ResolverResult<TInput, TOutput> | Promise<ResolverResult<TInput, TOutput>>

type ResolverResult<TInput, TOutput> =
  | { success: true; values: TOutput }
  | { success: false; errors: FieldErrors<TInput>; rootError?: string }
```

Rules:

- Discriminated success / failure — do **not** throw for normal field validation failures.
- Unexpected infrastructure / schema crashes may throw or reject.
- Failure must not include transformed `values`.
- Do not mutate the live form store; treat `values` as readonly (immutable store snapshot; Files keep identity).
- `names` is an optional **scope hint** for field-oriented validation — not a guarantee of partial schema execution.
- `signal` is an optional `AbortSignal`. Ignoring it is allowed; generation checks still drop stale results. Do not map `AbortError` to field errors.

## Options

```ts
useForm({
  defaultValues,
  resolver,
  resolverContext: { minimumAge: 18 },
  rules,
  validate,
  onSubmit: async (values) => {
    // values: TOutput
  },
})
```

Updating `resolverContext` does **not** reset values and does **not** auto-validate.

## Validation pipeline and precedence

Resolvers **coexist** with `rules`, `fieldValidators`, and form-level `validate`.

Sequential pipeline against one immutable input snapshot:

1. Field `rules` / `fieldValidators`
2. Form-level `validate` (overrides field messages for the same path — existing contract)
3. Resolver

Same-path precedence in the merged client error map (highest last):

```text
resolver  <  field rules / fieldValidators  <  form-level validate
```

Manual / backend `setErrors` remain outside this pipeline and are applied after a successful client pass (unchanged).

One validation cycle commits errors once. Sources do not race on promise completion order.

Transformed output is used for submit **only** when the merged error set is empty. If field/form errors exist, resolver success output is discarded for that cycle.

## Whole-form vs field validation

`form.validate()` / submit run the full pipeline and may produce `TOutput`.

`form.validateField(name)`:

- Runs field + form messages for that path first.
- If already invalid, skips the resolver (field/form win).
- Otherwise runs the resolver with `names: [name]` and applies only that path’s resolver error.
- Unrelated resolver issues are ignored for the field update.

## Async races and cancellation

- Each form validation cycle aborts the previous resolver `AbortController` (when present) and bumps generations.
- Reset, unmount, and structural field-array mutations invalidate pending work.
- Stale resolver success cannot submit transformed data.
- Stale resolver failure cannot overwrite newer errors.
- `isValidating` settles when the active generation completes or is superseded.

## Error paths

Resolver errors use the same path-keyed `FieldErrors<TInput>` shape, including nested and indexed paths:

```ts
{
  email: 'Invalid email',
  'profile.city': 'City is required',
  'products.0.name': 'Required',
  products: 'Add at least one product',
}
```

Runtime normalization drops empty messages and unsafe segments (`__proto__`, `prototype`, `constructor`). Canonical structured details live on `errorDetails` / `rootErrorDetails`; string maps remain the derived view. See `docs/structured-errors.md`.

The Standard Schema adapter copies only message, path, and a stable `code`/`type` when present. It does not copy arbitrary library issue objects into form state.

### Pathless issues and `rootError`

Schema issues without a usable field path are validation failures, not submission/API errors. They become `form.rootError`, block `validate()`, `handleSubmit`, and `isValid`, and can be rendered before submit. This is distinct from `submitError`, which is for an API/submission failure.

## Standard Schema adapter

`standardSchemaResolver(schema)` adapts a Standard Schema v1–compatible object (`schema['~standard'].validate`) without importing a concrete library.

```ts
import { standardSchemaResolver } from '@muradyanvano/use-form/resolvers/standard-schema'
```

The adapter is **not** exported from the core package entry. It lives at `src/resolvers/standard-schema` and the published subpath `./resolvers/standard-schema`.

- Issue paths are joined with dots.
- Missing, empty, or symbol-containing issue paths become `rootError`; the first pathless message wins.
- An empty issue list or malformed schema result is a safe blocking failure, never a successful validation.
- No Zod/Valibot runtime dependency in the core or adapter bundles.
- Compatibility is limited to the documented contract + tests with hand-rolled schemas.

## Example

See `src/examples/ResolverRegistrationForm.tsx`.

## Known limitations

- No first-party Zod/Yup/Valibot adapters beyond Standard Schema compatibility.
- `names` does not force partial schema execution.
- Resolver output never becomes live `form.values`.
- Debounced async field rules use `rules.async` (see `docs/async-validation.md`). Resolver execution itself is not auto-debounced.
- Async defaults load into `TInput` before resolvers run on submit/validate (see `docs/async-default-values.md`).
- Inactive optional fields are omitted from resolver input after `shouldUnregister` / `keepValue: false` (see `docs/conditional-fields.md`).
- Resolver and Standard Schema messages are not rewritten by `validationMessages`. Localize the schema or adapter. See `docs/internationalization.md`.

## Related

- `.ai/skills/validation.md`
- `docs/package-roadmap.md`
- `docs/field-arrays.md` (structural mutations invalidate pending validation)
