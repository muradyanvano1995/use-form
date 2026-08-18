# Form hooks

Typed React form state for nested fields, field arrays, files, validation, and submission. This repository also hosts a Vite demo application and Storybook workspace.

## Release-readiness status

Local packaging is in place: ESM library build, declaration files, package `exports`, peer React, archive checks, and consumer tests.

**Not published.** Do not treat the current `package.json` `name` (`react-hooks`) as a public npm identity. It is a generic workspace name.

Release blockers that the owner must resolve before publishing:

- Final npm package name/scope required before publishing.
- License selection required before public release.
- Repository, homepage, bugs, and author metadata are unset.
- CI provider is not established.
- `private: true` remains set so an accidental `npm publish` is blocked.

## Features

- Strongly typed values, nested paths, and one level of field arrays
- Granular subscriptions (`useWatch`, `useFormState`, `useFieldState`)
- Native `register()` and headless `useController`
- File fields without reading contents into form state
- Built-in rules, custom rules, async debounce, resolvers, and i18n catalogs
- Async default-value loading and conditional `unregister`
- Structured errors (`FieldError` + string view)
- Non-reactive getters and atomic `form.batch()`
- Development-only DevTools on a separate entry

## Installation

The package is not on npm yet. After a public name is chosen:

```bash
npm install <package-name>
```

Peer requirement: **React 19**. `react-dom` is an optional peer (needed for SSR tests and DOM rendering). React Native is not tested.

Until publish, develop from this repository with `npm install` at the root.

## Quick start

```tsx
import { rules, useForm, ValidationMode } from '<package-name>'

function Login() {
  const form = useForm({
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
      <input {...form.register('email')} />
      <input {...form.register('password')} type="password" />
      <button type="submit">Sign in</button>
    </form>
  )
}
```

Form hooks and components are **client-side APIs**. In React Server Component frameworks, import them from a Client Component (`'use client'`). The Standard Schema adapter does not import React and may be loaded on the server.

## Guides

| Topic                 | Doc                                                            |
| --------------------- | -------------------------------------------------------------- |
| Validation            | [docs/validation.md](docs/validation.md)                       |
| Nested fields         | [docs/form-state.md](docs/form-state.md)                       |
| Field arrays          | [docs/field-arrays.md](docs/field-arrays.md)                   |
| Controlled components | [docs/controlled-components.md](docs/controlled-components.md) |
| Files                 | [docs/form-state.md](docs/form-state.md)                       |
| Schema resolvers      | [docs/schema-resolvers.md](docs/schema-resolvers.md)           |
| Async validation      | [docs/async-validation.md](docs/async-validation.md)           |
| Async defaults        | [docs/async-default-values.md](docs/async-default-values.md)   |
| Conditional fields    | [docs/conditional-fields.md](docs/conditional-fields.md)       |
| Structured errors     | [docs/structured-errors.md](docs/structured-errors.md)         |
| Internationalization  | [docs/internationalization.md](docs/internationalization.md)   |
| Getters               | [docs/imperative-api.md](docs/imperative-api.md)               |
| Batching              | [docs/batching.md](docs/batching.md)                           |
| DevTools              | [docs/devtools.md](docs/devtools.md)                           |
| Public API inventory  | [docs/public-api.md](docs/public-api.md)                       |
| Releasing             | [docs/releasing.md](docs/releasing.md)                         |

### DevTools

```ts
import { FormDevTools } from '<package-name>/devtools'
```

### Standard Schema adapter

```ts
import { standardSchemaResolver } from '<package-name>/resolvers/standard-schema'
```

The adapter is not exported from the core entry. It does not depend on Zod, Yup, or Valibot.

## Documentation

- Guides: `docs/`
- Interactive examples: `npm run storybook` (local only; not deployed). Contributor rules: [docs/storybook.md](docs/storybook.md)
- API reference: `npm run docs:api` (writes `api-docs/`, not committed)
- Agent skills: `.ai/skills/`

## Compatibility

- Tested with React 19.2 and TypeScript 6 in this repository
- Primary format: ESM only (no CommonJS `require()` support)
- Node is used for package/SSR import tests; browsers remain the runtime for form UI
- React Native is unsupported

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run `npm run verify` before considering a change complete.

## License

No license has been chosen. The owner must select a license before public release. This repository does not assume MIT or any other terms.
