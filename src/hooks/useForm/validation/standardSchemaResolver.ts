import type { FieldErrorDetails, FieldIssue } from '../errors.ts'
import { ErrorSource, fieldErrorFromIssues, toFieldErrors } from '../errors.ts'

/**
 * Minimal Standard Schema v1 surface used by {@link standardSchemaResolver}.
 * Compatible with the documented Standard Schema contract; no concrete library is imported.
 *
 * @see https://standardschema.dev/
 */
export type StandardSchemaV1Issue = {
  message: string
  path?: readonly (string | number | symbol)[]
}

export type StandardSchemaV1Result<TOutput> =
  { value: TOutput; issues?: undefined } | { issues: readonly StandardSchemaV1Issue[] }

export type StandardSchemaV1<TInput = unknown, TOutput = TInput> = {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown,
    ) => StandardSchemaV1Result<TOutput> | Promise<StandardSchemaV1Result<TOutput>>
    readonly types?: {
      readonly input: TInput
      readonly output: TOutput
    }
  }
}

function readStableIssueType(issue: StandardSchemaV1Issue): string | undefined {
  const record = issue as unknown as Record<string, unknown>
  if (typeof record.code === 'string' && record.code.length > 0) return record.code
  if (typeof record.type === 'string' && record.type.length > 0) return record.type
  return undefined
}

function toResolverIssue(issue: StandardSchemaV1Issue): FieldIssue | undefined {
  if (typeof issue?.message !== 'string' || issue.message.length === 0) return undefined
  return {
    message: issue.message,
    type: readStableIssueType(issue),
    source: ErrorSource.Resolver,
  }
}
export function issuePathToDotPath(
  path: readonly (string | number | symbol)[] | undefined,
): string | null {
  if (!path || path.length === 0) return null
  const segments: string[] = []
  for (const segment of path) {
    if (typeof segment === 'symbol') return null
    segments.push(String(segment))
  }
  return segments.join('.')
}

/**
 * Build a form resolver from a Standard Schema–compatible schema.
 *
 * Pathless / empty / symbol-segment issues become `rootError` (first wins).
 * Field issues use first-message-wins per path. A non-empty `issues` array always yields
 * `success: false` — never accidental submission success.
 */
export function standardSchemaResolver<
  TInput extends Record<string, unknown>,
  TOutput extends Record<string, unknown> = TInput,
  TContext = undefined,
>(
  schema: StandardSchemaV1<TInput, TOutput>,
): import('./resolverTypes.ts').FormResolver<TInput, TOutput, TContext> {
  return async (values, options) => {
    if (options.signal?.aborted) {
      const error = new Error('Resolver aborted')
      error.name = 'AbortError'
      throw error
    }

    const result = await schema['~standard'].validate(values)

    if (!result || typeof result !== 'object') {
      return {
        success: false,
        errors: {},
        rootError: 'Validation failed',
      }
    }

    if ('issues' in result && result.issues) {
      const collected = new Map<string, FieldIssue[]>()
      const rootIssues: FieldIssue[] = []
      const collectAll = options.criteriaMode === 'all'

      for (const raw of result.issues) {
        const issue = toResolverIssue(raw)
        if (!issue) continue
        const path = issuePathToDotPath(raw.path)
        if (!path) {
          if (collectAll || rootIssues.length === 0) {
            rootIssues.push(issue)
          }
          continue
        }
        const list = collected.get(path) ?? []
        if (collectAll || list.length === 0) {
          list.push(issue)
          collected.set(path, list)
        }
      }

      const errorDetails: FieldErrorDetails<TInput> = {}
      for (const [path, issues] of collected) {
        const error = fieldErrorFromIssues(issues)
        if (error) {
          errorDetails[path as keyof typeof errorDetails] = error
        }
      }
      const rootErrorDetails = fieldErrorFromIssues(rootIssues)
      const errors = toFieldErrors(errorDetails)

      if (Object.keys(errors).length === 0 && !rootErrorDetails) {
        return {
          success: false,
          errors: {},
          rootError: 'Validation failed',
        }
      }

      return {
        success: false,
        errors: errors,
        errorDetails,
        rootError: rootErrorDetails?.message,
        rootErrorDetails,
      }
    }

    if (!('value' in result) || result.value == null || typeof result.value !== 'object') {
      return {
        success: false,
        errors: {},
        rootError: 'Invalid resolver success result',
      }
    }

    return {
      success: true,
      values: result.value,
    }
  }
}
