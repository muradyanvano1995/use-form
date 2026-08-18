# Structured errors

Phase 10 adds a canonical structured error model while keeping the existing string API.

`form.errors.email` remains `string | undefined`. New consumers that need codes, sources, or multiple issues read `form.errorDetails.email`.

## Dual view

| API                       | Shape                     | Role                                          |
| ------------------------- | ------------------------- | --------------------------------------------- |
| `form.errors[path]`       | `string \| undefined`     | Primary display message (backward compatible) |
| `form.errorDetails[path]` | `FieldError \| undefined` | Canonical structured error                    |
| `form.rootError`          | `string \| undefined`     | Pathless primary message                      |
| `form.rootErrorDetails`   | `FieldError \| undefined` | Canonical pathless error                      |
| `fieldState.error`        | `string \| undefined`     | Primary display message                       |
| `fieldState.errorDetails` | `FieldError \| undefined` | Canonical structured error                    |

There is one internal error map. String views are derived:

```ts
form.errors[path] === form.errorDetails[path]?.message
form.rootError === form.rootErrorDetails?.message
fieldState.error === fieldState.errorDetails?.message
```

Do not store two independently mutable error states. Clearing, reset, unregister, and field-array reindex always go through the structured map.

Ordinary rendering should keep using the string:

```tsx
{
  form.errors.email ? <p>{form.errors.email}</p> : null
}
```

## Types

```ts
type ErrorSource = 'rule' | 'field' | 'form' | 'resolver' | 'server' | 'manual'

type FieldIssue = {
  message: string
  type?: string
  source: ErrorSource
  params?: Readonly<Record<string, unknown>>
}

type FieldError = {
  message: string
  type?: string
  source: ErrorSource
  params?: Readonly<Record<string, unknown>>
  issues: readonly FieldIssue[]
}
```

Rules:

- `message` is always the primary display message (`issues[0].message`).
- `issues` is never empty. An empty structured error is invalid and becomes absence.
- In `firstError` mode, `issues` has one item.
- In `all` mode, `issues` contains every collected failure in declaration order.
- `params` are frozen clones. Prototype keys (`__proto__`, `prototype`, `constructor`) are dropped.
- Public objects are frozen. Callers must not mutate `issues` or `params`.

`type` is a stable machine-readable code (`required`, `minLength`, `unique`). It is not a parsed human string.

## Criteria mode

```ts
useForm({
  defaultValues,
  criteriaMode: 'firstError', // default
})
```

| Mode                   | Field rules                    | `errors[path]` | `errorDetails[path].issues`      |
| ---------------------- | ------------------------------ | -------------- | -------------------------------- |
| `firstError` (default) | Stop after the first failure   | First message  | One issue                        |
| `all`                  | Evaluate every applicable rule | First message  | Every failure, declaration order |

Submission is blocked when any issue exists. Criteria mode does **not** accumulate historical errors across values. A new validation cycle replaces the field’s validation issues.

Async rules are awaited in declaration order. Promise completion order cannot reorder issues. Aborted or stale runs do not commit.

## Rule results

Existing rules still return `string | undefined`. Advanced custom rules may return:

```ts
return {
  message: 'Password needs a number',
  type: 'requiresNumber',
  params: { minDigits: 1 },
}
```

The executor assigns `source: 'rule'` (or `field` for legacy `fieldValidators`). Ordinary rules cannot impersonate `server`.

Empty messages are treated as success.

## Built-in rule metadata

Display messages default to the English catalog. Structured `type` / `params` are attached without parsing those strings. See `docs/internationalization.md`.

| Rule                         | `type`                       | `params`                                  |
| ---------------------------- | ---------------------------- | ----------------------------------------- |
| `required`                   | `required`                   | —                                         |
| `email`                      | `email`                      | —                                         |
| `minLength(n)`               | `minLength`                  | `{ min: n }`                              |
| `maxLength(n)`               | `maxLength`                  | `{ max: n }`                              |
| `length(n)`                  | `length`                     | `{ length: n }`                           |
| `min(n)` / `max(n)`          | `min` / `max`                | `{ min }` / `{ max }`                     |
| `pattern`                    | `pattern`                    | `{ source, flags }` (not a live `RegExp`) |
| `accepted`                   | `accepted`                   | —                                         |
| `sameAs`                     | `sameAs`                     | none (expected value is not copied)       |
| `matchesField(path)`         | `matchesField`               | `{ field: path }`                         |
| `fileSize(n)`                | `fileSize`                   | `{ maxBytes: n }`                         |
| `fileType` / `fileExtension` | `fileType` / `fileExtension` | allowed lists                             |
| `maxFiles` / `minFiles`      | `maxFiles` / `minFiles`      | `{ max }` / `{ min }`                     |
| `minItems` / `maxItems`      | `minItems` / `maxItems`      | `{ min }` / `{ max }`                     |
| `eachFile`                   | inner rule type              | inner params plus `{ fileIndex }`         |
| `rules.async(..., { type })` | the provided `type`          | —                                         |

Params are cloned before freeze. Nested plain objects and arrays are deep-cloned and frozen, including **cyclic** plain containers (visited-reference tracking; the consumer object is never frozen). `File`, `Blob`, `Date`, `Map`, `Set`, class instances, and functions are copied by reference and never frozen.

Duplicate detection encodes Dates by ISO time. Other host objects use a per-runtime reference tag: distinct `File`/`Blob`/`Map`/`Set`/class/function identities are never treated as equal. File contents are not read and class instances are not serialized.

Read snapshots with `form.getErrors()` / `form.getErrorDetails()` (`docs/imperative-api.md`). Root errors stay separate from those maps.

## Sources and precedence

| Producer                           | Source     |
| ---------------------------------- | ---------- |
| Built-in / custom field `rules`    | `rule`     |
| Legacy `fieldValidators`           | `field`    |
| Form-level `validate`              | `form`     |
| Resolver / Standard Schema         | `resolver` |
| `setError` / `setErrors` (default) | `manual`   |
| Backend mapping when requested     | `server`   |

Same-path precedence during one client pipeline snapshot (later wins):

1. Resolver (lowest)
2. Field rules, then field validators (declaration order; first or all per `criteriaMode`)
3. Form-level `validate` (highest in the pipeline)

Explicit `setError` / `setErrors` after that snapshot **replace** the current primary error for those paths. They do not infer `server` just because they run inside `onSubmit`.

```ts
form.setError('email', 'Email already exists', { source: 'server', type: 'unique' })
form.setErrors({ email: 'Email already exists' }, { source: 'server' })
```

Existing calls stay valid:

```ts
form.setError('email', 'Invalid email')
form.setErrors({ email: 'Invalid email' })
```

Revalidation replaces validation-source issues (`rule`, `field`, `form`, `resolver`) for the paths that ran. Criteria mode does not keep stale issues from a previous value.

## Debounce and server errors

Scheduling a debounced rule clears **validation-source** issues for that path (`rule`, `field`, `form`, `resolver`) so a previous remote failure does not linger while waiting.

- `manual` issues are kept until revalidation commits or the field is cleared/reset/unregistered.
- `server` issues describe the previous submitted value. Editing the field (or an ancestor) clears them. Merely waiting for a debounce timer does **not** erase an unrelated manual error.

## Root errors

`rootError` is still the pathless primary string. `rootErrorDetails` is the structured form.

Pathless Standard Schema issues can produce multiple root issues in `all` mode. `clearRootError()` clears both views. Root errors are never focus targets. They still block `isValid` and submit.

## Field state and controllers

`useFieldState` / `useController` expose `error`, `errorDetails`, and `invalid`. `invalid` is true when canonical details exist.

Controllers subscribe to their selected field’s details by reference. Unrelated structured errors do not rerender them.

## Field arrays

A full `FieldError` moves with the logical item on insert/remove/move/swap. Issue lists and params stay intact. Array-level details remain at the array path. Removed item details disappear. Internal field-array keys never enter error metadata.

## Unregister and async defaults

Unregister clears both views through the canonical map. Parent unregister removes descendant details. `rootErrorDetails` is unchanged unless explicitly cleared.

Async defaults follow the existing preserve-dirty / replace policy for structured details. `validateOnDefaultsLoad` writes structured errors. Loading failures stay on `defaultValuesError`, not field errors.

## Accessibility

Keep using `getErrorId(path)` for the shared field error id.

Radio options share a field **name** and error id, but each option has its own element id (`formId-field-path-option-encodedValue`, or an explicit `id`). `pro.plan` and `pro-plan` do not collide. Focus-on-error uses a connected radio option.

For multiple issues, point `aria-describedby` at a list of messages:

```tsx
<ul id={form.getErrorId('password')}>
  {form.errorDetails.password?.issues.map((issue) => (
    <li key={`${issue.type}-${issue.message}`}>{issue.message}</li>
  ))}
</ul>
```

## Performance

- `firstError` still stops after the first field-rule failure.
- `all` runs only applicable rules for the current value, sequentially, and commits the field’s issues atomically.
- Exact duplicate issues (`source` + `type` + `message` + stable params) are dropped. Distinct params are kept.
- Unrelated subscribers are not notified per issue.

## Example

See `src/examples/PasswordQualityForm.tsx` and `src/examples/LocalizedRegistrationForm.tsx`.

## Known limitations

- Form-level `validate` still returns a string map. Those messages become one `form` issue per path.
- Resolver adapters that only return string maps produce one `resolver` issue per path. Standard Schema can collect multiple issues in `all` mode.
- `eachFile` collects every applicable inner failure in `all` mode (with `fileIndex` params) and stops at the first failure in `firstError`.
- Indexed optional array items (`tags?: string[]` → `tags.0`) are not independently destructively removable. Unregister the optional array.
