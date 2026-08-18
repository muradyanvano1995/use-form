import type { FieldErrors, FieldPath, FormValues } from '../formTypes.ts'
import {
  detailsFromStringMap,
  ErrorSource,
  fieldErrorFromIssues,
  toFieldErrors,
} from '../errors.ts'
import { hasFieldErrors, normalizeErrors } from '../utilities.ts'
import type { FormResolver, ResolverOptions, ResolverResult } from './resolverTypes.ts'

export type RunResolverArgs<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
> = {
  resolver: FormResolver<TInput, TOutput, TContext>
  values: Readonly<TInput>
  options: ResolverOptions<TInput, TContext>
}

const MALFORMED_SUCCESS = 'Invalid resolver success result'
const MALFORMED_FAILURE = 'Validation failed'

/**
 * Execute a resolver and normalize failure errors (drops empty/unsafe paths).
 * Thrown errors and unexpected rejections propagate to the caller.
 * AbortError / aborted signals are rethrown and must not become field errors.
 *
 * Malformed results are coerced to safe failures — never accidental success.
 */
export async function runResolver<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
>({
  resolver,
  values,
  options,
}: RunResolverArgs<TInput, TOutput, TContext>): Promise<ResolverResult<TInput, TOutput>> {
  if (options.signal?.aborted) {
    const error = new Error('Resolver aborted')
    error.name = 'AbortError'
    throw error
  }

  const result = await resolver(values, options)

  if (result == null || typeof result !== 'object') {
    return {
      success: false,
      errors: {},
      rootError: MALFORMED_FAILURE,
    }
  }

  if (result.success === true) {
    if (result.values == null || typeof result.values !== 'object') {
      return {
        success: false,
        errors: {},
        rootError: MALFORMED_SUCCESS,
      }
    }
    return { success: true, values: result.values }
  }

  if (result.success === false) {
    const errors = normalizeErrors(result.errors)
    const errorDetails = result.errorDetails ?? detailsFromStringMap(errors, ErrorSource.Resolver)
    const rootError =
      typeof result.rootError === 'string' && result.rootError.length > 0
        ? result.rootError
        : undefined
    const rootErrorDetails =
      result.rootErrorDetails ??
      (rootError
        ? fieldErrorFromIssues([{ message: rootError, source: ErrorSource.Resolver, type: 'root' }])
        : undefined)

    const normalizedErrors = toFieldErrors(errorDetails)
    const mergedErrors = hasFieldErrors(normalizedErrors) ? normalizedErrors : errors

    if (!hasFieldErrors(mergedErrors) && !rootError && !rootErrorDetails) {
      return {
        success: false,
        errors: {},
        rootError: MALFORMED_FAILURE,
      }
    }

    return {
      success: false,
      errors: hasFieldErrors(mergedErrors) ? mergedErrors : errors,
      errorDetails,
      rootError: rootErrorDetails?.message ?? rootError,
      rootErrorDetails,
    }
  }

  return {
    success: false,
    errors: {},
    rootError: MALFORMED_FAILURE,
  }
}

/** Keep only errors for the requested field path (field-only validation). */
export function pickResolverFieldError<TInput extends FormValues>(
  errors: FieldErrors<TInput>,
  name: FieldPath<TInput>,
): string | undefined {
  const message = errors[name]
  return typeof message === 'string' && message.length > 0 ? message : undefined
}

/** True when a resolver/pipeline cycle produced any blocking validation failure. */
export function hasValidationFailure<T extends FormValues>(
  errors: FieldErrors<T>,
  rootError: string | undefined,
): boolean {
  return hasFieldErrors(errors) || (typeof rootError === 'string' && rootError.length > 0)
}
