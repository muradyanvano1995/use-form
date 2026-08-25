# Validation

## Error shape

Field errors are a partial string map keyed by `FieldPath` (`form.errors`). Canonical structured errors live on `form.errorDetails`:

```ts
type FieldErrors<T> = Partial<Record<FieldPath<T>, string>>
type FieldErrorDetails<T> = Partial<Record<FieldPath<T>, FieldError>>
```

`errors[path]` is always `errorDetails[path].message`. See `docs/structured-errors.md`. Built-in messages can be customized per form; see `docs/internationalization.md`. Catalog identity changes do not rewrite existing errors and do not auto-revalidate (automatic core revalidation would rerun async validators and resolvers). Applications with a locale switcher should revalidate after catalogs commit when errors are already visible. `form.refreshErrorMessages()` is proposed, not implemented.

Nested example: `{ 'address.city': 'City is required' }`.

Form-level submission problems that are not field-specific use `submitError: string | undefined`.
Pathless resolver/schema failures instead use `rootError`. `rootError` blocks `validate()`, submit, and `isValid`, and is available before submit; it is not an API failure.

Empty strings are treated as absence (`normalizeErrors` / `mergeErrors` drop them). Unsafe path segments (`__proto__`, etc.) are rejected/dropped when normalizing backend maps.

## Sources of truth (precedence)

Client validation pipeline (one snapshot, sequential):

1. **`rules`** — declarative per-field rules (preferred), including nested/indexed paths. Declaration order; `criteriaMode` is `firstError` (default) or `all`. Source: `rule`.
2. **`fieldValidators`** — legacy per-field validators; run after `rules` for the same path. Source: `field`.
3. **`validate`** — whole-form sync/async function. Messages for a given path **override** field-level errors. Source: `form`.
4. **`resolver`** — optional schema-library-neutral transform/validate. Same-path messages are **overridden** by field/form results above. Source: `resolver`.
5. **Backend / `setErrors`** — applied from `onSubmit` helpers after a successful client validation pass. Default source `manual`; pass `{ source: 'server' }` for backend mapping.

See `docs/schema-resolvers.md` for input vs output types, context, AbortSignal, and Standard Schema adapter notes.

## Validation modes

Prefer `ValidationMode` / `ReValidateMode` const objects. Manual `validate()` / `validateField(path)` always run regardless of mode.

## Dependent fields

`dependencies` is a typed dependent → sources map. A source update revalidates transitive dependents once (cycles are safe). Default `dependencyMode: 'whenTouched'` requires the dependent to be touched, errored, submitted, or previously validated; `'always'` validates immediately. `shouldValidate: false` skips dependency work. Exact indexed paths are positional: callers must regenerate dependencies after field-array insert/remove/move; no wildcards.

## `ValidationRule` contract

```ts
type ValidationRule<TValue, TValues> = (
  value: TValue,
  values: Readonly<TValues>,
  context?: ValidationRuleContext<TValues, string>,
) => ValidationIssueInput | Promise<ValidationIssueInput>
```

Two-argument validators remain assignable. Optional `context` provides `name`, `reason`, `signal`, and `criteriaMode`.

Nested rules receive the leaf value and the full nested values object:

```ts
rules: {
  'address.city': [
    (city, values) => {
      // city: string; values: Readonly<FormValues>
      return city.length >= 2 ? undefined : 'Too short'
    },
  ],
}
```

`rules.matchesField(path)` reads the other field via path utilities (supports nested paths).

## Debounced async (`rules.async`)

Use `rules.async` for expensive remote checks. Metadata lives in a private WeakMap. Ordinary async validators without the helper stay immediate. Change/dependency debounce; blur/manual/submit immediate. `isValidating` excludes pending debounce delay. Waiting clears validation-source issues only; `manual` is kept; `server` clears on value change. No caching APIs. See `docs/async-validation.md` and `docs/structured-errors.md`.

## Async default values

Require complete sync `defaultValues` plus optional `loadDefaultValues`. Expose `isLoadingDefaults`, `isDefaultsReady`, `defaultValuesError`, and `reloadDefaultValues`. Default merge is `preserveDirty`. See `docs/async-default-values.md`.

## Conditional fields / unregister

`shouldUnregister` defaults to `false`. Explicit `unregister(path)` removes registration metadata and preserves the value unless `keepValue: false` (optional paths only). Inactive optional fields skip field rules and are omitted from submit/resolver input. Unrelated `rootError` is not cleared. See `docs/conditional-fields.md`.

## Batching

`form.batch(callback, { shouldValidate? })` is synchronous. Notifications wait for the outermost transaction. Validation uses final values; debounce timers are scheduled once per field and are not awaited unless the batch forces a complete `manual` cycle. See `docs/batching.md`.

## Built-in `rules`

Full Storybook inventory: `Validation/Built-in rules` (catalog + live example).

| Rule                                                                                                  | Notes                                                                   |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `required` / `email` / length / min-max / pattern / `accepted` / `sameAs` / `matchesField` / `custom` | Existing semantics; empty-skipping where documented                     |
| `async(validator, options?)`                                                                          | Explicit async rule with optional `debounce` / `validateEmpty` / `type` |
| `fileSize(maxBytes)`                                                                                  | `File \| null \| File[]`; all files must be ≤ max; skips `null`/`[]`    |
| `fileType(mimes)`                                                                                     | Uses `File.type` (empty MIME fails); **not** a security boundary        |
| `fileExtension(exts)`                                                                                 | Case-insensitive; optional leading dots; last segment only              |
| `maxFiles` / `minFiles`                                                                               | For `File[]` (`minFiles` does not skip empty — use for required multi)  |
| `minItems` / `maxItems`                                                                               | Array length for field arrays (prefer over string length rules)         |
| `eachFile(rule)`                                                                                      | Per-file combinator; `all` mode collects `{ fileIndex }` issues         |

Empty values for optional file fields: `null` and `[]` (`isEmptyValue` treats empty arrays as empty).

> Client-side file rules improve UX only. Always re-validate type, size, content, and authorization on the server.

## Race safety

- Whole-form validation uses a form generation counter.
- Field validation uses a **per-path** generation map so concurrent nested fields do not cancel each other.
- Starting a form-wide validate invalidates in-flight field writes; reset/unmount invalidates all.
- Structural `useFieldArray` mutations bump generations so remapped indices cannot receive stale async results.
- Per-field debounce timers cancel on newer values, blur/manual/submit flush, reset, unmount, unregister, and array structural changes.
- Field validators receive `AbortSignal` when possible; `AbortError` is never turned into field errors.
- Resolver cycles use `AbortSignal` when possible; stale resolver output cannot submit.
- Unexpected async rejections are not turned into validation messages.

## Field arrays and dynamic item rules

Concrete indexed rules (`'products.0.name'`) work when those paths exist. Wildcard `products.*.name` is **not** implemented — use form-level `validate` for dynamic items. See `docs/field-arrays.md`.

## Schema libraries (Zod, etc.)

Prefer the public `FormResolver` contract (`resolver` + optional `resolverContext`) or `standardSchemaResolver` from `src/resolvers/standard-schema` for Standard Schema v1–compatible schemas. Map library-specific issues to path-keyed `FieldErrors<TInput>` inside a custom resolver. Do not add concrete schema packages as core runtime dependencies.

## Adding a new built-in rule

1. Implement in `builtInRules.ts` with tight value generics.
2. Skip empty values unless the rule is `required` / `accepted`.
3. Add a stable `BuiltInRuleType` / `BuiltInRuleParams` entry and a default English catalog message.
4. Support an optional custom message (string or factory) + default.
5. Add unit tests + type-test cases when value constraints matter.
6. Update this skill file and `docs/internationalization.md`.
