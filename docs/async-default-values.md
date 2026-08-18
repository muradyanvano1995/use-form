# Async default values

Phase 8 adds optional asynchronous loading of **complete** input defaults while keeping `form.values` typed as `TInput` on every render.

## Why fallback defaults are required

A promise-only API such as `defaultValues: async () => fetchProfile()` cannot honestly expose `values: ProfileValues` before the promise resolves without inventing incomplete objects (`{} as ProfileValues`) or weakening all values to `DeepPartial`.

This package therefore requires:

1. Synchronous complete `defaultValues` (SSR + first paint fallback)
2. Optional `loadDefaultValues` that returns a complete `TInput`

```ts
const form = useForm<ProfileValues>({
  defaultValues: {
    name: '',
    email: '',
    address: { city: '' },
  },
  loadDefaultValues: async ({ signal, reason, context }) => {
    return fetchProfile({ signal })
  },
})
```

`form.values` is always a complete `ProfileValues`.

Promise-only defaults without a fallback are **not** supported.

## Public state

| Flag                 | Sync form   | Loading     | Success     | Failure |
| -------------------- | ----------- | ----------- | ----------- | ------- |
| `isLoadingDefaults`  | `false`     | `true`      | `false`     | `false` |
| `isDefaultsReady`    | `true`      | `false`     | `true`      | `false` |
| `defaultValuesError` | `undefined` | `undefined` | `undefined` | `Error` |

Loading failures are **not** field errors, `rootError`, or `submitError`.

## Loader contract

```ts
type DefaultValuesLoaderContext<TContext> = {
  signal?: AbortSignal
  reason: 'initial' | 'reload'
  context: TContext
}

type DefaultValuesLoader<TInput, TContext> = (
  context: DefaultValuesLoaderContext<TContext>,
) => TInput | Promise<TInput>
```

- Result must be a complete plain-object `TInput` (runtime-checked).
- Uses `resolverContext` as `context` (captured per load generation).
- Cloned with existing supported-value semantics (files/atomics keep identity).
- Must not mutate fallback or live form state.
- Abort errors are ignored (not stored as `defaultValuesError`).

## Automatic loading

When `loadDefaultValues` is provided at mount:

- No side effects during render
- SSR / first client render use fallback defaults with `isLoadingDefaults: true`
- Loading starts in an effect after mount
- Strict Mode may invoke effects twice; generations prevent stale commits
- Unmount aborts / invalidates the load
- Changing loader identity does **not** auto-reload (use `reloadDefaultValues`)

## Merge policy

`defaultValuesLoadMode` (default `'preserveDirty'`):

### `preserveDirty`

- Loaded values become the new complete defaults
- Dirty leaf paths keep current user values
- Pristine leaves take loaded values
- Arrays: if the array path or any descendant is dirty, preserve the **entire** current array; otherwise replace with the loaded array
- Touched/errors/`errorDetails`: preserved for dirty retained paths; cleared for replaced pristine paths
- `rootError` cleared; `submitError` / submit count unchanged

### `replace`

- Current values become a clone of loaded values
- Defaults become loaded values
- Touched and field errors/`errorDetails` cleared
- `rootError` cleared
- Field-array keys regenerate via known-array sync

## Files

Loaded `File | null` / `File[]` stay atomic. Native file inputs are cleared only when the applied value for that field actually changes. A dirty preserved file keeps both the form value and the visible native selection. Browsers still cannot display a programmatic file that replaced a pristine empty input — that input is cleared.

## Validation after load

`validateOnDefaultsLoad` (default `false`). When `true`, one complete validation cycle runs after apply (manual reason — no change debounce).

## Submission while loading

Defaults:

- `allowSubmitWhileLoading: false` — `handleSubmit` is a no-op while loading (no submit count bump)
- `allowSubmitWhenDefaultsFailed: false` — submit blocked after a failed load until a successful reload

## Reload / retry

```ts
await form.reloadDefaultValues({
  mode: 'preserveDirty',
  validate: false,
})
```

- Requires a configured loader (otherwise throws)
- Clears previous loading error when starting
- Latest reload wins; stale results never commit
- No automatic exponential retry

## Reset

| Situation                            | Behavior                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `reset()` before load finishes       | Restores current (fallback) defaults; does **not** cancel the in-flight load |
| `reset()` after success              | Restores loaded defaults                                                     |
| `reset(newValues)` updating defaults | Invalidates in-flight load; marks ready with the explicit defaults           |

`resetField` restores from the current defaults snapshot (loaded after success).

## SSR

- Server snapshot uses fallback values
- Loader does not run during server render
- AbortController usage remains optional/SSR-safe
- Prefer server-passed synchronous defaults for SSR apps when possible

## Suspense

Not implemented. Loaders must not throw promises during render.

## Known limitations

- Array preserve-dirty is whole-array, not index/id reconciliation
- No Suspense integration
- No automatic retries
- Unregister / conditional fields (Phase 9) — see `docs/conditional-fields.md`. Loaded defaults do not resurrect inactive optional values.
- Changing `validationMessages` / `fieldLabels` does not restart loaders. See `docs/internationalization.md`.
- Getters reflect loaded values immediately (`docs/imperative-api.md`). A loader commit during an open `form.batch()` applies state immediately and defers notification (`docs/batching.md`).

## Example

See `src/examples/AsyncDefaultsProfileForm.tsx`.
