import type { CriteriaMode, FieldError, FieldErrorDetails, FieldIssue } from '../errors.ts'
import {
  detailsFromStringMap,
  ErrorSource,
  fieldErrorFromIssues,
  hasFieldErrorDetails,
  mergeFieldErrorDetails,
  syncErrorViews,
  toFieldErrors,
} from '../errors.ts'
import type {
  FieldErrors,
  FieldPath,
  FieldRules,
  FieldValidators,
  FormValues,
  ValidateFn,
} from '../formTypes.ts'
import { listLeafFieldPaths, normalizeErrors } from '../utilities.ts'
import { isInactivePath } from '../fieldRegistration.ts'
import type { FormResolver } from './resolverTypes.ts'
import { pickResolverFieldError, runResolver } from './runResolver.ts'
import type { ValidationReason } from './ruleTypes.ts'
import { runFieldRulesDetailed } from './runRules.ts'
import type { MessageResolutionSnapshot } from './validationMessages.ts'

export type RunValidationArgs<T extends FormValues> = {
  values: T
  validate?: ValidateFn<T>
  rules?: FieldRules<T>
  fieldValidators?: FieldValidators<T>
  /** When set, only these fields' field-level rules run; form-level still runs fully. */
  names?: Array<FieldPath<T>>
  /**
   * Skip field-level rules for these paths and their descendants.
   * Used for inactive/removed optional fields. Form-level `validate` still runs.
   */
  skipFieldPaths?: ReadonlySet<string>
  /** Passed to field rules as `context.reason` (default `manual`). */
  reason?: ValidationReason
  signal?: AbortSignal
  criteriaMode?: CriteriaMode
  messages?: MessageResolutionSnapshot
}

export type ValidationPipelineResult<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
> = {
  errors: FieldErrors<TInput>
  errorDetails: FieldErrorDetails<TInput>
  /** Form-level (pathless) resolver failure — blocks submit like field errors. */
  rootError: string | undefined
  rootErrorDetails: FieldError | undefined
  /**
   * Present only when the merged error set is empty and there is no rootError.
   * With a resolver, this is the successful transformed output.
   * Without a resolver, this is the input snapshot cast as `TOutput` (`TOutput` defaults to `TInput`).
   */
  output: TOutput | undefined
}

async function runFieldAndFormDetails<T extends FormValues>({
  values,
  validate,
  rules,
  fieldValidators,
  names,
  skipFieldPaths,
  reason = 'manual',
  signal,
  criteriaMode = 'firstError',
  messages,
}: RunValidationArgs<T>): Promise<FieldErrorDetails<T>> {
  const fieldNames = (names ?? collectFieldPaths(values, rules, fieldValidators)).filter(
    (name) => !skipFieldPaths || !isInactivePath(name, skipFieldPaths),
  )

  const fieldDetails: FieldErrorDetails<T> = {}

  await Promise.all(
    fieldNames.map(async (name) => {
      const outcome = await runFieldRulesDetailed(name, values, rules, fieldValidators, {
        reason,
        signal,
        scheduleMode: 'immediate',
        criteriaMode,
        messages,
      })
      const error = fieldErrorFromIssues(outcome.issues as FieldIssue[])
      if (error) {
        fieldDetails[name] = error
      }
    }),
  )

  let formDetails: FieldErrorDetails<T> = {}
  if (validate) {
    formDetails = detailsFromStringMap(normalizeErrors(await validate(values)), ErrorSource.Form)
  }

  return mergeFieldErrorDetails(fieldDetails, formDetails)
}

/**
 * Validation order (field + form):
 * 1. Field `rules` (declaration order; first failure or all, per criteriaMode)
 * 2. Legacy `fieldValidators` (same list, after rules)
 * 3. Form-level `validate` — messages for the same field **override** field-level errors
 *
 * Backend/`setErrors` happen after submission outside this runner.
 */
export async function runValidation<T extends FormValues>(
  args: RunValidationArgs<T>,
): Promise<FieldErrors<T>> {
  const details = await runFieldAndFormDetails(args)
  return toFieldErrors(details)
}

function collectFieldPaths<T extends FormValues>(
  values: T,
  rules?: FieldRules<T>,
  fieldValidators?: FieldValidators<T>,
): Array<FieldPath<T>> {
  const paths = new Set<FieldPath<T>>([
    ...listLeafFieldPaths(values),
    ...(Object.keys(rules ?? {}) as Array<FieldPath<T>>),
    ...(Object.keys(fieldValidators ?? {}) as Array<FieldPath<T>>),
  ])
  return [...paths]
}

export type RunValidationPipelineArgs<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
> = RunValidationArgs<TInput> & {
  resolver?: FormResolver<TInput, TOutput, TContext>
  resolverContext: TContext
  signal?: AbortSignal
  /**
   * When true (field-only cycles), resolver errors are filtered to `names` and
   * unrelated resolver issues are ignored for this update.
   */
  fieldScoped?: boolean
}

function emptySuccess<TInput extends FormValues, TOutput extends FormValues>(
  output: TOutput | undefined,
): ValidationPipelineResult<TInput, TOutput> {
  return {
    errors: {},
    errorDetails: {},
    rootError: undefined,
    rootErrorDetails: undefined,
    output,
  }
}

function failureResult<TInput extends FormValues, TOutput extends FormValues>(
  errorDetails: FieldErrorDetails<TInput>,
  rootErrorDetails: FieldError | undefined,
): ValidationPipelineResult<TInput, TOutput> {
  const views = syncErrorViews(errorDetails, rootErrorDetails)
  return {
    ...views,
    output: undefined,
  }
}

/**
 * Full client validation pipeline including an optional schema resolver.
 *
 * Precedence for the same path (later wins):
 * 1. Resolver errors (lowest)
 * 2. Field rules / fieldValidators
 * 3. Form-level `validate` (highest among this pipeline)
 *
 * Manual/backend `setErrors` remain outside and are applied after a successful client pass.
 */
export async function runValidationPipeline<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
>({
  values,
  validate,
  rules,
  fieldValidators,
  names,
  resolver,
  resolverContext,
  signal,
  fieldScoped = false,
  skipFieldPaths,
  reason = 'manual',
  criteriaMode = 'firstError',
  messages,
}: RunValidationPipelineArgs<TInput, TOutput, TContext>): Promise<
  ValidationPipelineResult<TInput, TOutput>
> {
  const baseDetails = await runFieldAndFormDetails({
    values,
    validate,
    rules,
    fieldValidators,
    names,
    skipFieldPaths,
    reason,
    signal,
    criteriaMode,
    messages,
  })

  if (!resolver) {
    if (hasFieldErrorDetails(baseDetails)) {
      return failureResult(baseDetails, undefined)
    }
    return emptySuccess(values as unknown as TOutput)
  }

  const resolverResult = await runResolver({
    resolver,
    values,
    options: {
      context: resolverContext,
      names,
      signal,
      criteriaMode,
    },
  })

  if (resolverResult.success) {
    if (hasFieldErrorDetails(baseDetails)) {
      return failureResult(baseDetails, undefined)
    }
    return emptySuccess(resolverResult.values)
  }

  let resolverDetails =
    resolverResult.errorDetails ?? detailsFromStringMap(resolverResult.errors, ErrorSource.Resolver)
  const rootErrorDetails =
    resolverResult.rootErrorDetails ??
    (resolverResult.rootError
      ? fieldErrorFromIssues([
          {
            message: resolverResult.rootError,
            source: ErrorSource.Resolver,
            type: 'root',
          },
        ])
      : undefined)

  if (fieldScoped && names && names.length > 0) {
    const scoped: FieldErrorDetails<TInput> = {}
    for (const name of names) {
      const detail = resolverDetails[name]
      if (detail) {
        scoped[name] = detail
        continue
      }
      const message = pickResolverFieldError(resolverResult.errors, name)
      const derived = detailsFromStringMap(
        message ? ({ [name]: message } as FieldErrors<TInput>) : {},
        ErrorSource.Resolver,
      )
      if (derived[name]) scoped[name] = derived[name]!
    }
    resolverDetails = scoped
  }

  const merged = mergeFieldErrorDetails(resolverDetails, baseDetails)
  let nextRoot = rootErrorDetails
  if (!hasFieldErrorDetails(merged) && !nextRoot) {
    nextRoot = fieldErrorFromIssues([
      { message: 'Validation failed', source: ErrorSource.Resolver, type: 'root' },
    ])
  }

  return failureResult(merged, nextRoot)
}

/**
 * Single-field validation: field rules/validators, then form-level filtered to that field,
 * then optional resolver scoped to that field. Form-level wins over field; both win over resolver.
 */
export async function runFieldValidation<T extends FormValues>({
  name,
  values,
  validate,
  rules,
  fieldValidators,
  skipFieldPaths,
  reason = 'manual',
  signal,
  criteriaMode = 'firstError',
  messages,
}: {
  name: FieldPath<T>
  values: T
  validate?: ValidateFn<T>
  rules?: FieldRules<T>
  fieldValidators?: FieldValidators<T>
  skipFieldPaths?: ReadonlySet<string>
  reason?: ValidationReason
  signal?: AbortSignal
  criteriaMode?: CriteriaMode
  messages?: MessageResolutionSnapshot
}): Promise<string | undefined> {
  const details = await runFieldAndFormDetails({
    values,
    validate,
    rules,
    fieldValidators,
    names: [name],
    skipFieldPaths,
    reason,
    signal,
    criteriaMode,
    messages,
  })
  return details[name]?.message
}

export type RunFieldValidationPipelineArgs<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
> = {
  name: FieldPath<TInput>
  values: TInput
  validate?: ValidateFn<TInput>
  rules?: FieldRules<TInput>
  fieldValidators?: FieldValidators<TInput>
  resolver?: FormResolver<TInput, TOutput, TContext>
  resolverContext: TContext
  signal?: AbortSignal
  reason?: ValidationReason
  skipFieldPaths?: ReadonlySet<string>
  criteriaMode?: CriteriaMode
  messages?: MessageResolutionSnapshot
}

export async function runFieldValidationPipeline<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
>({
  name,
  values,
  validate,
  rules,
  fieldValidators,
  resolver,
  resolverContext,
  signal,
  reason = 'manual',
  skipFieldPaths,
  criteriaMode = 'firstError',
  messages,
}: RunFieldValidationPipelineArgs<TInput, TOutput, TContext>): Promise<{
  message: string | undefined
  error: import('../errors.ts').FieldError | undefined
  rootError: string | undefined
  rootErrorDetails: import('../errors.ts').FieldError | undefined
}> {
  if (skipFieldPaths && isInactivePath(name, skipFieldPaths)) {
    return {
      message: undefined,
      error: undefined,
      rootError: undefined,
      rootErrorDetails: undefined,
    }
  }

  const baseDetails = await runFieldAndFormDetails({
    values,
    validate,
    rules,
    fieldValidators,
    names: [name],
    skipFieldPaths,
    reason,
    signal,
    criteriaMode,
    messages,
  })
  const baseError = baseDetails[name]

  if (!resolver) {
    return {
      message: baseError?.message,
      error: baseError,
      rootError: undefined,
      rootErrorDetails: undefined,
    }
  }

  if (baseError) {
    return {
      message: baseError.message,
      error: baseError,
      rootError: undefined,
      rootErrorDetails: undefined,
    }
  }

  const result = await runValidationPipeline({
    values,
    validate: undefined,
    rules: undefined,
    fieldValidators: undefined,
    names: [name],
    skipFieldPaths,
    resolver,
    resolverContext,
    signal,
    fieldScoped: true,
    reason,
    criteriaMode,
    messages,
  })

  return {
    message: result.errors[name],
    error: result.errorDetails[name],
    rootError: result.rootError,
    rootErrorDetails: result.rootErrorDetails,
  }
}
