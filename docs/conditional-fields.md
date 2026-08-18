# Conditional fields and unregister

Phase 9 adds explicit `unregister`, form-level and per-field `shouldUnregister`, and deferred unmount cleanup so optional fields can leave the form without breaking the `TInput` shape.

## Terminology

| Term              | Meaning                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unmounted**     | The React element/component is not currently rendered.                                                                                                               |
| **Unregistered**  | Field registration metadata (order, element refs, controller retain count) has been removed.                                                                         |
| **Inactive**      | The optional path was removed from live values (`keepValue: false` / automatic `shouldUnregister`). It is excluded from field rules, dependency targets, and submit. |
| **Removed value** | The property no longer exists on `form.values`.                                                                                                                      |
| **Reset value**   | The property remains and is restored to its default.                                                                                                                 |

These are not interchangeable. A field can be unmounted and still registered (default). It can be unregistered and still present in values (explicit `unregister()` default).

## Required vs optional values

`form.values` stays a type-correct `TInput`.

- Required properties are always present. Destructive removal (`keepValue: false`) does **not** type-check for those paths.
- A nested path is destructively removable only when **that exact property** is optional (or its value type includes absence). Required children of an optional parent (`company.taxNumber` under `company?: { taxNumber: string }`) are **not** optional.
- Fields that should disappear must be optional on `TInput` (`company?: { name: string }`).
- Prefer unregistering the optional parent (`company`) rather than deleting a required child of a still-present object.
- Empty plain-object ancestors are pruned after a destructive delete so `company: {}` does not linger.

`OptionalFieldPath<T>` identifies paths that may be absent. `unregister(path, { keepValue: false })` and `shouldUnregister: true` are typed against that set.

## Default preservation (`shouldUnregister: false`)

This is the default and preserves pre-Phase-9 behavior.

- Unmounting a native input or controller does **not** unregister after `ref(null)`.
- Values, defaults, and (unless you call `unregister`) registration order remain.
- Hidden fields still participate in form-level `validate`, resolvers, and submit.
- Focus-on-error skips elements that are not connected.

## Form-level and per-field `shouldUnregister`

```ts
useForm({ shouldUnregister: true })
form.register('company', { shouldUnregister: true })
useController({ name: 'nickname', shouldUnregister: true })
```

Precedence: **field/controller option → form-level option → `false`**.

When the last connected element **and** last controller for a path disconnect:

1. Unregister is **scheduled** on a microtask (not immediately).
2. Reconnect before that microtask **cancels** it (Strict Mode, ref identity changes, radio siblings, field-array reindex).
3. Automatic unregister uses `keepValue: false` (optional values are removed) and keeps stored defaults so remount restores them.

Indexed descendants of a known field array keep their values on automatic unregister — `useFieldArray` already owns structural value changes.

## Explicit `unregister`

```ts
form.unregister('company.taxNumber')
form.unregister(['company.taxNumber', 'company.address'])
form.unregister('company', { keepValue: false })
```

Default options:

| Option             | Default | Effect                                                |
| ------------------ | ------- | ----------------------------------------------------- |
| `keepValue`        | `true`  | Keep current value (still in submit / resolver input) |
| `keepDefaultValue` | `true`  | Keep stored default                                   |
| `keepError`        | `false` | Clear this path and descendant errors                 |
| `keepTouched`      | `false` | Clear touched metadata                                |
| `keepValidated`    | `false` | Clear previously-validated bookkeeping                |
| `shouldValidate`   | `false` | Run one complete validation cycle afterward           |

Always:

- Remove DOM/focus metadata and field-order entries for the path and descendants
- Cancel debounce timers, abort in-flight field validation, bump generations
- Do not mark the field touched
- Do not clear an unrelated `rootError`
- Do not change dirty state independently (dirty is derived)

There is no `keepDirty` (derived) and no `keepDependencies` (the consumer map is static).

Repeated unregister is a no-op. Unsafe paths (`__proto__`, …) throw.

## Validation participation

### Preserved-value unregister (`keepValue: true`)

- Form-level `validate` and `resolver` still receive the value.
- Field `rules` still run.
- There is no native element for DOM validation or focus.
- First-error focus skips disconnected elements.

### Removed / inactive unregister (`keepValue: false` / `shouldUnregister`)

- Field rules for that path and descendants are skipped.
- Dependency revalidation does not target the removed field.
- Resolver/submit input omits the optional property.
- Existing field error/`errorDetails` for the path is cleared.
- `rootError` is unchanged unless a later complete validation cycle replaces it.
- Unrelated fields keep their async work.

Do **not** use `shouldUnregister: true` on a required field in a multi-step form just because the input is temporarily hidden. Keep it mounted or leave `shouldUnregister: false` so the required value stays.

## Nested paths

`unregister('company.address.city')` affects that path. `unregister('company.address')` cleans the subtree: registrations, refs, errors, touched, debounce, generations, and descendant inactive roots.

Matching is segment-aware: `company` does not match `companyBackup`.

## Field arrays

Removed/moved/swapped items reindex metadata as before. Automatic `shouldUnregister` does not delete values for indexed descendants of a known array — that would drop data during transient `ref(null)` on move. Item removal already updates values structurally.

Nested arrays inside items remain unsupported.

## Dependencies, debounce, and root errors

Unregistering cancels pending dependent validation **targeting** that path. The consumer `dependencies` map is not mutated. Cycles stay safe.

Debounced/async field work is cancelled; stale results cannot land after remount. `isValidating` settles. Remount starts a fresh validation lifecycle.

Field unregister never auto-clears `rootError`. `clearErrors()` / `clearRootError()` are unchanged.

## Async defaults

Inactive/removed optional paths stay absent when loaded defaults arrive. Stored **defaults** may still update so remount can restore the loaded default. Preserve-dirty user files on **active** fields are not cleared on the native input.

Late loading must not resurrect a conditionally removed value. Remount restores from current defaults.

## Reset

| API                  | Behavior                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `reset()`            | Restore defaults for **active** fields. Inactive optional paths stay absent. Registration status is unchanged. |
| `reset(newDefaults)` | Update defaults. Does not register fields. Inactive paths stay inactive.                                       |
| `resetField(path)`   | If active, restore that default. If inactive, leave the value absent (does not register a DOM element).        |

## Strict Mode and multiple elements

`ref(null)` is not treated as a permanent unmount. Radio groups track every connected element; disconnecting one option does not unregister the group. Focus uses a still-connected element.

Controller `useEffect` cleanup uses the same deferred unregister. Changing `name` unregisters the old name according to its options. Changing `control` cleans up the old control.

## Accessibility

- Disconnected elements are never focus targets.
- First-error focus skips fields without a connected focusable element.
- Remounted fields keep the same id scheme (`formId-field-path`). Radio options use distinct option ids and a shared error id.
- Inactive field errors/`errorDetails` are cleared so they are not announced.
- Conditional groups should use a fieldset/legend and a status text for the visibility change (see the example).
- Changing `validationMessages` does not unregister fields or clear errors. See `docs/internationalization.md`.

## Public API

Exported: `unregister`, `UnregisterOptions`, `UnregisterOptionsFor`, `OptionalFieldPath`, `shouldUnregister` on `useForm` / `register` / `useController`.

Not exported: pending-unregister registries, ref counts, registration tokens, inactive-path sets, cleanup schedulers.

Registration state is **internal** this phase (no public `isRegistered`).

## Example

See `src/examples/ConditionalCompanyForm.tsx` for `shouldUnregister: true` vs `false`, optional `company`, error clearing, cancelled async tax checks, remount, and submit output.

## Known limitations

- Optional nested objects now expand in `FieldPath` (needed to register `company.name`). Depth is still capped at 5.
- Required children of an optional parent cannot be destructively unregistered at the type level. Unregister the optional parent, or an optional exact child (`company.note`).
- Indexed items of an optional array (`tags?: string[]` → `tags.0`) are not independently removable; unregister the array.
- Automatic unregister of indexed field-array descendants is metadata-oriented; array mutations own values.
- No public registration subscription API.

`getFieldState(path).registered` / `.active` report live connection vs inactive removal (`docs/imperative-api.md`). Unregister inside `form.batch()` cancels queued field validation for that path (`docs/batching.md`).
