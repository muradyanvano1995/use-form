# Internationalized validation messages

Phase 11 adds **per-form** catalogs for built-in rule messages. The package does not include a translation library, a global locale, or automatic translation of resolver, server, or custom-validator text.

Primary types: `ValidationMessageCatalog`, `FieldLabels`, `BuiltInRuleType`, `BuiltInRuleParams`, `defaultValidationMessages`.

## Scope

Catalogs apply only to **annotated built-in field rules** (`required`, `email`, `minLength`, …). They do **not** translate:

- Custom validators (string or structured)
- `rules.async` returned messages
- Form-level `validate` maps
- Resolver / Standard Schema messages
- `setError` / `setErrors` (`manual` / `server`)
- Resolver root errors, loader errors, or `submitError`

Applications localize those sources themselves (or close over `t()` inside the validator).

The package-generated resolver fallback `"Validation failed"` is a core system message, not a field-rule catalog key.

## Default English catalog

Defaults live in the frozen `defaultValidationMessages` export. Missing catalog keys fall back to that English catalog.

**Pre-release grammar correction (Phase 12):** count-aware English is used for file, item, and character limits (`1 file` / `5 files`, `1 item` / `4 items`, `1 character` / `3 characters`). The package has not been released, so the incorrect `You can upload up to 1 files` default was not preserved.

Consumers may spread the catalog:

```ts
{
  ...defaultValidationMessages,
  required: 'Required',
}
```

Do not mutate `defaultValidationMessages`.

## Form-level catalog and labels

```ts
const form = useForm<RegistrationValues>({
  defaultValues,
  fieldLabels: {
    name: 'Full name',
    email: 'Email address',
    'address.city': 'City',
    'products.0.name': 'Product name',
  },
  validationMessages: {
    required: ({ label }) => `${label} is required`,
    email: ({ label }) => `${label} must be a valid email`,
    minLength: ({ label, params }) => `${label} must contain at least ${params.min} characters`,
  },
  rules: {
    name: [rules.required()],
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(8)],
  },
})
```

Catalogs are scoped to one form. Two forms can use different languages at the same time. There is no global locale singleton.

Label fallback:

1. `fieldLabels[path]` when it is a non-empty string
2. The field path itself

Paths are not title-cased. There are no wildcard labels. Invalid label keys fail at compile time.

## String and factory messages

A catalog entry may be a string or a factory:

```ts
required: 'This field is required'
minLength: ({ type, name, label, params }) =>
  `${label} must contain at least ${params.min} characters`
```

Factories receive only `type`, `name`, `label`, and readonly `params`. They never receive field values, passwords, `File` objects, form values, resolver output, or server payloads.

`params` match structured error metadata (`BuiltInRuleParams`). `sameAs` does not include the expected value. `matchesField` includes the other **path**, not its value. Pattern params are `source` / `flags` only. File params are limits/types, not contents.

## Precedence

```text
per-rule custom message
→ form validationMessages[type]
→ default English catalog
```

Existing calls stay valid:

```ts
rules.required()
rules.required('Email is required')
rules.minLength(8, ({ label, params }) => `${label}: minimum ${params.min}`)
```

Per-rule factories are resolved by the form pipeline (they need path/label context). Direct `await rules.minLength(8, factory)('ab', {})` still returns the default English string.

Empty or non-string factory results fall back to the next layer (catalog, then English). Thrown factories are unexpected errors and are **not** converted into validation messages.

## Dynamic locale changes

Passing a new `validationMessages` / `fieldLabels` object:

- Does not reset values, defaults, dirty, or touched state
- Does not restart async default loaders
- Does not change registration or `control` identity
- Does not mutate existing error strings
- Is used by the **next** validation cycle

Revalidate after changing locale:

```ts
await form.validate()
```

There is no `refreshErrorMessages()`. Existing issues already contain resolved strings. The package does not silently rerun async validation when the catalog identity changes.

Capture locale in factories if needed:

```ts
validationMessages: {
  required: (context) => t('validation.required', context),
}
```

## Criteria modes

`firstError` resolves only the first applicable built-in failure and does not invoke later message factories.

`all` resolves every applicable built-in issue in declaration order. `errors[path]` remains the first resolved message. `errorDetails[path].issues` contains every localized message.

One validation cycle uses one catalog/label snapshot. Async/debounced rules that start later as a **new** cycle read the latest snapshot at that start.

## `eachFile`

In `firstError`, `eachFile` stops at the first failing file.

In `all`, it collects ordered failures for every applicable file. Safe params include a zero-based `fileIndex`. Filenames, paths, and file contents are never copied into params.

Direct `await rules.eachFile(...)(files, values)` without context still returns the first inner result (string-compatible). The form pipeline always passes context.

`eachFile` is a combinator, not a catalog key. Inner built-in types (`fileSize`, …) use the catalog.

## Custom, async, form, resolver, and server boundaries

| Source                        | Catalog applied? |
| ----------------------------- | ---------------- |
| Built-in `rules.*`            | Yes              |
| Custom field validators       | No               |
| `rules.async` messages        | No               |
| Form-level `validate`         | No               |
| Resolver / Standard Schema    | No               |
| `setError` / `setErrors`      | No               |
| Root / loader / submit errors | No               |

Keep returning translated strings from those producers when the application owns the locale.

## Dependencies, arrays, unregister, async defaults

Dependent revalidation uses the latest catalog/labels at the start of that cycle. Unrelated fields are not rewritten.

Field-array structured details reindex with the logical item. Already-resolved messages move with the item. `fieldLabels` entries are positional (`products.0.name`) and are **not** rewritten when items move. No wildcard labels.

Unregister still clears canonical details (including localized strings) unless `keepError` is set. Catalog option changes do not unregister fields or clear errors by themselves.

Changing catalogs does not restart `loadDefaultValues`.

## Privacy

Message factories must not log or translate secrets accidentally. The resolver never passes:

- Password values
- File objects or contents
- Complete form values
- Resolver or server payloads

## Known limitations

- No `refreshErrorMessages()` helper — call `validate()` after a locale change
- No wildcard labels (`products.*.name`)
- Custom rule types are not catalog keys
- Schema/resolver/server messages stay as provided
- Direct rule invocation does not apply form catalogs
- The `"Validation failed"` resolver fallback is not a field-rule catalog entry

See `src/examples/LocalizedRegistrationForm.tsx`.
