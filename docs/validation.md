# Validation guide

Client validation for `useForm` covers built-in `rules`, form-level `validate`, optional schema `resolver`s, modes, async race safety, debounced remote field checks, structured errors (`docs/structured-errors.md`), and per-form message catalogs (`docs/internationalization.md`).

Primary references:

- `.ai/skills/validation.md` — precedence, modes, built-in rules
- `docs/async-validation.md` — `rules.async`, debounce policy, cancellation
- `docs/schema-resolvers.md` — `FormResolver`, input vs output, Standard Schema adapter
- `docs/field-arrays.md` — array-level rules and structural invalidation
- `docs/internationalization.md` — per-form catalogs, labels, and locale changes
- `docs/imperative-api.md` — non-reactive `getErrors` / `getFieldState`
- `docs/batching.md` — one validation pass after grouped mutations

Backend / manual `setErrors` remain separate from the client pipeline and run after a successful client pass inside `onSubmit` helpers.

## Root validation errors

Resolvers may return `rootError` for a schema issue with no usable field path. It is exposed as `form.rootError`, blocks `validate()`, submit, and `isValid`, and is available for accessible UI before submit. It is not `submitError`: use `submitError` only for submission/API failures. The Standard Schema adapter uses the first pathless issue message in `firstError` mode and can collect multiple root issues in `all` mode. See `docs/structured-errors.md` for `rootErrorDetails`.

`clearErrors()` clears field errors and `rootError`. `clearRootError()` clears only `rootError`. `setErrors()` merges field messages and does not erase `rootError`. Field-only validation does not clear an unrelated existing `rootError`. Successful complete validation clears it. `reset()` clears it unless `keepErrors` is set. First-error focus uses field errors only (never a synthetic root target).

## Debounced async rules

Use `rules.async(validator, { debounce, validateEmpty, type })` for expensive remote checks. Ordinary `async` validators without this helper stay immediate. See `docs/async-validation.md`.

## Async default values

Complete sync `defaultValues` plus optional `loadDefaultValues`. Loading state is separate from validation. See `docs/async-default-values.md`.

## Conditional fields

Removed optional fields skip field rules and are omitted from resolver/submit input. Preserved unregistered fields still validate. See `docs/conditional-fields.md`.

## Internationalized messages

Built-in English strings remain the default. Pass `validationMessages` and optional `fieldLabels` to customize them per form. Per-rule custom messages still win. Catalogs do not translate custom, async, form-level, resolver, or server errors. See `docs/internationalization.md`.

## Dependent fields

Configure `dependencies` as dependent → sources to revalidate cross-field rules when a source changes. The default `dependencyMode: 'whenTouched'` avoids premature messages for untouched dependents; use `'always'` for immediate revalidation. See `docs/dependent-fields.md`.
