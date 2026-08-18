import type { FieldErrors, FieldPath, FormValues } from '../formTypes.ts'
import type { CriteriaMode, FieldError, FieldErrorDetails } from '../errors.ts'

export type ResolverOptions<TInput extends FormValues, TContext = undefined> = {
  /** Caller-provided resolver context (not React context). */
  context: TContext
  /**
   * Scope hint for field-oriented validation.
   * Adapters may still validate the whole schema; callers must not assume partial execution.
   */
  names?: readonly FieldPath<TInput>[]
  /** Optional cancellation signal for async resolvers. */
  signal?: AbortSignal
  /** Hint for adapters that can collect multiple issues per path. */
  criteriaMode?: CriteriaMode
}

export type ResolverSuccess<TOutput extends FormValues> = {
  success: true
  values: TOutput
  errors?: undefined
}

export type ResolverFailure<TInput extends FormValues> = {
  success: false
  values?: undefined
  errors: FieldErrors<TInput>
  errorDetails?: FieldErrorDetails<TInput>
  /**
   * Form-level (pathless) schema issue — not keyed by a field path.
   * Accessible via `form.rootError` after validation; blocks submit like field errors.
   */
  rootError?: string
  rootErrorDetails?: FieldError
}

export type ResolverResult<TInput extends FormValues, TOutput extends FormValues = TInput> =
  ResolverSuccess<TOutput> | ResolverFailure<TInput>

/**
 * Schema-library-neutral form resolver.
 * Receives readonly input values; must not mutate live form state.
 * Normal validation failures return `{ success: false, errors }` — do not throw for field errors.
 */
export type FormResolver<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
> = (
  values: Readonly<TInput>,
  options: ResolverOptions<TInput, TContext>,
) => ResolverResult<TInput, TOutput> | Promise<ResolverResult<TInput, TOutput>>
