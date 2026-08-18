# Form context

Optional React context so nested field components do not need an explicit `control` prop.

## Why context exists

Deep trees of field components otherwise require prop-drilling `form.control`. Context makes that optional while keeping granular subscriptions.

## Why the provider stores only `control`

```tsx
<FormProvider control={form.control}>{children}</FormProvider>
```

Do **not** put the full `useForm()` return into context. That object changes whenever form state changes and would force every context consumer to re-render.

`form.control` is a stable opaque identity for the form instance.

## Explicit control (still supported)

```ts
useController({ control: form.control, name: 'email' })
useWatch(form, 'email')
useFieldState(form, 'email')
useFormState(form, (state) => state.isSubmitting)
```

Explicit control works outside a provider and **overrides** a provider when both exist.

## Context usage

```tsx
function ProfileForm() {
  const form = useForm<ProfileValues>({ defaultValues, onSubmit })

  return (
    <FormProvider control={form.control}>
      <form onSubmit={form.handleSubmit}>
        <AddressFields />
        <SubmitButton />
      </form>
    </FormProvider>
  )
}

function AddressFields() {
  const city = useController<ProfileValues, 'address.city'>({
    name: 'address.city',
  })
  return (
    <input
      value={city.field.value}
      onChange={(event) => city.field.onChange(event.target.value)}
      onBlur={city.field.onBlur}
      ref={city.field.ref}
    />
  )
}

function SubmitButton() {
  const isSubmitting = useFormState<ProfileValues, boolean>({
    selector: (state) => state.isSubmitting,
  })
  return <button disabled={isSubmitting}>Submit</button>
}
```

Also supported:

```ts
useWatch<ProfileValues, 'email'>({ name: 'email' })
useFieldState<ProfileValues, 'email'>({ name: 'email' })
useFieldArray<OrderValues, 'products'>({ name: 'products' })
const control = useFormContext<ProfileValues>()
```

## Missing provider

Hooks that need a control throw if neither `control` nor a provider is available:

```text
useController requires a FormControl. Pass `control` explicitly or render it inside <FormProvider>.
```

## Nested providers

The nearest provider wins. Explicit `control` can still target another form inside an inner provider.

## Generics

`useFormContext<T>()` and context-based hooks cannot verify `T` at runtime. The generic is a compile-time assertion by the consumer.

## Subscription isolation

Context does not change subscription boundaries. Memoize field components and rely on selector equality so unrelated field updates do not re-render siblings.

## Opaque `FormControl`

Public `FormControl` does not expose store `setState` or internal handlers. Internals are stored in a module `WeakMap`. The empty control object is `Object.freeze`d as an implementation safeguard (not a documented public feature).

## Field arrays

`useFieldArray` supports the same explicit-control / context rules. See `docs/field-arrays.md`.

## Conditional fields

`useController` and context-registered native fields honor `shouldUnregister` and explicit `form.unregister`. See `docs/conditional-fields.md`.

## When not to use context

- Single-file forms where `register` / explicit `control` is clearer
- Sharing one control across disconnected trees without a shared React parent (pass `control` explicitly)
- Trying to “type-check” the form values at runtime via context (impossible)

## Example

See `src/examples/ContextProfileForm.tsx`.

`<FormDevTools />` with no `control` prop also resolves from this provider. See `docs/devtools.md`.
