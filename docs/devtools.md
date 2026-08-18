# Form DevTools

Phase 12 ships a **read-only** development inspector as a **separate source entry**. It is not exported from the core barrel (`src/hooks/useForm/index.ts`).

```ts
import { FormDevTools } from '../devtools/index.ts'
```

Intended package subpath:

```ts
import { FormDevTools } from '<package-name>/devtools'
```

Do not import DevTools from the core `useForm` entry. Core source does not import DevTools, so production bundles that never import `src/devtools` will not include the inspector.

## Usage

```tsx
<FormDevTools control={form.control} />

<FormProvider control={form.control}>
  <FormDevTools />
</FormProvider>
```

Missing control/provider throws a named `FormDevTools requires a FormControl` error.

Recommended production exclusion: do not render it, or pass `enabled={false}` (returns `null`). Do not rely only on `import.meta.env.DEV`. Conditionally import/render in the application:

```tsx
{
  isDevelopment ? <FormDevTools control={form.control} /> : null
}
```

## Props

| Prop            | Meaning                                                               |
| --------------- | --------------------------------------------------------------------- |
| `control`       | Explicit `form.control`. Optional inside `FormProvider`.              |
| `position`      | `'bottom-right'` (default), `'bottom-left'`, or `'inline'`            |
| `initiallyOpen` | Panel expanded on first render (default `true`)                       |
| `enabled`       | `false` renders nothing                                               |
| `redact`        | Extra paths (`'profile.ssn'`) or a `(path, key) => boolean` predicate |
| `redactFiles`   | Hide the complete file field (metadata and name)                      |
| `hideFileNames` | Keep type/size metadata but omit `File.name`                          |

Public DevTools exports: `FormDevTools`, `FormDevToolsProps`, `DevToolsPosition`, `DevToolsRedactionPredicate`. The serializer is not a public export.

## Privacy

Sensitive keys are redacted by default (case-insensitive name match), including `password`, `passcode`, `secret`, `token`, `apiKey`, `accessToken`, `refreshToken`, `authorization`, `creditCard`, `cardNumber`, `cvv`, `cvc`. Supply `redact` as extra paths or a custom `(path, key) => boolean` predicate.

**Filenames can themselves be sensitive.** Default File display is `{ $dev: 'File', name, type, size }`. Use `redactFiles` to replace the whole field with `{ $dev: 'redacted' }`, or `hideFileNames` to keep type/size without `name`. The serializer never reads File or Blob contents.

## Inspection safety

Plain objects are walked with `Object.getOwnPropertyNames` / `Object.getOwnPropertyDescriptor`. Own getters are tagged `{ $dev: 'getter' }` and are not invoked. `toJSON()` is never called. Values are not mutated.

This is **not** complete protection against hostile `Proxy` objects. Inspecting a proxy can still run `ownKeys`, `getOwnPropertyDescriptor`, and `get` traps for data properties. Do not pass untrusted proxies into DevTools and do not treat serialization as a sandbox.

Cyclic objects, functions, maps, sets, and class instances are tagged without walking their internals.

## Subscriptions

The inspector uses `useFormState` with a snapshot equality check. It does not write to the form and does not force extra rerenders of memoized children that subscribe to unrelated slices. Collapsed sections skip serialization.

Phase 12 DevTools is **read-only**: no editing, reset, submit, time travel, or import/export.
