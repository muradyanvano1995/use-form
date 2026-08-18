# Imperative getters

Phase 12 adds **non-reactive** read APIs on `useForm`. They always read the current store snapshot and never subscribe, so calling them in event handlers or after `batch()` does not schedule a render.

Prefer `useWatch` / `useFormState` / `useFieldState` when UI should update. Use getters when you need a one-off snapshot (submit helpers, analytics, batch follow-up).

```ts
const values = form.getValues()
const city = form.getValue('address.city')
const errors = form.getErrors()
const details = form.getErrorDetails()
const state = form.getFieldState('profile.email')
const dirty = form.getDirtyValues()
const touched = form.getTouchedValues()
```

Getter function identities stay stable across renders (`form.getValues === form.getValues` after a rerender). They close over the store, not a render-time state object.

## Clone semantics

`getValues` / `getValue` return a **safe clone** of plain objects and arrays (`cloneFormValue`). Mutating the result cannot change internal form state. `File`, `Blob`, `Date`, `Map`, `Set`, class instances, and functions keep identity. JSON serialization is not used.

Inactive optional fields remain absent after destructive unregister. Async-default commits are visible immediately through getters even if a render has not flushed yet.

Unsafe runtime paths (`__proto__`, empty segments, `..`) throw. Invalid paths fail at compile time.

## Errors

`getErrors()` is a shallow copy of the backward-compatible string map. `getErrorDetails()` is a shallow copy of canonical `FieldError` records. Root errors stay on `form.rootError` / `form.rootErrorDetails` and are **not** merged into those maps. Structured params keep the freeze/clone policy from `docs/structured-errors.md`.

## `getFieldState`

```ts
{
  value,
  defaultValue,
  error,          // string | undefined
  errorDetails,   // FieldError | undefined
  touched,        // exact path in the touched map
  dirty,          // exact path in derived dirtyFields
  invalid,        // canonical error details present
  registered,     // native element or controller currently connected
  active,         // not in the inactive (removed) set
}
```

`registered` and `active` are distinct: a preserved unmounted field can be `registered: false` and `active: true`. Per-field `isValidating` is not exposed; only form-level `isValidating` exists.

## Dirty values vs dirty metadata

`form.dirtyFields` is a path → `true` map. `getDirtyValues()` reconstructs a `DeepPartial<TInput>` of **current values** at those paths. Shorter paths are written first. If a parent path is also selected, descendants are skipped so array parents stay arrays (no object properties attached to the array). Arrays follow the existing atomic dirty boundary (a changed array is included as a whole). Internal field-array keys never appear. `File` values keep identity.

## Touched values vs touched metadata

`form.touched` is metadata (`{ 'address.city': true }`). `getTouchedValues()` is the current values at those paths. A parent path is included only when that parent key itself is touched — touching a child does not mark the parent object as touched metadata.

When both a parent and a child are touched, the parent clone is written first. If the parent path itself is selected, descendant paths are skipped so indexed children cannot attach object keys onto an array parent.
