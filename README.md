# @muradyanvano/use-form

[![npm version](https://img.shields.io/npm/v/@muradyanvano/use-form)](https://www.npmjs.com/package/@muradyanvano/use-form)
[![npm downloads](https://img.shields.io/npm/dm/@muradyanvano/use-form)](https://www.npmjs.com/package/@muradyanvano/use-form)
[![CI](https://github.com/muradyanvano1995/use-form/actions/workflows/ci.yml/badge.svg)](https://github.com/muradyanvano1995/use-form/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@muradyanvano/use-form)](https://github.com/muradyanvano1995/use-form/blob/main/LICENSE)
[![Storybook](https://img.shields.io/badge/Storybook-docs-FF4785?logo=storybook&logoColor=white)](https://muradyanvano1995.github.io/use-form/)

Typed React 19 form hooks for nested objects, one-level field arrays, file metadata, validation timing, and accessible native field registration.

Published on npm as **`@muradyanvano/use-form`**. The API is currently pre-1.0; see [CHANGELOG.md](CHANGELOG.md) for released versions.

| Resource      | URL                                                                                 |
| ------------- | ----------------------------------------------------------------------------------- |
| **Storybook** | [muradyanvano1995.github.io/use-form](https://muradyanvano1995.github.io/use-form/) |
| **npm**       | [@muradyanvano/use-form](https://www.npmjs.com/package/@muradyanvano/use-form)      |
| **GitHub**    | [muradyanvano1995/use-form](https://github.com/muradyanvano1995/use-form)           |
| **Issues**    | [GitHub Issues](https://github.com/muradyanvano1995/use-form/issues)                |
| **Changelog** | [CHANGELOG.md](https://github.com/muradyanvano1995/use-form/blob/main/CHANGELOG.md) |

Explore interactive examples, validation behavior, field arrays, controlled components, asynchronous flows and DevTools in the [Storybook documentation](https://muradyanvano1995.github.io/use-form/).

## Features

- Strongly typed values, nested paths (`address.city`), and one-level field arrays (`items.0.name`)
- Native `register()` and headless `useController` for custom controls
- Built-in rules, custom rules, form-level `validate`, Standard Schema resolvers, async debounce, i18n catalogs
- Structured errors (`FieldError` + string view), accessible ids, focus-on-error
- File fields store `File` references only (no content reads)
- Non-reactive getters and atomic `form.batch()`
- Development DevTools on a separate entry (not shipped in core bundles)

## Installation

Stable:

```bash
npm install @muradyanvano/use-form
```

Prerelease (beta channel):

```bash
npm install @muradyanvano/use-form@beta
```

Peers:

- **`react`**: `^19.0.0` (required)
- **`react-dom`**: optional for core-only apps; **required** when importing `@muradyanvano/use-form/devtools`

Contributors can also develop from this repository (`npm ci`) or install a locally packed tarball (see [docs/releasing.md](docs/releasing.md)).

Supported tooling: Node `^20.19.0 || >=22.12.0`, npm `>=10.8.0`.

## Minimal example

```tsx
'use client'

import { rules, useForm, ValidationMode } from '@muradyanvano/use-form'

type LoginValues = { email: string; password: string }

export function LoginForm() {
  const form = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
    mode: ValidationMode.OnSubmit,
    rules: {
      email: [rules.required(), rules.email()],
      password: [rules.required(), rules.minLength(8)],
    },
    onSubmit: (values) => {
      void values
    },
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <label htmlFor={form.getFieldId('email')}>Email</label>
      <input {...form.register('email')} id={form.getFieldId('email')} type="email" />
      {form.errors.email ? <p id={form.getErrorId('email')}>{form.errors.email}</p> : null}

      <label htmlFor={form.getFieldId('password')}>Password</label>
      <input {...form.register('password')} id={form.getFieldId('password')} type="password" />
      {form.errors.password ? <p id={form.getErrorId('password')}>{form.errors.password}</p> : null}

      <button type="submit">Sign in</button>
    </form>
  )
}
```

Form hooks are **client components**. In React Server Component apps, import them from a file marked `'use client'`.

## Validation example

```tsx
import { rules, useForm, ValidationMode } from '@muradyanvano/use-form'

const form = useForm({
  defaultValues: { age: '' },
  mode: ValidationMode.OnBlur,
  rules: {
    age: [rules.required(), rules.min(18)],
  },
})
```

See [docs/validation.md](docs/validation.md) and [docs/async-validation.md](docs/async-validation.md).

## TypeScript example

```tsx
import { useForm, type FieldPath } from '@muradyanvano/use-form'

type Profile = {
  email: string
  address: { city: string }
}

const form = useForm<Profile>({
  defaultValues: { email: '', address: { city: '' } },
})

const path: FieldPath<Profile> = 'address.city'
form.setValue(path, 'Yerevan')
```

Path inference stops at depth 5. Invalid paths fail at compile time.

## Controlled-component example

```tsx
import { useController, useForm } from '@muradyanvano/use-form'

function RatingField({ control }: { control: ReturnType<typeof useForm>['control'] }) {
  const { field, fieldState } = useController({
    control,
    name: 'rating',
    defaultValue: 0,
  })

  return (
    <>
      <input
        type="range"
        min={0}
        max={5}
        value={field.value}
        onChange={(event) => {
          field.onChange(Number(event.target.value))
        }}
      />
      {fieldState.error ? <p>{fieldState.error}</p> : null}
    </>
  )
}
```

See [docs/controlled-components.md](docs/controlled-components.md).

## Field-array example

```tsx
import { useFieldArray, useForm } from '@muradyanvano/use-form'

type FormValues = { items: Array<{ name: string }> }

const form = useForm<FormValues>({ defaultValues: { items: [] } })
const items = useFieldArray({ control: form.control, name: 'items' })

items.append({ name: '' })
```

One index level only. See [docs/field-arrays.md](docs/field-arrays.md).

## Async validation and defaults

- Debounced remote checks: [docs/async-validation.md](docs/async-validation.md)
- Async `loadDefaultValues`: [docs/async-default-values.md](docs/async-default-values.md)

## Standard Schema resolver

```tsx
import { useForm } from '@muradyanvano/use-form'
import { standardSchemaResolver } from '@muradyanvano/use-form/resolvers/standard-schema'

const form = useForm({
  defaultValues: { email: '' },
  resolver: standardSchemaResolver(yourStandardSchema),
})
```

The adapter has **no React import** and may run on the server. It is **not** exported from the core entry. See [docs/schema-resolvers.md](docs/schema-resolvers.md).

## DevTools

```tsx
import { FormProvider, useForm } from '@muradyanvano/use-form'
import { FormDevTools } from '@muradyanvano/use-form/devtools'

const form = useForm({ defaultValues: { email: '' } })

return (
  <FormProvider control={form.control}>
    {/* fields */}
    {import.meta.env.DEV ? <FormDevTools control={form.control} /> : null}
  </FormProvider>
)
```

DevTools requires `react-dom` (portals). Do not ship it as production UI. See [docs/devtools.md](docs/devtools.md).

## Public entry points

| Import                                             | Purpose                                                      |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `@muradyanvano/use-form`                           | Core hooks, rules, types (`'use client'`)                    |
| `@muradyanvano/use-form/devtools`                  | `FormDevTools` inspector (`'use client'`, needs `react-dom`) |
| `@muradyanvano/use-form/resolvers/standard-schema` | `standardSchemaResolver` (no React)                          |
| `@muradyanvano/use-form/package.json`              | Package metadata                                             |

Private paths (for example `@muradyanvano/use-form/hooks/...`) are **not** supported.

Full inventory: [docs/public-api.md](docs/public-api.md).

## React peer support

Tested in this repository with **React 19.2**. React 18, React Native, and CommonJS `require()` are **not** supported or tested.

## SSR

Core hooks are client-only. The library uses a stable server snapshot for selector reads during SSR smoke tests, but **hydrated form UX is not a supported product surface yet**. Do not render interactive forms on the server.

The Standard Schema resolver entry may be imported on the server because it does not import React.

## Browser support

Modern evergreen browsers with native ESM. The library targets client-side React DOM applications tested via Vitest, Testing Library, and Storybook browser runs in CI.

## Known limitations

- ESM only (no CommonJS build)
- Path expansion depth 5; one-level field arrays; no nested arrays inside items
- No first-party Zod/Yup/Valibot adapters (Standard Schema only)
- Client-side validation is UX only — repeat checks on the server

See [docs/package-roadmap.md](docs/package-roadmap.md) and Storybook **Limitations and roadmap**.

## Documentation

- Interactive docs: [Storybook](https://muradyanvano1995.github.io/use-form/)
- Guides: [docs/](docs/)
- Local Storybook for contributors: `npm run storybook` — rules in [docs/storybook.md](docs/storybook.md)
- API reference (TypeDoc): `npm run docs:api` → gitignored `api-docs/`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the post-change guide [docs/development-workflow.md](docs/development-workflow.md). Run `npm run verify` locally; CI runs `npm run verify:ci` on push/PR.

## Security

See [SECURITY.md](SECURITY.md). Report issues via [GitHub Issues](https://github.com/muradyanvano1995/use-form/issues) until a dedicated security contact is published.

## License

[MIT](LICENSE) © 2026 Vano Muradyan
