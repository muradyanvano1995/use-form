# useForm maintainability plan

`src/hooks/useForm/useForm.ts` remains the coordinating hook (~2.3k lines). Do **not** move this directory. Prefer incremental extractions over a rewrite.

## Already extracted (keep)

| Module                                                 | Responsibility                                   |
| ------------------------------------------------------ | ------------------------------------------------ |
| `formStore.ts`                                         | External store + opaque `FormControl`            |
| `formBatch.ts`                                         | Batch queue helpers + async-callback guard       |
| `formGetters.ts`                                       | Non-reactive getters                             |
| `defaultValuesLoader.ts`                               | Async defaults merge / types                     |
| `fieldRegistration.ts`                                 | Unregister scheduling / element registry helpers |
| `fieldArrayUtilities.ts`                               | Remappers / keys                                 |
| `dependencies.ts`                                      | Dependent graph                                  |
| `validation/*`                                         | Modes, rules, runners, messages, scheduler       |
| `errors.ts`                                            | Structured error normalization                   |
| `pathUtilities.ts` / `fileHelpers.ts` / `utilities.ts` | Pure helpers                                     |

## Safe next extractions units (one at a time)

1. **Submission orchestration** — `handleSubmit`, submit helpers, submitError clearing (~submit path only).
2. **Input parsing** — `parseIncomingValue` / `formatNativeInputValue` + register change/blur wiring helpers.
3. **Validation scheduling façade** — thin wrappers around existing `validationScheduler` / batch flush already partially present.
4. **Reset / reload orchestration** — `reset`, `resetField`, `reloadDefaultValues` coordination (keep generation counters with the hook).

## Rules for each extraction

- Preserve public behavior and exports.
- Keep granular subscriptions and stable control / method identity.
- Avoid circular imports (`useForm` → helper → `useForm`).
- Run `useForm.test.ts` + related module tests after each move.
- Do not create dozens of tiny files; extract only coherent units.

## Out of scope for now

- Moving `src/hooks/useForm` to another folder.
- Splitting `useForm.test.ts` into thematic files.
- Public API redesign.
