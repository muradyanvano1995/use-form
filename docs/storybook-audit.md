# Storybook audit (pre-implementation)

Recorded 2026-08-18 against the current workspace. This is a review of **existing** Storybook quality, not a claim that the issues below are already fixed.

## Baseline commands

| Command                   | Result                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm ci`                  | Pass (382 packages)                                                                                 |
| `npm run typecheck`       | Pass                                                                                                |
| `npm run lint`            | Pass                                                                                                |
| `npm run format:check`    | Pass                                                                                                |
| `npm run test`            | Pass — 509 tests, 27 files                                                                          |
| `npm run test:coverage`   | Pass — statements 90.98% / branches 82.71% / functions 94.78% / lines 93.42%                        |
| `npm run build:storybook` | Pass — Storybook 10.5.8. Vite chunk-size warning for `iframe-*.js` (~1.1 MB). No a11y/theme addons. |

Visual review of the **current** build (static `storybook-static` + source CSS): light-only example tokens (`#fff` inputs, `#14213d` text, decorative gradients). There is no theme toolbar, no manager theme, no Docs theme, no viewports, no a11y addon, no play functions. Dark Storybook chrome with these forms produces dark text on dark canvas (or washed light cards on a dark iframe, depending on manager appearance).

## Shared findings (all example stories)

- **Theme:** `src/examples/examples.css` is a light-only palette. Inputs force `background: #fff`. Getting Started has **no** example CSS at all, so native browser defaults apply.
- **Contrast:** Danger `#9f1239` and muted `#4a5568` are acceptable on the paper background in light mode. Dark mode has no tokens, so contrast fails.
- **Controls:** Empty. Story args are unused.
- **Actions:** Empty. `OrderItemsForm` and `ResolverRegistrationForm` use `console.info` (can leak files / emails). Passwords are not sent to Actions because Actions are unused.
- **Play tests:** None.
- **A11y tooling:** None. Several forms use `role="alert"` on every field error (can be noisy). Localized form labels wrap inputs but some errors lack `id` / `aria-describedby`.
- **Responsive:** No viewport config. `.demo-form__row` collapses at 560px; field-array action rows wrap but buttons are small.
- **Docs:** Almost no description, source, or API guidance. Titles sit under a flat `Examples/*` tree instead of a consumer hierarchy.
- **App CSS leak:** Stories do not import `src/index.css` (good). They do import `examples.css` via example components. Introduction has no styles unless the class happens to exist.

## Story-by-story

### `Documentation/Introduction` — `Introduction.stories.tsx` / `Overview`

| Item           | Finding                                                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose        | Two-paragraph placeholder: package is local-only, install placeholder, React 19.                                                                                                                                                                                                                                                      |
| Missing docs   | Landing-page content: problem, maturity, capabilities, principles, type-safety, controlled/uncontrolled, validation architecture, nested paths, arrays, async validation/defaults, resolvers, context, structured errors, i18n, unregister, files, batching/getters, DevTools, SSR, limitations, when to use, links, minimal example. |
| Missing states | N/A (static page).                                                                                                                                                                                                                                                                                                                    |
| Theme          | Uses `demo-page__intro` without loading `examples.css` in this story; typography/colors follow iframe defaults. Unreadable if manager/iframe is dark.                                                                                                                                                                                 |
| Contrast       | Depends on browser default canvas.                                                                                                                                                                                                                                                                                                    |
| Controls       | Empty — **disable and document** (static page).                                                                                                                                                                                                                                                                                       |
| Actions        | Not useful.                                                                                                                                                                                                                                                                                                                           |
| Play tests     | Not needed.                                                                                                                                                                                                                                                                                                                           |
| Decision       | **Improve in place** into a real package landing page. Do not remove.                                                                                                                                                                                                                                                                 |

### `Documentation/Getting started` — `GettingStarted.stories.tsx` / `EmailField`

| Item           | Finding                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose        | One unstyled email field using `useForm` + `rules.required` / `rules.email`. Imports `../lib/index.ts` (good public-entry intent).                                                                                                   |
| Missing docs   | Installation, peers, defaults, register, accessible errors, rules, submit, reset, inference, modes, `useController`, `FormProvider`, nested, arrays, server errors, files, async validation, resolver/devtools subpaths, next steps. |
| Missing states | Error, success, disabled, submitting.                                                                                                                                                                                                |
| Theme          | Unstyled native form. Dark iframe → default UA widgets; labels may inherit dark text.                                                                                                                                                |
| Contrast       | Uncontrolled.                                                                                                                                                                                                                        |
| Controls       | Empty — can add `mode` later on a dedicated modes story; this page should stay a guided walkthrough.                                                                                                                                 |
| Actions        | Submit is discarded (`void values`). Add a redacted success action.                                                                                                                                                                  |
| Play tests     | Required + invalid email + successful submit.                                                                                                                                                                                        |
| Decision       | **Rebuild** as an onboarding flow with focused canvases. Keep a live typed form.                                                                                                                                                     |

### `Examples/Login` — `Login.stories.tsx` / `Default`

| Item           | Finding                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Purpose        | Blur-mode login: email, password, remember-me, backend error for `taken@example.com` (450ms).         |
| Missing docs   | API (`useForm`, `register`, `setErrors`, `submitError`), interaction instructions, success state.     |
| Missing states | Success banner after valid login; disabled form; `focusOnError`; duplicate-submit already default-on. |
| Theme          | Light card; fails in dark globals.                                                                    |
| Contrast       | OK in light; fail in dark. White inputs on light card.                                                |
| Controls       | Add `mode`, `disabled`, `focusOnError`, `preventDuplicateSubmit`.                                     |
| Actions        | `onSubmitSuccess` (redact password), `onSubmitInvalid`, `onReset`, backend-error simulation.          |
| Play tests     | Required, invalid email, success, focus-on-error, backend field error, reset.                         |
| Decision       | **Improve** (primary login demo).                                                                     |

### `Examples/Registration` — `Registration.stories.tsx` / `Default`

| Item             | Finding                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Account creation: custom name rule, password match, age, terms, `exists@example.com` API error, reset-after-success. |
| Missing docs     | `createRule`, `matchesField`, `accepted`, reset behavior.                                                            |
| Missing states   | Disabled. Success exists.                                                                                            |
| Theme / contrast | Same light-only card.                                                                                                |
| Controls         | `disabled`; maybe `mode`.                                                                                            |
| Actions          | Success (redact passwords), invalid, reset, server-error.                                                            |
| Play tests       | Password confirmation mismatch; successful submit.                                                                   |
| Decision         | **Improve**.                                                                                                         |

### `Examples/Nested fields` — `NestedFields.stories.tsx` / `Default` (`ProfileForm`)

| Item           | Finding                                                                             |
| -------------- | ----------------------------------------------------------------------------------- |
| Purpose        | Nested personal/address paths, newsletter checkbox, city `forbidden` backend error. |
| Missing docs   | Path typing, `resetField`, dirty preview.                                           |
| Missing states | Success after save.                                                                 |
| Controls       | `disabled`.                                                                         |
| Actions        | Success, invalid, nested backend error, reset.                                      |
| Play tests     | Nested required + backend city error.                                               |
| Decision       | **Improve**.                                                                        |

### `Examples/Field arrays` — `FieldArrays.stories.tsx` / `Default` (`OrderItemsForm`)

| Item           | Finding                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Purpose        | `useFieldArray` + `FormProvider` + form-level `validate` + file per item.                          |
| Missing docs   | Append/insert/move/swap/clear, `minItems`, focus options.                                          |
| Missing states | Empty-array error after clear; loading. `console.info` on submit.                                  |
| A11y           | Product blocks are not `fieldset`/`legend`. Buttons “Up/Down/Swap” are vague without item context. |
| Controls       | `initialCount`.                                                                                    |
| Actions        | Append/remove/move (not file contents); redacted submit.                                           |
| Play tests     | Add/remove/move; min-items after clear.                                                            |
| Decision       | **Improve**; keep as the field-array demo.                                                         |

### `Examples/Controlled components` — `ControlledComponents.stories.tsx` / `Default`

| Item           | Finding                                                                                 |
| -------------- | --------------------------------------------------------------------------------------- |
| Purpose        | `useController` date / currency parse-format / custom file.                             |
| Missing docs   | When to use controller vs `register`; `parse`/`format`; do not set native file `value`. |
| Missing states | Validation errors, disabled.                                                            |
| Controls       | `disabled`.                                                                             |
| Actions        | Value-change for price/date (not every keystroke for files); redacted submit.           |
| Play tests     | Controlled price update + submit.                                                       |
| Decision       | **Improve**.                                                                            |

### `Examples/File upload` — `FileUpload.stories.tsx` / `Default`

| Item           | Finding                                                                                 |
| -------------- | --------------------------------------------------------------------------------------- |
| Purpose        | Nested avatar + multi documents, type/size/count rules, `virus` filename server reject. |
| Missing docs   | Files not serialized; FormData pattern; client checks are UX only.                      |
| Missing states | Success. Preview image has empty `alt` (decorative — OK if documented).                 |
| Controls       | None meaningful besides `disabled`.                                                     |
| Actions        | Selection/removal metadata only (name/type/size), never contents.                       |
| Play tests     | File validation where `File` is supported.                                              |
| Decision       | **Improve**.                                                                            |

### `Examples/Validation` — `Validation.stories.tsx` / `SubmitMode` + `CustomAndAsyncRules`

| Item         | Finding                                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Reuses `LoginForm` and `UsernameAvailabilityForm` — duplicates Login and Async validation stories.                                                                                      |
| Missing docs | Modes (`onSubmit` / `onBlur` / `onChange`) are not actually controllable; Login is hardcoded `onBlur`.                                                                                  |
| Decision     | **Divide**: keep a **Validation modes** story with a real `mode` control; move async to Validation/Async. Do not delete coverage — retitle and stop duplicating the same default login. |

### `Examples/Custom rules` — `CustomRules.stories.tsx` / `Default` (`PasswordQualityForm`)

| Item         | Finding                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Same component as Structured errors (`PasswordQualityForm`). Demonstrates `criteriaMode: 'all'` and server issue on submit — **not** `createRule` (that lives on Registration).       |
| Missing docs | Title does not match the component.                                                                                                                                                   |
| Decision     | **Retitle** this file to structured-errors demo **or** point Custom rules at Registration’s `createRule` / a dedicated custom-rule snippet. Keep both concepts documented separately. |

### `Examples/Async validation` — `AsyncValidation.stories.tsx` / `Default`

| Item           | Finding                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------ |
| Purpose        | Debounced username check; taken: `admin`, `root`, `taken`; 120ms network + 400ms debounce. |
| Missing docs   | Blur/submit skip debounce; abort on change.                                                |
| Missing states | Success. Submit button exists but `onSubmit` is no-op.                                     |
| Controls       | None (timing is documented, not a control).                                                |
| Actions        | Async request/result with username only.                                                   |
| Play tests     | Type taken name, waitFor error (prefer blur to avoid debounce sleep).                      |
| Decision       | **Improve**.                                                                               |

### `Examples/Async defaults` — `AsyncDefaults.stories.tsx` / `Default`

| Item           | Finding                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Purpose        | `loadDefaultValues` 350ms, preserve dirty, simulate failure via module flag `shouldFailNextLoad`. |
| Missing docs   | Fallback vs loaded baseline; `isLoadingDefaults` / `isDefaultsReady`.                             |
| Missing states | Failure + retry exist. Module-level flag is brittle if two instances mount.                       |
| Controls       | Simulated load result (`success` / `failure`) would teach more than a hidden flag.                |
| Actions        | Load result.                                                                                      |
| Play tests     | Wait for loaded name; optional failure path.                                                      |
| Decision       | **Improve**; make failure deterministic via props, not a shared `let`.                            |

### `Examples/Schema resolver` — `SchemaResolver.stories.tsx` / `Default`

| Item         | Finding                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose      | Custom `FormResolver` (not `standardSchemaResolver`). Input `age: string` → output `number`. `console.info`. `@blocked.test` server error. |
| Missing docs | Resolver vs rules precedence; **missing** Standard Schema subpath example.                                                                 |
| Controls     | `minimumAge` via `resolverContext`.                                                                                                        |
| Actions      | Redacted submit; no `console.info`.                                                                                                        |
| Play tests   | Invalid age; successful transform.                                                                                                         |
| Decision     | **Improve** and add a **second** story for `standardSchemaResolver` from `../resolvers/standard-schema` (or public subpath in copy).       |

### `Examples/Dependent fields` — `DependentFields.stories.tsx` / `Default`

| Item         | Finding                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| Purpose      | Password confirm + CA postal rule depending on country.                                 |
| Missing docs | `dependencies` graph; touch-then-change-source. Password fields missing `autoComplete`. |
| Controls     | None required.                                                                          |
| Actions      | Submit invalid/valid (redact passwords).                                                |
| Play tests   | Confirm mismatch after changing password.                                               |
| Decision     | **Improve**.                                                                            |

### `Examples/Conditional fields` — `ConditionalFields.stories.tsx` / `Default`

| Item         | Finding                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Two stacked demos: `shouldUnregister` true vs false. Radio account type; tax `TAKEN` async.                             |
| Missing docs | Unregister vs preserve; radios. Story is two forms — hard for Controls.                                                 |
| Controls     | Split into two stories with `shouldUnregister` control **or** keep both visible and document why Controls are disabled. |
| Actions      | Mount/unmount; submit payload without inventing company when unregistered.                                              |
| Play tests   | Switch to company, required; switch back unregister.                                                                    |
| Decision     | **Divide** into Unregister vs Preserve stories; keep both.                                                              |

### `Examples/Structured errors` — `StructuredErrors.stories.tsx` / `Default`

| Item                   | Finding                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Purpose                | Duplicate of Custom rules (`PasswordQualityForm`). `criteriaMode: 'all'`, root error, server source, manual error.  |
| Missing docs           | `errorDetails`, `FieldIssue`, root vs field focus. Root error uses `role="alert"` and is not a focus target (good). |
| Duplicate field errors | Primary string + issue list both shown — can double-announce.                                                       |
| Decision               | **Keep as the structured-errors story**; remove duplicate Custom-rules wrapper or retarget Custom rules.            |

### `Examples/Internationalization` — `Internationalization.stories.tsx` / `Default`

| Item         | Finding                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Purpose      | `en` / `hy` catalogs + labels; locale change does not rewrite existing errors until revalidate. |
| Missing docs | No translation library; per-rule override. Errors not wired to `getErrorId` for all fields.     |
| Controls     | `locale`.                                                                                       |
| Actions      | Locale change; revalidate.                                                                      |
| Play tests   | Locale change then revalidate.                                                                  |
| Decision     | **Improve** (a11y ids, fieldset).                                                               |

### `Examples/Batching and getters` — `Batching.stories.tsx` / `Default`

| Item         | Finding                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| Purpose      | `form.batch()` two `setValue`s; `getDirtyValues()` preview.               |
| Missing docs | Imperative getters (`getValues`, `getFieldState`, etc.) are barely shown. |
| Controls     | Disabled while busy — OK.                                                 |
| Actions      | Batch applied (city/country only).                                        |
| Play tests   | Click fill; assert values.                                                |
| Decision     | **Improve**; add a getters readout.                                       |

### `Examples/DevTools` — `DevTools.stories.tsx` / `Default`

| Item         | Finding                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Inline `FormDevTools` with password redaction.                                                                                                                         |
| Missing docs | Separate entry; never core; `redactFiles` / `hideFileNames`. Copy still says `src/devtools`.                                                                           |
| Theme        | Inspector is hardcoded slate (`#0f172a`). Readable internally; does not follow preview theme. Mobile: `position: inline` is OK; default `bottom-right` would cover UI. |
| Controls     | `position`, `initiallyOpen`.                                                                                                                                           |
| Actions      | Not needed (read-only). Document empty Actions.                                                                                                                        |
| Play tests   | Expand/collapse keyboard.                                                                                                                                              |
| Decision     | **Improve**; CSS variables with fallbacks on `FormDevTools` (small compatible change).                                                                                 |

### `Examples/Accessibility` — `Accessibility.stories.tsx` / `LabelsAndErrorIds`

| Item         | Finding                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Reuses `LoginForm` with a short docs description. Duplicate of Login.                                                                          |
| Missing docs | Focus order, `aria-invalid`, `aria-describedby`, live regions, root error not a focus target, reduced motion.                                  |
| Decision     | **Improve into a real a11y guide** plus a focused login canvas; do not delete. Link to Login rather than cloning behavior without explanation. |

## Missing stories (coverage exists in demo app or API, not in Storybook)

| Topic                         | Current gap                                       |
| ----------------------------- | ------------------------------------------------- |
| Context / `FormProvider`      | `ContextProfileForm` is in `App.tsx` only         |
| Watchers / subscriptions      | No dedicated story                                |
| Radio / checkbox groups       | Partial (conditional radios, remember-me, terms)  |
| Standard Schema subpath       | Resolver story uses a hand-written `FormResolver` |
| Checkout / multi-feature form | Missing                                           |
| Backend/root error mapping    | Scattered across login/registration/profile       |
| API overview                  | Missing                                           |
| Limitations / roadmap         | Missing                                           |
| Theme documentation           | Missing                                           |
| Mobile representative story   | Missing                                           |
| Light/dark visual variants    | Missing                                           |

## Configuration gaps

- `.storybook/main.ts`: `addons: []`. No a11y, no explicit docs addon (CSF docs still work via core).
- `.storybook/preview.ts`: controls expanded, padded layout only.
- No `manager.ts`, no `globalTypes.theme`, no viewports, no backgrounds policy, no interaction/a11y tests, no screenshot smoke.

## Actions / sensitive data policy (current)

- Not implemented.
- Risk: `console.info('order submit', values)` includes `File` objects; resolver logs emails.

## Implementation notes (for the rebuild)

- Do not drop coverage of any public feature listed above.
- Duplicate stories should be **re-homed and explained**, not deleted.
- Public copy uses `<package-name>` and subpaths `/devtools` and `/resolvers/standard-schema`.
- Do not invent npm identity, license, or production guarantees.
- `focusOnError` is the public option name (not `shouldFocusError`).
