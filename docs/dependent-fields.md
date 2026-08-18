# Dependent fields

Use `dependencies` when changing one field should revalidate another field whose rule reads it.

```ts
const form = useForm({
  defaultValues: { password: '', confirmPassword: '' },
  dependencies: { confirmPassword: ['password'] },
  rules: {
    confirmPassword: [rules.matchesField('password', 'Passwords must match')],
  },
})
```

The map is **dependent → source**. It supports typed nested paths:

```ts
dependencies: {
  'address.postalCode': ['address.country'],
}
```

Changing an ancestor also affects nested sources, so changing `address` affects a dependency on `address.country`. Dependencies are transitive; cycles are safe and each dependent validates at most once per change. Dependent validation replaces that field’s validation issues atomically and honors `criteriaMode`. Manual/server issues follow `docs/structured-errors.md`. Dependent cycles use the latest `validationMessages` / `fieldLabels` snapshot (`docs/internationalization.md`).

## When validation runs

`dependencyMode` defaults to `'whenTouched'`. A dependent is revalidated only after it has been touched, has an error, was previously validated, or the form was submitted. This avoids showing an error for an untouched confirmation field while typing the source field.

Set `dependencyMode: 'always'` to revalidate every affected dependent immediately. `setValue(..., { shouldValidate: true })` and `setValues(..., { shouldValidate: true })` also force dependency validation. `shouldValidate: false` skips it.

`setValues` plans one dependency batch for all changed paths. If it runs full-form validation, that covers dependents and no separate dependency batch is scheduled.

Dependents that use `rules.async` with `debounce > 0` schedule according to the dependency reason; submission and manual validation still bypass debounce. See `docs/async-validation.md`.

Async default loading does not rewrite dependency maps. See `docs/async-default-values.md`.

Removed/inactive optional dependents are skipped. Unregistering a field cancels pending dependent validation targeting it without mutating the consumer `dependencies` map. See `docs/conditional-fields.md`.

## Field arrays

Exact indexed paths such as `items.0.total` are positional. The package does not reindex the consumer-provided `dependencies` configuration after an array insert, remove, or move. Regenerate your dependency map when the array structure changes. Wildcards are not supported.

Batched source updates revalidate each eligible dependent once from the final values snapshot. See `docs/batching.md`.
