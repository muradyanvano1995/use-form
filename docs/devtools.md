# Form DevTools

Phase 12 ships a **read-only** development inspector as a **separate source entry**. It is not exported from the core barrel (`src/hooks/useForm/index.ts`).

```ts
import { FormDevTools } from '../devtools/index.ts'
```

Intended package subpath:

```ts
import { FormDevTools } from '@muradyanvano/use-form/devtools'
```

Do not import DevTools from the core `useForm` entry. Core source does not import DevTools or `react-dom`, so production bundles that never import `src/devtools` / `@muradyanvano/use-form/devtools` will not include the inspector.

## Peers

| Entry                             | React    | react-dom                                         |
| --------------------------------- | -------- | ------------------------------------------------- |
| `@muradyanvano/use-form` (core)   | required | not required for core itself                      |
| `@muradyanvano/use-form/devtools` | required | **required** (floating panel uses `createPortal`) |

`react-dom` is an optional peer of the package so core-only apps are not forced to install it. Install and satisfy `react-dom` when you import the DevTools subpath.

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

| Prop            | Meaning                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `control`       | Explicit `form.control`. Optional inside `FormProvider`.                                                                                                                                                |
| `position`      | Initial placement: `'bottom-right'` (default), `'bottom-left'`, or `'inline'`. Header **Float** / **Dock** toggles at runtime; floating portals to `document.body` so the panel leaves the form layout. |
| `initiallyOpen` | Panel expanded on first render (default `true`)                                                                                                                                                         |
| `enabled`       | `false` renders nothing                                                                                                                                                                                 |
| `redact`        | Extra paths (`'profile.ssn'`) or a `(path, key) => boolean` predicate                                                                                                                                   |
| `redactFiles`   | Hide the complete file field (metadata and name)                                                                                                                                                        |
| `hideFileNames` | Keep type/size metadata but omit `File.name`                                                                                                                                                            |

Public DevTools exports: `FormDevTools`, `FormDevToolsProps`, `DevToolsPosition`, `DevToolsRedactionPredicate`. The serializer is not a public export.

## Privacy

Sensitive keys are redacted by default on **Values** and **Defaults** (case-insensitive name match), including `password`, `passcode`, `secret`, `token`, `apiKey`, `accessToken`, `refreshToken`, `authorization`, `creditCard`, `cardNumber`, `cvv`, `cvc`. Supply `redact` as extra paths or a custom `(path, key) => boolean` predicate.

**State** shows touched/dirty maps and flags without sensitive-key redaction — a boolean under `touched.profile.password` is not a secret. **Errors** / **Details** also skip value redaction so field messages stay readable.

**Filenames can themselves be sensitive.** Default File display is `{ $dev: 'File', name, type, size }`. Use `redactFiles` to replace the whole field with `{ $dev: 'redacted' }`, or `hideFileNames` to keep type/size without `name`. The serializer never reads File or Blob contents.

## Inspection safety

Plain objects are walked with `Object.getOwnPropertyNames` / `Object.getOwnPropertyDescriptor`. Own getters are tagged `{ $dev: 'getter' }` and are not invoked. `toJSON()` is never called. Values are not mutated.

This is **not** complete protection against hostile `Proxy` objects. Inspecting a proxy can still run `ownKeys`, `getOwnPropertyDescriptor`, and `get` traps for data properties. Do not pass untrusted proxies into DevTools and do not treat serialization as a sandbox.

Cyclic objects, functions, maps, sets, and class instances are tagged without walking their internals.

## Subscriptions

The inspector uses `useFormState` with a snapshot equality check. It does not write to the form and does not force extra rerenders of memoized children that subscribe to unrelated slices. Inactive tabs skip serialization.

## UI

The panel includes status chips (`Valid` / `Invalid`, dirty, error count, submitting, …), section tabs (Values, Errors, Details, State, Defaults), a colorized key/value tree for values/state, and card layouts for Errors/Details (path, error-colored message via `--form-devtools-error`, source/type pills; no JSON dump and no redacting of error messages on password-named paths). A **Float** control (before Collapse) portals the inspector to `document.body` as a fixed panel so large forms stay scrollable and the page layout is unobstructed. While floating, drag the header to move and use the bottom-right handle to resize (clamped to the viewport). Collapsing a floating panel docks the chip to the bottom-right, stacking multiple inspectors so they do not overlap; interacting with a panel raises its z-index above the others. **Dock** returns it inline. Only the value panel scrolls. Theme via `--form-devtools-*` CSS variables (surfaces, accents, `--form-devtools-on-accent`, syntax colors). Styles ship as a JS string injected by the panel (not a separate CSS file) so `package.json` `"sideEffects": false` cannot drop them. The `./devtools` subpath requires `react-dom` (portals); core does not.

## Source layout

```text
src/devtools/
  index.ts                 # public exports
  FormDevTools.tsx         # coordinator (control, tabs, snapshot, portal)
  styles.ts                # DEVTOOLS_STYLES string
  dirtyFields.ts           # compact State-tab dirty map (keeps pathUtilities out of the bundle)
  safeSerialize.ts
  components/
    DevToolsPanel.tsx      # aside shell + style injection
    JsonTree.tsx
    ErrorPanel.tsx
    ResizeHandles.tsx
  hooks/
    useFloatingPanel.ts    # drag / resize / float ↔ inline
    usePanelPersistence.ts # stagger / collapsed slots / z-index / frame helpers
    useDevToolsSnapshot.ts # store subscription without useFormState dirty helpers
```

Phase 12 DevTools is **read-only**: no editing, reset, submit, time travel, or import/export.
