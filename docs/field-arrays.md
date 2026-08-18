# Field arrays

Phase 4 adds production `useFieldArray` with typed indexed paths, stable React keys, and metadata reindexing.

## Supported shapes

| Shape                | Example                                               | Indexed paths               |
| -------------------- | ----------------------------------------------------- | --------------------------- |
| Object item arrays   | `products: Array<{ name: string; quantity: number }>` | `products.0.name`           |
| Nested object arrays | `customer.addresses: Array<{ city: string }>`         | `customer.addresses.0.city` |
| Primitive arrays     | `tags: string[]`                                      | `tags.0`                    |
| File arrays          | `documents: File[]`                                   | `documents.0`               |

**Not supported in this phase:** arrays nested inside array items (`orders.0.products.0.name`, `matrix.0.1`). Those paths are rejected by types or treated as unsupported atomic leaves.

## Indexed path syntax

Canonical syntax is **dot-separated numeric indices** only:

```text
products.0.name
order.products.2.quantity
```

Bracket syntax (`products[0].name`) is not supported. There is no dual-syntax normalization layer.

Path expansion depth for nested plain objects remains capped (see `FieldPath` depth limit of 5) for TypeScript performance.

## Public API

```ts
import { useFieldArray, FormProvider, useForm } from '../hooks/useForm/index.ts'

const form = useForm<OrderValues>({ defaultValues })

const products = useFieldArray({
  control: form.control,
  name: 'products',
})

// Inside <FormProvider control={form.control}>:
const products = useFieldArray({ name: 'products' })
```

Explicit `control` overrides context. Missing control/provider throws a named error from `useFieldArray`.

### Return value

```ts
type FieldArrayField<TItem> = {
  key: string // stable React key — never part of form values
  value: TItem
}

products.fields
products.append(value, options?)
products.prepend(value, options?)
products.insert(index, value, options?)
products.update(index, value, options?)
products.remove(index, options?)
products.swap(a, b, options?)
products.move(from, to, options?)
products.replace(values, options?)
products.clear(options?)
```

### Mutation options

```ts
type FieldArrayMutationOptions = {
  shouldValidate?: boolean
  shouldTouch?: boolean
  shouldFocus?: boolean
  focusName?: string // relative path within the item, e.g. 'name'
  focusIndex?: number
}
```

Focus runs after the store update via `queueMicrotask` + `requestAnimationFrame`, using registered elements or field ids. Prefer `focusName` for object items. Scheduled focus is **cancelled** when another array mutation runs, when the form unmounts, or when validation generations bump for structural changes — stale focus must not target a remapped index.

## Stable keys

- Stored in control internals (per-form map), **not** in submitted values.
- Generated with a per-form monotonic counter (`fa-1`, `fa-2`, …) — no `crypto.randomUUID()`.
- Safe in browsers, tests, and SSR module evaluation.
- `update` preserves the item key.
- `append` / `prepend` / `insert` allocate new keys.
- `remove` / `clear` drop keys.
- `swap` / `move` move keys with logical items.
- `replace` regenerates keys for the new list.
- `form.reset()` / `resetField(arrayPath)` regenerate keys for known arrays from restored values.

**Remount note:** Regenerating keys on `replace` / reset causes React to remount item subtrees keyed by `field.key`. That is intentional — do not reuse previous keys across replace/reset.

User items may already contain `id` or `key`; those fields are ordinary form data and are unrelated to internal keys.

## Mutation semantics

| Method              | Notes                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `append`            | Push one item                                                                              |
| `prepend`           | Insert at `0` and shift metadata                                                           |
| `insert`            | `0..length` allowed (`length` appends); out of range throws `RangeError`; no sparse arrays |
| `update`            | Replace whole item; keep key; no deep merge                                                |
| `remove`            | Drop one index; reindex later metadata                                                     |
| `swap` / `move`     | Preserve keys + errors/`errorDetails`/touched/registered paths with items                  |
| `replace` / `clear` | Drop indexed metadata tree; new keys (`clear` ≡ `replace([])`)                             |

All operations are immutable (new array / cloned plain-object items).

## Metadata reindexing

Errors, touched flags, registered field order, and focusable element maps for `arrayPath.{index}…` are remapped with **segment-aware** matching:

- `products.1.name` moves when index `1` moves.
- Array-level path `products` is **not** treated as an index.
- Sibling paths such as `productsBackup.0.name` or `customer.name` are untouched.

## Dirty and touched

Dirty state is recalculated from current values vs defaults:

- Length / order / identity changes mark the **array path** and affected index/leaf paths in `dirtyFields`.
- Editing `products.0.name` dirties that leaf **and** the `products` array path.
- Both can appear at once: the array path signals “this list differs from defaults,” while leaf paths identify which items/fields changed. `isDirty` is true when any dirty leaf/array path exists.
- Restoring exact default values and order clears dirty state.

Touched:

- New items start untouched unless `shouldTouch: true` (marks the array path).
- `update` does not auto-touch.
- Remove/swap/move reindex touched paths with items.
- Reset follows existing `keepTouched` options; array `resetField` clears the array’s descendant touched map.

## Validation

- Array-level rules: `rules.minItems` / `rules.maxItems` (preferred over string `minLength`/`maxLength` for arrays).
- Concrete indexed rules work when those paths exist (`'products.0.name'`).
- **Wildcard rules (`products.*.name`) are not implemented** in Phase 4.
- Prefer form-level `validate` (or controller/register workflows) for dynamic item rules as items are added.

Structural mutations bump form validation generations so in-flight indexed async results cannot land on a different logical item after reindexing. Policy: invalidate pending validation for the whole form on structural array changes, and cancel pending debounce timers for the array path and its indexed children (prefer cancel over remapping scheduled closures). See `docs/async-validation.md`.

When loaded async defaults replace or preserve arrays, field-array keys regenerate for known arrays and pending indexed validation is cancelled. See `docs/async-default-values.md`. Automatic `shouldUnregister` does not delete indexed item values during move/swap; `useFieldArray` owns structural value changes. See `docs/conditional-fields.md`.

### Dependencies and indexed paths

Dependency paths are exact and positional. For example, `products.0.total: ['products.0.quantity']` follows index `0`, not a logical item. `useFieldArray` does not rewrite consumer `dependencies` after insert, remove, or move; regenerate the map when structure changes. Wildcard dependency paths are not supported.

## Reset

| API                                  | Behavior                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `form.reset()`                       | Restore defaults; regenerate known field-array keys                                 |
| `form.reset(next)`                   | Merge/replace defaults per existing reset options; regenerate keys                  |
| `form.resetField('products')`        | Restore full array; clear descendant errors/`errorDetails`/touched; regenerate keys |
| `form.resetField('products.0.name')` | Restore one leaf (existing leaf reset)                                              |

File inputs under items still clear via existing native-input helpers when appropriate.

## Context and subscriptions

- `useFieldArray` uses `useWatch` on the array path — unrelated fields do not rebuild `fields`.
- Two hooks on the same path share keys and stay synchronized.
- Control swaps unsubscribe/resubscribe through existing watch/control resolution.
- Internal key maps are GC’d with the opaque control (`WeakMap` internals).

## Primitive and file arrays

```tsx
const tags = useFieldArray({ control, name: 'tags' })
tags.append('react')
// render with field.value — there is no tags.0.value wrapper in form state

const files = useFieldArray({ control, name: 'documents' })
files.append(file) // File identity preserved; not cloned as plain objects
```

## Performance

- Prefer field-array mutations over repeatedly replacing huge trees from the parent.
- Keys are O(n) per mutation; metadata remaps scan error/touched keys under the array prefix.
- Avoid unbounded path-depth generics; depth remains capped.

## Example

See `src/examples/OrderItemsForm.tsx` for context-based `useFieldArray`, mutations, indexed registration, files, dirty/touched display, reset, and submission without internal keys.

Indexed `fieldLabels` (`products.0.name`) are positional and are not rewritten when items move. Resolved error messages move with the logical item. There are no wildcard labels. See `docs/internationalization.md`.

## Related docs

- `docs/form-state.md` — subscriptions
- `docs/imperative-api.md` — `getDirtyValues` / `getTouchedValues` (no internal keys)
- `docs/batching.md` — grouping `append` / `move` into one notification
- `docs/form-context.md` — provider / explicit control
- `docs/controlled-components.md` — `useController` with indexed paths
- `docs/schema-resolvers.md` — input/output validation transforms
- `docs/package-roadmap.md` — phase status
