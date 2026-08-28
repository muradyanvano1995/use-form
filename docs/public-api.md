# Public API inventory

Planned npm package: **`@muradyanvano/use-form`** (pre-release; not published yet). Subpaths below use that scoped name.

Classifications:

- **Stable public API** — intended consumer surface
- **Experimental public API** — may change before 1.0
- **Internal** — must not be imported
- **DevTools-only** — `@muradyanvano/use-form/devtools`
- **Resolver-entry-only** — `@muradyanvano/use-form/resolvers/standard-schema`

Declarations that mention internal types must not make those types importable. Consumers should not import `FormInternalState`, store constructors, serializers, or path parsers.

## Core (`@muradyanvano/use-form`)

### Runtime — stable public API

| Export                      | Kind               |
| --------------------------- | ------------------ |
| `useForm`                   | hook               |
| `useWatch`                  | hook               |
| `useFormState`              | hook               |
| `useFieldState`             | hook               |
| `useController`             | hook               |
| `useFieldArray`             | hook               |
| `FormProvider`              | component          |
| `useFormContext`            | hook               |
| `rules`                     | validation helpers |
| `createRule`                | validation helper  |
| `createAsyncRule`           | validation helper  |
| `ValidationMode`            | const object       |
| `ReValidateMode`            | const object       |
| `CriteriaMode`              | const object       |
| `ErrorSource`               | const object       |
| `normalizeErrors`           | helper             |
| `defaultValidationMessages` | i18n catalog       |

### Types — stable public API

`AsyncRuleOptions`, `BatchOptions`, `BuiltInRuleParams`, `BuiltInRuleType`, `ControllerField`, `ControllerFieldState`, `DeepPartial`, `DefaultValuesLoadMode`, `DefaultValuesLoadReason`, `DefaultValuesLoader`, `DefaultValuesLoaderContext`, `DependencyMode`, `DirtyFields`, `FieldArrayField`, `FieldArrayItem`, `FieldArrayMutationOptions`, `FieldArrayPath`, `FieldDependencies`, `FieldDirtyMap`, `FieldError`, `FieldErrorDetails`, `FieldErrors`, `FieldIssue`, `FieldLabels`, `FieldName`, `FieldPath`, `FieldPathValue`, `FieldProps`, `FieldRules`, `FieldStateSnapshot`, `FieldTouched`, `FieldValidateFn`, `FieldValidators`, `FocusableFieldElement`, `FormControl`, `FormProviderProps`, `FormResolver`, `FormStateSnapshot`, `FormValues`, `ImperativeFieldState`, `OnSubmitFn`, `OptionalFieldPath`, `RegisterOptions`, `ReloadDefaultValuesOptions`, `ResolverFailure`, `ResolverOptions`, `ResolverResult`, `ResolverSuccess`, `ResetOptions`, `SetErrorOptions`, `SetValueOptions`, `SubmitHelpers`, `UnregisterOptions`, `UnregisterOptionsFor`, `UseControllerOptions`, `UseControllerReturn`, `UseFieldArrayOptions`, `UseFieldArrayReturn`, `UseFieldStateOptions`, `UseFormOptions`, `UseFormReturn`, `UseFormStateOptions`, `UseWatchOptions`, `ValidateFn`, `ValidationIssueInput`, `ValidationMessage`, `ValidationMessageCatalog`, `ValidationMessageContext`, `ValidationReason`, `ValidationResult`, `ValidationRule`, `ValidationRuleContext`

### Experimental public API

None at this time. DevTools is a separate entry rather than an experimental core export.

### Absent from core (intentional)

| Name                                           | Where               |
| ---------------------------------------------- | ------------------- |
| `FormDevTools`                                 | DevTools-only       |
| `standardSchemaResolver`                       | Resolver-entry-only |
| `StandardSchemaV1` and related schema types    | Resolver-entry-only |
| `safeSerialize`                                | Internal            |
| `createFormStore`, `getControlInternals`       | Internal            |
| `fieldErrorFromIssues` and error merge helpers | Internal            |
| Field-array key stores / remappers             | Internal            |

## DevTools (`@muradyanvano/use-form/devtools`)

### Runtime — DevTools-only

| Export         | Notes                                 |
| -------------- | ------------------------------------- |
| `FormDevTools` | Read-only inspector; client component |

### Types — DevTools-only

`FormDevToolsProps`, `DevToolsPosition`, `DevToolsRedactionPredicate`

`safeSerialize` is not exported.

### Peers

The DevTools subpath requires **`react`** and **`react-dom`** (portals). Core (`.`) does not import DevTools or `react-dom`; apps that never import `@muradyanvano/use-form/devtools` do not need `react-dom` for the form library itself. `react-dom` remains an optional peer of the package so core-only consumers are not forced to install it.

## Resolver (`@muradyanvano/use-form/resolvers/standard-schema`)

### Runtime — resolver-entry-only

| Export                   | Notes                               |
| ------------------------ | ----------------------------------- |
| `standardSchemaResolver` | No React import; no Zod/Yup/Valibot |

### Types — resolver-entry-only

`StandardSchemaV1`, `StandardSchemaV1Issue`, `StandardSchemaV1Result`

## Module format

ESM only. There is no tested CommonJS `require()` build.

## Client vs server

- Core and DevTools entries preserve `'use client'`.
- Form hooks cannot run inside Server Components.
- The resolver entry has no client directive and no React import.
