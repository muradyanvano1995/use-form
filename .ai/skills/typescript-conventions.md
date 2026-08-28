# TypeScript conventions

## Compiler settings that matter here

- `verbatimModuleSyntax`: use `import type` for type-only imports.
- `erasableSyntaxOnly`: no enums / parameter properties / other non-erasable syntax.
- `noUnusedLocals` / `noUnusedParameters`: remove dead code instead of prefix hacks unless intentional.
- Relative imports:
  - **Public / package boundaries** may use directory barrels (`src/lib/index.ts`, `src/hooks/useForm/index.ts`, `src/devtools/index.ts`). Prefer importing the barrel without `/index.ts`.
  - **Internal implementation** should prefer direct module imports with explicit `.ts` / `.tsx` extensions (`./formStore.ts`, `../validation/runRules.ts`) when that clarifies dependencies or avoids circular barrels.
  - Do not add circular barrel re-exports. Do not mechanically rewrite every import without a concrete benefit.

## Form typing rules

- Form value types are plain objects (`FormValues`) that may nest plain objects and one level of arrays.
- `useForm<TInput, TOutput = TInput, TContext = undefined>` — live state is `TInput`; submit output is `TOutput`.
- Field paths are `FieldPath<T>` (includes `'address.city'` and `'products.0.name'`). `FieldName<T>` aliases `FieldPath<T>`.
- `FieldArrayPath<T>` / `FieldArrayItem<T, P>` type `useFieldArray` names and item values.
- `FormResolver<TInput, TOutput, TContext>` is the schema-neutral validation/transform contract.
- `FieldPathValue<T, P>` resolves the value type at path `P`.
- `setValue(path, value)` / `register(path)` / `unregister(path)` / rules must reject invalid paths and value types at compile time.
- `OptionalFieldPath<T>` marks paths whose **exact** property may be absent. Required children of optional parents are not optional. `keepValue: false` / `shouldUnregister: true` are typed against that set.
- Export `UnregisterOptions` / `OptionalFieldPath` — not pending-unregister registries or inactive-path sets.
- `DeepPartial<T>` is used for `setValues` / `reset` nested merges.
- Path expansion depth is capped at 5 nested object levels for compiler performance.
- Nested arrays inside items are not expanded (unsupported in Phase 4).
- File fields use discriminated `RegisterOptions`: `File | null` → `{ type: 'file' }`; `File[]` → `{ type: 'file'; multiple: true }`.
- Prefer `rules` with correctly inferred leaf value types (including `File | null` / `File[]` / array paths).
- `rules.async` validators may take an optional third `ValidationRuleContext`; two-argument validators remain assignable.
- Export `AsyncRuleOptions`, `ValidationReason`, `ValidationRuleContext` from the public barrel — not scheduler/WeakMap internals.
- Export `DefaultValuesLoader`, `DefaultValuesLoaderContext`, `DefaultValuesLoadMode`, `ReloadDefaultValuesOptions` — not load generation/abort internals.
- Complete sync `defaultValues: TInput` remain required when using `loadDefaultValues`.
- `ValidationMode` / `ReValidateMode` are const objects + matching string-literal types (not enums).
- Avoid `any`. Narrow DOM event values carefully in `parseIncomingValue`.

## Public API surface

- Prefer exporting from `src/lib/index.ts` (package core) rather than deep paths.
- Export `FieldPath`, `FieldPathValue`, `FieldArrayPath`, `FieldArrayItem`, `DeepPartial`, `OptionalFieldPath`, `UnregisterOptions`, `FormControl`, `FormResolver` (+ related resolver result types) from core.
- Export `standardSchemaResolver` and `StandardSchemaV1*` types only from `src/resolvers/standard-schema`.
- Export `CriteriaMode`, `ErrorSource`, `FieldIssue`, `FieldError`, `FieldErrorDetails`, `ValidationIssueInput`, `SetErrorOptions` — not canonical maps, merge internals, or `fieldErrorFromIssues`.
- Export `BuiltInRuleType`, `BuiltInRuleParams`, `ValidationMessage`, `ValidationMessageContext`, `ValidationMessageCatalog`, `FieldLabels`, `defaultValidationMessages` — not the message resolver, snapshot symbol, or rule WeakMaps.
- Keep internal path parsers / field-array key stores / remappers / resolver abort registries / debounce timer registries private.
- Keep `FormInternalState`, `createFormStore`, `FormStore`, and `getControlInternals` out of the public barrel.
- Export `BatchOptions` and `ImperativeFieldState` from the core barrel. Export `FormDevTools` only from `src/devtools`.
- `form.batch` callbacks must be synchronous; async callbacks fail at compile time where the generic constraint applies, and always fail at runtime.
- `FormControl` is opaque (branded empty object, frozen); internals live in a module `WeakMap`.
- `useController` / `useFieldArray` / context hooks: generics like `useFieldArray<TValues, TName>` are compile-time assertions when using context.
- Context cannot runtime-verify a caller-provided form-values generic.
- Do not add Zod/Yup/Valibot as core runtime dependencies.
