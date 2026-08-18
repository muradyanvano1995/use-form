# Controlled components (`useController`)

Use `register()` for native HTML inputs. Use `useController()` for custom / design-system controls whose change API is a **value**, not a DOM event.

```ts
import { useController, useForm } from '../hooks/useForm/index.ts'

const form = useForm({
  defaultValues: {
    profile: { birthDate: null as Date | null },
    price: 19.99,
  },
})

const { field, fieldState } = useController({
  control: form.control,
  name: 'profile.birthDate',
})
```

## When to use which

| API             | Use for                                                     |
| --------------- | ----------------------------------------------------------- |
| `register`      | `<input>`, `<select>`, `<textarea>`, native file inputs     |
| `useController` | Date pickers, selects, toggles, rich text, custom uploaders |

Inside `<FormProvider control={form.control}>`, `control` may be omitted:

```ts
useController<ProfileValues, 'profile.birthDate'>({
  name: 'profile.birthDate',
})
```

See `docs/form-context.md`.

## Result shape

```ts
field.name
field.value
field.onChange(nextValue) // direct value — not an event
field.onBlur()
field.ref // focusable element or `{ focus() }`
field.disabled
field.id
field.errorId
field['aria-invalid']
field['aria-describedby']

fieldState.error
fieldState.errorDetails
fieldState.invalid
fieldState.touched
fieldState.dirty
```

`fieldState.isValidating` is **omitted** on purpose: the form currently only has global `isValidating` (true during validator/resolver execution, not during debounce wait). Prefer `useFormState(form, (s) => s.isValidating)` when you need that flag, so controllers do not re-render on unrelated validation work. For async defaults, select `isLoadingDefaults` / `isDefaultsReady` the same way.

## Parse and format

```ts
const price = useController<Values, 'price', string>({
  control: form.control,
  name: 'price',
  parse: (display) => Number(display),
  format: (stored) => stored.toFixed(2),
})
```

- Display type defaults to the stored field type when `parse` / `format` are omitted.
- `parse` is not validation; thrown errors propagate to the caller.
- Submit / `form.values` always use the **stored** type (number in this example).

## Disabled

```ts
useController({ control, name: 'email', disabled: true })
```

Same policy as `register({ disabled })`: the value stays in form state, is validated, and is submitted. Controller `onChange` is a no-op while disabled; `form.setValue` still works.

## Files

Custom uploaders should use `useController` with `File | null` / `File[]`. Native `<input type="file">` should keep using `register({ type: 'file' })`. Programmatic controller updates change form state only — they do not populate a native file selection.

## Subscriptions

`useController` subscribes only to the selected field’s value / error / touched / dirty. Memoize the consuming component and pass `form.control` so parent `useForm` re-renders do not force updates when the selected slice is unchanged.

Dependent-field validation triggered by a controller `field.onChange` follows the form's `dependencies` and `dependencyMode` options. See `docs/dependent-fields.md`.

`shouldUnregister` on `useController` uses the same deferred unregister as native `register`. See `docs/conditional-fields.md`.

Controller `fieldState.error` / `errorDetails` stay in sync with localized built-in messages after revalidation. Catalog-only option changes do not rerender the controller. See `docs/internationalization.md`.

## Example

See `src/examples/ControlledFieldsForm.tsx` (simulated date picker, currency parse/format, custom uploader).

## Limitations

- No per-field `isValidating` on `fieldState` yet (use `useFormState` for form-level validating).
- Indexed paths work with `useController` the same as `register` (`products.0.name`); dynamic lists still use `useFieldArray` for structure — see `docs/field-arrays.md`.
- Schema transforms via `resolver` do not change live controller values (`TInput` remains); see `docs/schema-resolvers.md`.
- Imperative snapshots: `docs/imperative-api.md`. Grouped controller `onChange` calls can use `form.batch()` (`docs/batching.md`).
