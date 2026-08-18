# Async validation (debounced field rules)

Phase 7 adds **explicit** debounced async field rules via `rules.async`. Ordinary async validators remain immediate.

## Ordinary async vs `rules.async`

```ts
// Immediate — runs as soon as validation runs (no debounce metadata)
rules: {
  code: [async (value) => checkCode(value)],
}

// Debounced on change/dependency — metadata via WeakMap, not form state
rules: {
  username: [
    rules.required(),
    rules.minLength(3),
    rules.async(
      async (username, _values, { signal }) => {
        const available = await checkUsername(username, { signal })
        return available ? undefined : 'Username is already taken'
      },
      { debounce: 400, validateEmpty: false },
    ),
  ],
}
```

Do **not** detect async by `validator.constructor.name`. A function may return a Promise without being declared `async`. Only `rules.async` / `createAsyncRule` attaches scheduling metadata.

## Public API

```ts
type AsyncRuleOptions = {
  debounce?: number // ms; default 0 = immediate; invalid values throw
  validateEmpty?: boolean // default false — skip remote for empty values
  type?: string // optional structured error type
}

type ValidationReason = 'change' | 'blur' | 'submit' | 'manual' | 'dependency'

type ValidationRuleContext<TValues, TName extends string = string> = {
  name: TName
  values: Readonly<TValues>
  reason: ValidationReason
  signal?: AbortSignal
}
```

Exported from the package entry: `AsyncRuleOptions`, `ValidationReason`, `ValidationRuleContext`, and `rules.async`.

`createAsyncRule` is the low-level factory (like `createRule`) for composing typed async rules outside the `rules` namespace. Prefer `rules.async` in normal form configs. Both attach the same WeakMap metadata.

Scheduler internals, WeakMaps, and timer registries are **not** public.

## Debounce options

| Option          | Policy                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `debounce`      | Milliseconds. `0` = immediate. Negative / `NaN` / `Infinity` throw a configuration error.                                                                    |
| `validateEmpty` | Default `false`. Empty matches `isEmptyValue` (optional-rule semantics). Skipping empty clears the field error and does **not** keep a stale remote message. |

## Scheduling policy

| Reason                                | Debounce behavior                                                  |
| ------------------------------------- | ------------------------------------------------------------------ |
| Change                                | Wait for configured debounce                                       |
| Dependency                            | Wait for configured debounce                                       |
| Blur                                  | Cancel timer; validate immediately when blur mode requires it      |
| Manual `validateField` / `validate()` | Cancel timer(s); validate immediately                              |
| Submit                                | Cancel timers; validate immediately (still awaits real async work) |
| Reset / unmount / control teardown    | Cancel without validating                                          |
| Field-array structural change         | Cancel affected indexed schedules                                  |

If blur mode does **not** validate on blur, a pending change debounce stays scheduled.

Per-field timers are isolated (username vs email). Nested and indexed paths use the canonical path key.

## Sync-before-async

For `[required, minLength, rules.async(...)]` on change:

1. Synchronous (and non-debounced) rules run immediately.
2. On sync failure: show that error, do not schedule remote, cancel older remote work.
3. On sync success: clear **validation-source** issues for that path (`rule` / `field` / `form` / `resolver`) and schedule one field-level timer. `manual` issues stay until the remote result commits. `server` issues are cleared when the value changes, not merely because a timer is waiting.

See `docs/structured-errors.md` for sources and `criteriaMode`. 4. When the timer fires: run the full field pipeline (including form `validate` / resolver when configured) with a values snapshot captured at schedule time.

In `all` mode, remaining applicable rules still run in declaration order after the timer. `firstError` still stops at the first failure.

## Multiple debounced rules

A field may include several `rules.async` entries, but they share **one** field-level delay. Conflicting `debounce` values throw a configuration error. After the timer, rules still run in declaration order (`firstError` or `all` per `criteriaMode`).

## Validation state

- `isValidating` is `true` only while validators/resolvers **execute**.
- Pending debounce delay is **not** represented by `isValidating`.
- No `isDebouncing` flag in this phase.

## Cancellation and AbortSignal

- New values cancel the field’s timer and abort the field’s `AbortController` when possible.
- Stale results (wrong generation / aborted) do not update errors or clear newer work.
- `AbortError` is never surfaced as a field message.
- Reset, unmount, whole-form validate/submit, field unregister, and field-array mutations cancel pending work.

## Dependencies

Dependency-triggered cycles use reason `'dependency'` and the same debounce policy. Source changes reschedule. Untouched / `always` modes are unchanged. `shouldValidate: false` still skips dependency revalidation. Submission bypasses debounce via the whole-form pipeline.

## Field arrays

Exact indexed paths (e.g. `products.0.code`) are supported. On structural mutation, pending timers for the array and its indexed children are cancelled (not remapped). Prefer cancel over moving closures. Stable array keys remain internal and unchanged.

## Resolvers

Resolver execution is **not** auto-debounced. Debounce applies only to `rules.async` field rules. Manual/submit validation remains immediate for the resolver pipeline. Resolver `AbortSignal` / generation behavior is unchanged.

## Root errors

Field-only debounced cycles update that field’s error and must not clear an unrelated `rootError`. Complete successful validation clears `rootError`. `setErrors` does not erase `rootError`. `clearErrors` clears field errors and `rootError`; `clearRootError` clears only `rootError`.

## Waiting during debounce

While a change/dependency debounce timer is pending:

- `isValidating` stays `false` (execution has not started)
- `isValid` may temporarily be `true` if validation-source issues were cleared after sync rules passed
- Submission remains safe: submit cancels timers and runs validation immediately
- Manual errors for that path are preserved while waiting; server errors are cleared on value change

Conflicting `debounce` durations on the same field are detected when scheduling/validating that field (`resolveFieldDebounceMs`), as early as practical without a separate config-time field registry.

Cross-field async validators that read other fields must declare `dependencies` so source changes reschedule the dependent. Snapshot-at-schedule-time means a dependent that is not rescheduled can see a stale sibling value.

## Caching

Not implemented. No `cache` / `dedupe` / `staleTime` options. Debouncing ≠ caching.

## Known limitations

- Unregister / conditional fields: see `docs/conditional-fields.md`.
- No per-field `isDebouncing` / `debouncingFields` subscription API yet.
- Structured error sources: see `docs/structured-errors.md`.
- Built-in catalogs do not replace `rules.async` messages. Localize inside the async validator. See `docs/internationalization.md`.
- `form.batch()` schedules at most one debounce timer per field from **final** values and does not wait for that delay. See `docs/batching.md`.
- No request caching or cross-form deduplication.

## Example

See `src/examples/UsernameAvailabilityForm.tsx` for a deterministic fake availability check.
