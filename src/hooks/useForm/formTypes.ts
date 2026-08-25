import type { ChangeEvent, FocusEvent, RefCallback, SubmitEvent } from 'react'
import type {
  DeepPartial,
  FieldArrayItem,
  FieldArrayPath,
  FieldName,
  FieldPath,
  FieldPathValue,
  FormValues,
  OptionalFieldPath,
} from './baseTypes.ts'
import type { FormControl } from './formStore.ts'
import type { FieldDependencies, DependencyMode } from './dependencies.ts'
import type {
  DefaultValuesLoadMode,
  DefaultValuesLoader,
  ReloadDefaultValuesOptions,
} from './defaultValuesLoader.ts'
import type {
  FormResolver,
  ReValidateMode,
  ValidationMode,
  ValidationResult,
  ValidationRuleContext,
} from './validation'
import type { FieldLabels, ValidationMessageCatalog } from './validation/validationMessages.ts'
import type { UnregisterOptions, UnregisterOptionsFor } from './fieldRegistration.ts'
import type {
  CriteriaMode,
  ErrorSource,
  FieldError,
  FieldErrorDetails,
  FieldIssue,
  SetErrorOptions,
  SetErrorsInput,
  ValidationIssueInput,
} from './errors.ts'
import type { BatchOptions } from './formBatch.ts'

export type { BatchOptions } from './formBatch.ts'

export type ImperativeFieldState<T extends FormValues, P extends FieldPath<T> = FieldPath<T>> = {
  value: FieldPathValue<T, P>
  defaultValue: FieldPathValue<T, P>
  error: string | undefined
  errorDetails: FieldError | undefined
  touched: boolean
  dirty: boolean
  invalid: boolean
  /** True when a native element or controller is currently connected. */
  registered: boolean
  /**
   * True when the path is not in the inactive (unregistered-removed) set.
   * Distinct from `registered`: preserved optional fields stay active after disconnect.
   */
  active: boolean
}

export type {
  DeepPartial,
  FieldArrayItem,
  FieldArrayPath,
  FieldName,
  FieldPath,
  FieldPathValue,
  FormValues,
  OptionalFieldPath,
}
export type { UnregisterOptions, UnregisterOptionsFor }
export type { ValidationMode, ReValidateMode }
export type { FormControl }

export type FieldErrors<T extends FormValues> = Partial<Record<FieldPath<T>, string>>

export type {
  CriteriaMode,
  ErrorSource,
  FieldError,
  FieldErrorDetails,
  FieldIssue,
  SetErrorOptions,
  ValidationIssueInput,
}

export type FieldTouched<T extends FormValues> = Partial<Record<FieldPath<T>, boolean>>

export type FieldDirtyMap<T extends FormValues> = Partial<Record<FieldPath<T>, boolean>>

/** @deprecated Prefer FieldDirtyMap */
export type DirtyFields<T extends FormValues> = FieldDirtyMap<T>

type FieldRuleFn<TValue, TValues> = (
  value: TValue,
  values: Readonly<TValues>,
  context?: ValidationRuleContext<TValues, string>,
) => ValidationResult | Promise<ValidationResult>

/**
 * Per-field validation rules for `useForm({ rules })`.
 * Keys are typed field paths (including nested `address.city` paths).
 */
export type FieldRules<TValues extends FormValues> = {
  [K in FieldPath<TValues>]?:
    | FieldRuleFn<FieldPathValue<TValues, K>, TValues>
    | readonly FieldRuleFn<FieldPathValue<TValues, K>, TValues>[]
}

export type ValidateResult<T extends FormValues> =
  FieldErrors<T> | Promise<FieldErrors<T> | undefined> | undefined

export type ValidateFn<T extends FormValues> = (values: T) => ValidateResult<T>

export type FieldValidateFn<T extends FormValues, K extends FieldPath<T> = FieldPath<T>> = (
  value: FieldPathValue<T, K>,
  values: T,
  context?: ValidationRuleContext<T, string>,
) => ValidationResult | Promise<ValidationResult>

export type FieldValidators<T extends FormValues> = {
  [K in FieldPath<T>]?: FieldValidateFn<T, K> | Array<FieldValidateFn<T, K>>
}

export type SubmitHelpers<TInput extends FormValues> = {
  setError: {
    <K extends FieldPath<TInput>>(name: K, message: string, options?: SetErrorOptions): void
    <K extends FieldPath<TInput>>(
      name: K,
      issue: Exclude<ValidationIssueInput, undefined | string>,
      options?: SetErrorOptions,
    ): void
  }
  setErrors: (
    errors: SetErrorsInput<TInput> | FieldErrors<TInput>,
    options?: SetErrorOptions,
  ) => void
  setSubmitError: (message: string | undefined) => void
  reset: (nextValues?: DeepPartial<TInput>, options?: ResetOptions<TInput>) => void
}

/**
 * Submit handler receives validated/transformed output values.
 * Helpers still mutate input-shaped form state (`TInput`).
 */
export type OnSubmitFn<TOutput extends FormValues, TInput extends FormValues = TOutput> = (
  values: TOutput,
  helpers: SubmitHelpers<TInput>,
) => void | Promise<void>

export type ResetOptions<T extends FormValues> = {
  /** Replace stored default values with the values being reset to. Default: true when nextValues provided. */
  keepDefaultValues?: boolean
  keepErrors?: boolean
  keepTouched?: boolean
  keepDirty?: boolean
  keepIsSubmitted?: boolean
  keepSubmitCount?: boolean
  keepSubmitError?: boolean
  /** Nested or flat paths to leave unchanged when partially resetting. */
  keepValues?: Array<FieldPath<T>>
}

export type SetValueOptions = {
  shouldValidate?: boolean
  shouldTouch?: boolean
  shouldDirty?: boolean
}

type ShouldUnregisterOption<T extends FormValues, K extends FieldPath<T>> = [K] extends [
  OptionalFieldPath<T>,
]
  ? {
      /**
       * When true, this field unregisters after its last element/controller disconnects.
       * Overrides the form-level `shouldUnregister` option. Default: inherit form, then `false`.
       * Only valid for optional paths — required nested children cannot be removed.
       */
      shouldUnregister?: boolean
    }
  : {
      /**
       * Required paths cannot opt into destructive automatic unregister.
       * Unregister an optional parent, or pass `false`.
       */
      shouldUnregister?: false
    }

type SharedRegisterOptions<T extends FormValues, K extends FieldPath<T>> = {
  disabled?: boolean
  required?: boolean
  accept?: string
  /**
   * Override the generated element id. Radio options should pass distinct ids
   * (or rely on value-specific generated ids).
   */
  id?: string
} & ShouldUnregisterOption<T, K>

type StandardRegisterOptions<T extends FormValues, K extends FieldPath<T>> = SharedRegisterOptions<
  T,
  K
> & {
  /**
   * Force checkbox/radio binding. When omitted, booleans use `checked`.
   * Prefer `type: 'file'` for file fields (required for correct uncontrolled props).
   */
  type?: 'text' | 'email' | 'password' | 'number' | 'checkbox' | 'radio' | 'textarea' | 'select'
  /** For radio groups: the option value this input represents. */
  value?: string | number | boolean
  /** Parse input string as number (empty → NaN). */
  valueAsNumber?: boolean
  /** Trim string values on change. */
  trim?: boolean
  /** Optional custom change transformer. */
  setValueAs?: (raw: unknown) => FieldPathValue<T, K>
  multiple?: never
}

type FileSingleRegisterOptions<
  T extends FormValues,
  K extends FieldPath<T>,
> = SharedRegisterOptions<T, K> & {
  type: 'file'
  /** Single-file fields must not set `multiple`. */
  multiple?: false
  setValueAs?: (raw: File | null) => FieldPathValue<T, K>
  value?: never
  valueAsNumber?: never
  trim?: never
}

type FileMultipleRegisterOptions<
  T extends FormValues,
  K extends FieldPath<T>,
> = SharedRegisterOptions<T, K> & {
  type: 'file'
  multiple: true
  setValueAs?: (raw: File[]) => FieldPathValue<T, K>
  value?: never
  valueAsNumber?: never
  trim?: never
}

/**
 * Registration options are discriminated by the field value type when practical:
 * - `File | null` → `type: 'file'` (single)
 * - `File[]` → `type: 'file', multiple: true`
 * - other fields → text/checkbox/radio/number options (no `type: 'file'`)
 */
export type RegisterOptions<T extends FormValues, K extends FieldPath<T> = FieldPath<T>> =
  FieldPathValue<T, K> extends File[]
    ? FileMultipleRegisterOptions<T, K>
    : FieldPathValue<T, K> extends File | null
      ? FileSingleRegisterOptions<T, K>
      : StandardRegisterOptions<T, K>

export type FieldProps = {
  name: string
  id: string
  ref: RefCallback<HTMLElement>
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
  disabled?: boolean
  required?: boolean
  /** Omitted for `type="file"` — file inputs must stay uncontrolled. */
  value?: string | number | readonly string[]
  checked?: boolean
  multiple?: boolean
  accept?: string
}

/**
 * Options for {@link useForm}. Declared as an interface so `rules` is a real declared
 * member (more reliable for IDE language services than a type-alias object type).
 *
 * Generics:
 * - `TInput` — live form values / defaults / mutations
 * - `TOutput` — successful submit payload (defaults to `TInput`)
 * - `TContext` — resolver context value (defaults to `undefined`)
 */
export interface UseFormOptions<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
> {
  defaultValues: TInput
  /**
   * Form-level validation. Ideal for complex cross-field checks.
   * Field messages from `validate` override `rules` / `fieldValidators` for the same key.
   */
  validate?: ValidateFn<TInput>
  /**
   * Declarative per-field rules (preferred).
   * Runs before `fieldValidators`. `criteriaMode` controls whether the first
   * failure wins (`firstError`, default) or every rule is collected (`all`).
   */
  rules?: FieldRules<TInput>
  /** Legacy per-field validators. Prefer `rules` for new code. */
  fieldValidators?: FieldValidators<TInput>
  /**
   * Optional schema-library-neutral resolver.
   * Coexists with `rules` / `validate`. See `docs/schema-resolvers.md` for precedence.
   */
  resolver?: FormResolver<TInput, TOutput, TContext>
  /**
   * Context passed to `resolver` (not React context).
   * Updating this does not reset form values or auto-validate.
   */
  resolverContext?: TContext
  /**
   * Dependent → source fields. When a source changes, eligible dependents revalidate.
   * See `docs/dependent-fields.md`.
   */
  dependencies?: FieldDependencies<TInput>
  /**
   * When dependents revalidate after a source change.
   * Default: `whenTouched` (touched, existing error, submitted, or previously validated).
   */
  dependencyMode?: DependencyMode
  onSubmit?: OnSubmitFn<TOutput, TInput>
  /** When to validate after the first interaction. Default: `onSubmit`. */
  mode?: ValidationMode
  /** When to re-validate after the form has been submitted. Default: `onChange`. */
  reValidateMode?: ReValidateMode
  /** Focus the first invalid field after a failed submit. Default: true. */
  focusOnError?: boolean
  /** Block overlapping submit calls while `isSubmitting` is true. Default: true. */
  preventDuplicateSubmit?: boolean
  /** Optional id prefix; defaults to React `useId()`. */
  id?: string
  /**
   * Async loader for complete input defaults. Requires synchronous `defaultValues`
   * as a type-safe fallback for SSR and the first client render.
   * See `docs/async-default-values.md`.
   */
  loadDefaultValues?: DefaultValuesLoader<TInput, TContext>
  /**
   * How loaded defaults merge with in-progress edits.
   * Default: `preserveDirty`.
   */
  defaultValuesLoadMode?: DefaultValuesLoadMode
  /**
   * When true, run one complete validation cycle after a successful load/reload.
   * Default: `false`.
   */
  validateOnDefaultsLoad?: boolean
  /**
   * When true, allow `handleSubmit` while defaults are still loading.
   * Default: `false` (blocks submission of fallback placeholders).
   */
  allowSubmitWhileLoading?: boolean
  /**
   * When true, allow submit after a failed defaults load.
   * Default: `false`.
   */
  allowSubmitWhenDefaultsFailed?: boolean
  /**
   * When true, unmounted native fields and controllers unregister after a deferred
   * commit/microtask (cancelled if they reconnect). Optional values may be removed.
   * Default: `false` (preserves current values and registration metadata).
   */
  shouldUnregister?: boolean
  /**
   * How many field-rule failures to collect per path.
   * `firstError` (default) preserves existing behavior. `all` evaluates every
   * applicable field rule in declaration order.
   */
  criteriaMode?: CriteriaMode
  /**
   * Per-form built-in validation message catalog. Missing keys fall back to English.
   * Changing this does not reset values or existing errors; revalidate to refresh messages.
   */
  validationMessages?: ValidationMessageCatalog<TInput>
  /**
   * Display labels for field paths. Missing labels fall back to the path string.
   */
  fieldLabels?: FieldLabels<TInput>
}

export interface UseFormReturn<TInput extends FormValues> {
  values: TInput
  /** Snapshot of current default values (never the caller-owned object). */
  defaultValues: TInput
  errors: FieldErrors<TInput>
  /** Canonical structured errors. `errors[path]` is always `errorDetails[path].message`. */
  errorDetails: FieldErrorDetails<TInput>
  touched: FieldTouched<TInput>
  dirtyFields: FieldDirtyMap<TInput>
  isDirty: boolean
  /** True when there are no field errors and no `rootError`. */
  isValid: boolean
  isSubmitting: boolean
  /** True while a validator/resolver is executing.
   * Pending debounce delay (scheduled but not yet started) is **not** validating.
   */
  isValidating: boolean
  /**
   * True while `loadDefaultValues` is in flight (initial or reload).
   * Distinct from `isSubmitting` / `isValidating`.
   */
  isLoadingDefaults: boolean
  /**
   * True after sync-only mount, or after a successful async defaults load.
   * False while loading or after a failed load (until a successful reload).
   */
  isDefaultsReady: boolean
  /**
   * Failure from `loadDefaultValues` / `reloadDefaultValues`.
   * Not a field error, `rootError`, or `submitError`. Abort errors are omitted.
   */
  defaultValuesError: Error | undefined
  isSubmitted: boolean
  submitCount: number
  /** Form-level submission/API error, separate from field errors. */
  submitError: string | undefined
  /**
   * Form-level (pathless) validation error from a resolver / schema issue without a field path.
   * Blocks `isValid`, `validate()`, and submission.
   * Cleared on successful complete validation, `clearErrors()`, `clearRootError()`,
   * and `reset()` unless `keepErrors` preserves it.
   * Field-only validation does not clear an unrelated existing `rootError`.
   * `setErrors()` merges field messages and does not erase `rootError`.
   */
  rootError: string | undefined
  /** Canonical structured root error. `rootError` is always `rootErrorDetails.message`. */
  rootErrorDetails: FieldError | undefined

  /**
   * Stable store handle for granular subscriptions (`useWatch`, `useFormState`, `useFieldState`).
   * Identity does not change across renders; do not use for rendering field values directly.
   */
  control: FormControl<TInput>

  setValue: <K extends FieldPath<TInput>>(
    name: K,
    value: FieldPathValue<TInput, K>,
    options?: SetValueOptions,
  ) => void
  setValues: (values: DeepPartial<TInput>, options?: SetValueOptions) => void
  setError: {
    <K extends FieldPath<TInput>>(name: K, message: string, options?: SetErrorOptions): void
    <K extends FieldPath<TInput>>(
      name: K,
      issue: Exclude<ValidationIssueInput, undefined | string>,
      options?: SetErrorOptions,
    ): void
  }
  setErrors: (
    errors: SetErrorsInput<TInput> | FieldErrors<TInput>,
    options?: SetErrorOptions,
  ) => void
  clearError: <K extends FieldPath<TInput>>(name: K) => void
  /** Clears all field errors and `rootError`. */
  clearErrors: () => void
  /** Clears only `rootError`; field errors are left unchanged. */
  clearRootError: () => void
  setSubmitError: (message: string | undefined) => void

  /**
   * Reset the form.
   * - `reset()` → restore current defaults
   * - `reset(partial)` → deep-merge into defaults and apply (updates defaults unless keepDefaultValues)
   * - `reset(full, { keepDefaultValues: true })` → reset values without changing stored defaults
   *
   * Explicit reset that updates defaults invalidates an in-flight defaults load.
   * After a successful async load, `reset()` restores the loaded defaults.
   */
  reset: (nextValues?: DeepPartial<TInput>, options?: ResetOptions<TInput>) => void
  resetField: <K extends FieldPath<TInput>>(name: K) => void

  /**
   * Explicitly (re)run `loadDefaultValues`. Fails when no loader is configured.
   * Does not auto-run when the loader function identity changes between renders.
   */
  reloadDefaultValues: (options?: ReloadDefaultValuesOptions) => Promise<void>

  validateField: <K extends FieldPath<TInput>>(name: K) => Promise<boolean>
  validate: () => Promise<boolean>

  handleSubmit: (event?: SubmitEvent<HTMLFormElement>) => Promise<void>

  register: <K extends FieldPath<TInput>>(
    name: K,
    options?: RegisterOptions<TInput, K>,
  ) => FieldProps
  getFieldProps: <K extends FieldPath<TInput>>(
    name: K,
    options?: RegisterOptions<TInput, K>,
  ) => FieldProps
  getFieldId: <K extends FieldPath<TInput>>(name: K) => string
  getErrorId: <K extends FieldPath<TInput>>(name: K) => string

  /**
   * Remove registration/DOM metadata for one path or several paths.
   * Defaults preserve the current value; pass `keepValue: false` only for optional paths.
   * See `docs/conditional-fields.md`.
   */
  unregister: {
    <K extends FieldPath<TInput>>(name: K, options?: UnregisterOptionsFor<TInput, K>): void
    <K extends FieldPath<TInput>>(
      name: readonly K[],
      options?: UnregisterOptionsFor<TInput, K>,
    ): void
  }

  /** Current values snapshot. Does not subscribe. */
  getValues: () => TInput
  /** Current value at a typed path. Does not subscribe. */
  getValue: <K extends FieldPath<TInput>>(name: K) => FieldPathValue<TInput, K>
  /** Shallow copy of the string error map. Root errors stay separate. */
  getErrors: () => FieldErrors<TInput>
  /** Shallow copy of canonical structured field errors. Root errors stay separate. */
  getErrorDetails: () => FieldErrorDetails<TInput>
  /** Latest per-field snapshot. Does not subscribe. */
  getFieldState: <K extends FieldPath<TInput>>(name: K) => ImperativeFieldState<TInput, K>
  /** Deep partial of current values at dirty paths. */
  getDirtyValues: () => DeepPartial<TInput>
  /** Deep partial of current values at touched paths (not the touched metadata map). */
  getTouchedValues: () => DeepPartial<TInput>

  /**
   * Apply several mutations as one store notification and one coordinated validation
   * pass. The callback must be synchronous. `validate`, `validateField`, `handleSubmit`,
   * and `reloadDefaultValues` throw if called inside the callback.
   */
  batch: (callback: () => void, options?: BatchOptions) => Promise<void>
}

export type FormInternalState<T extends FormValues> = {
  values: T
  defaultValues: T
  errors: FieldErrors<T>
  errorDetails: FieldErrorDetails<T>
  touched: FieldTouched<T>
  isSubmitting: boolean
  isValidating: boolean
  isLoadingDefaults: boolean
  isDefaultsReady: boolean
  defaultValuesError: Error | undefined
  isSubmitted: boolean
  submitCount: number
  submitError: string | undefined
  rootError: string | undefined
  rootErrorDetails: FieldError | undefined
}
