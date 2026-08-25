import type { FieldPath, FormValues } from './baseTypes.ts'
import { isPlainObject, isSameOrDescendantPath, parsePath } from './pathUtilities.ts'

type StringErrorMap<T extends FormValues> = Partial<Record<FieldPath<T>, string>>

export const ErrorSource = {
  Rule: 'rule',
  Field: 'field',
  Form: 'form',
  Resolver: 'resolver',
  Server: 'server',
  Manual: 'manual',
} as const

export type ErrorSource = (typeof ErrorSource)[keyof typeof ErrorSource]

export const CriteriaMode = {
  FirstError: 'firstError',
  All: 'all',
} as const

export type CriteriaMode = (typeof CriteriaMode)[keyof typeof CriteriaMode]

export const VALIDATION_ERROR_SOURCES = [
  ErrorSource.Rule,
  ErrorSource.Field,
  ErrorSource.Form,
  ErrorSource.Resolver,
] as const

export type ValidationErrorSource = (typeof VALIDATION_ERROR_SOURCES)[number]

export type FieldIssue = {
  readonly message: string
  readonly type?: string
  readonly source: ErrorSource
  readonly params?: Readonly<Record<string, unknown>>
}

export type FieldError = {
  readonly message: string
  readonly type?: string
  readonly source: ErrorSource
  readonly params?: Readonly<Record<string, unknown>>
  readonly issues: readonly FieldIssue[]
}

export type FieldErrorDetails<T extends FormValues> = Partial<Record<FieldPath<T>, FieldError>>

export type ValidationIssueInput =
  | string
  | {
      message: string
      type?: string
      params?: Readonly<Record<string, unknown>>
    }
  | undefined

export type SetErrorOptions = {
  /** Defaults to `manual`. Pass `server` for backend mapping. */
  source?: 'manual' | 'server'
  type?: string
  params?: Readonly<Record<string, unknown>>
}

export type SetErrorsInput<T extends FormValues> = Partial<
  Record<FieldPath<T>, string | Exclude<ValidationIssueInput, undefined>>
>

const ERROR_SOURCES = new Set<string>(Object.values(ErrorSource))

export function isErrorSource(value: unknown): value is ErrorSource {
  return typeof value === 'string' && ERROR_SOURCES.has(value)
}

export function isValidationErrorSource(source: ErrorSource): source is ValidationErrorSource {
  return (VALIDATION_ERROR_SOURCES as readonly string[]).includes(source)
}

const MAX_PARAMS_DEPTH = 8

/** Per-runtime identity for host objects that cannot be compared structurally. */
let nextHostIdentity = 1
const hostIdentities = new WeakMap<object, number>()

function hostIdentityTag(value: object): string {
  let id = hostIdentities.get(value)
  if (id === undefined) {
    nextHostIdentity += 1
    id = nextHostIdentity - 1
    hostIdentities.set(value, id)
  }
  return `${Object.prototype.toString.call(value)}#${id}`
}

/**
 * Deep-clone and freeze plain objects/arrays. Cycles are preserved via visited-reference
 * tracking. File, Blob, Date, Map, Set, class instances, and functions are copied by
 * reference and never frozen. Consumer-owned objects are never frozen in place.
 */
function cloneAndFreezeValue(
  value: unknown,
  depth: number,
  seen: WeakMap<object, unknown>,
): unknown {
  if (value === null || typeof value !== 'object') return value
  if (!Array.isArray(value) && !isPlainObject(value)) return value

  const existing = seen.get(value)
  if (existing !== undefined) return existing
  if (depth > MAX_PARAMS_DEPTH) return value

  if (Array.isArray(value)) {
    const cloned: unknown[] = []
    seen.set(value, cloned)
    for (const item of value) {
      cloned.push(cloneAndFreezeValue(item, depth + 1, seen))
    }
    return Object.freeze(cloned)
  }

  const cloned: Record<string, unknown> = {}
  seen.set(value, cloned)
  for (const [key, nested] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
    cloned[key] = cloneAndFreezeValue(nested, depth + 1, seen)
  }
  return Object.freeze(cloned)
}

/**
 * Stable identity for params used by exact-duplicate detection.
 * Plain JSON-like values are encoded structurally. Dates use ISO time.
 * File/Blob/Map/Set/class instances/functions use per-runtime reference tags —
 * distinct references are never treated as equal, and file contents are not read.
 */
function stableEncode(value: unknown, depth: number, seen: WeakSet<object>): string {
  if (depth > MAX_PARAMS_DEPTH) return '"[MaxDepth]"'
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value)
    case 'number':
      if (Number.isNaN(value)) return 'NaN'
      if (Object.is(value, -0)) return '-0'
      return String(value)
    case 'boolean':
      return value ? 'true' : 'false'
    case 'bigint':
      return `${value}n`
    case 'function':
      return hostIdentityTag(value)
    case 'symbol':
      return `"${String(value)}"`
    case 'object': {
      if (seen.has(value)) return '"[Circular]"'
      if (Array.isArray(value)) {
        seen.add(value)
        return `[${value.map((item) => stableEncode(item, depth + 1, seen)).join(',')}]`
      }
      if (isPlainObject(value)) {
        seen.add(value)
        const keys = Object.keys(value)
          .filter((key) => key !== '__proto__' && key !== 'prototype' && key !== 'constructor')
          .sort()
        return `{${keys
          .map((key) => `${JSON.stringify(key)}:${stableEncode(value[key], depth + 1, seen)}`)
          .join(',')}}`
      }
      if (value instanceof Date) {
        const time = value.getTime()
        return `Date(${Number.isNaN(time) ? 'NaN' : value.toISOString()})`
      }
      return hostIdentityTag(value)
    }
    default:
      return '"[Unknown]"'
  }
}

function issueIdentityKey(issue: FieldIssue): string {
  const paramsKey = issue.params ? stableEncode(issue.params, 0, new WeakSet()) : ''
  return `${issue.source}\0${issue.type ?? ''}\0${issue.message}\0${paramsKey}`
}

export function freezeParams(
  params: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!params) return undefined
  const cloned: Record<string, unknown> = {}
  const seen = new WeakMap<object, unknown>()
  seen.set(params, cloned)
  for (const [key, value] of Object.entries(params)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
    cloned[key] = cloneAndFreezeValue(value, 1, seen)
  }
  return Object.freeze(cloned)
}

function freezeIssue(issue: FieldIssue): FieldIssue {
  return Object.freeze({
    message: issue.message,
    type: issue.type,
    source: issue.source,
    params: issue.params,
  })
}

/**
 * Build a canonical {@link FieldError} from issues.
 * Primary `message` / `type` / `source` / `params` are taken from `issues[0]`.
 * Empty issue lists are invalid and return `undefined`.
 */
export function fieldErrorFromIssues(issues: readonly FieldIssue[]): FieldError | undefined {
  const normalized: FieldIssue[] = []
  const seen = new Set<string>()

  for (const issue of issues) {
    if (typeof issue.message !== 'string' || issue.message.length === 0) continue
    if (!isErrorSource(issue.source)) continue
    const frozen = freezeIssue({
      message: issue.message,
      type: typeof issue.type === 'string' && issue.type.length > 0 ? issue.type : undefined,
      source: issue.source,
      params: freezeParams(issue.params),
    })
    const key = issueIdentityKey(frozen)
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(frozen)
  }

  if (normalized.length === 0) return undefined
  const primary = normalized[0]
  return Object.freeze({
    message: primary.message,
    type: primary.type,
    source: primary.source,
    params: primary.params,
    issues: Object.freeze(normalized),
  })
}

export function issueFromInput(
  input: ValidationIssueInput,
  source: ErrorSource,
  fallbackType?: string,
  fallbackParams?: Readonly<Record<string, unknown>>,
): FieldIssue | undefined {
  if (input == null) return undefined

  if (typeof input === 'string') {
    if (input.length === 0) return undefined
    return freezeIssue({
      message: input,
      type: fallbackType,
      source,
      params: freezeParams(fallbackParams),
    })
  }

  if (typeof input !== 'object') return undefined
  if (typeof input.message !== 'string' || input.message.length === 0) return undefined

  return freezeIssue({
    message: input.message,
    type: typeof input.type === 'string' && input.type.length > 0 ? input.type : fallbackType,
    source,
    params: freezeParams(input.params ?? fallbackParams),
  })
}

export function toFieldErrors<T extends FormValues>(
  details: FieldErrorDetails<T> | undefined,
): StringErrorMap<T> {
  if (!details) return {}
  const errors: StringErrorMap<T> = {}
  for (const [path, error] of Object.entries(details) as Array<
    [FieldPath<T>, FieldError | undefined]
  >) {
    if (error && error.message.length > 0) {
      errors[path] = error.message
    }
  }
  return errors
}

export function syncErrorViews<T extends FormValues>(
  errorDetails: FieldErrorDetails<T>,
  rootErrorDetails: FieldError | undefined,
): {
  errors: StringErrorMap<T>
  errorDetails: FieldErrorDetails<T>
  rootError: string | undefined
  rootErrorDetails: FieldError | undefined
} {
  return {
    errors: toFieldErrors(errorDetails),
    errorDetails,
    rootError: rootErrorDetails?.message,
    rootErrorDetails,
  }
}

export function setFieldErrorDetail<T extends FormValues>(
  details: FieldErrorDetails<T>,
  name: FieldPath<T>,
  error: FieldError | undefined,
): FieldErrorDetails<T> {
  if (!error) {
    if (!(name in details)) return details
    const next = { ...details }
    delete next[name]
    return next
  }
  return { ...details, [name]: error }
}

export function omitFieldErrorDetail<T extends FormValues>(
  details: FieldErrorDetails<T>,
  name: FieldPath<T>,
): FieldErrorDetails<T> {
  return setFieldErrorDetail(details, name, undefined)
}

export function omitFieldErrorDetailsUnder<T extends FormValues>(
  details: FieldErrorDetails<T>,
  root: string,
): FieldErrorDetails<T> {
  let changed = false
  const next: FieldErrorDetails<T> = { ...details }
  for (const path of Object.keys(next)) {
    if (isSameOrDescendantPath(path, root)) {
      delete next[path as FieldPath<T>]
      changed = true
    }
  }
  return changed ? next : details
}

export function mergeFieldErrorDetails<T extends FormValues>(
  ...sources: Array<FieldErrorDetails<T> | undefined>
): FieldErrorDetails<T> {
  const result: FieldErrorDetails<T> = {}
  for (const source of sources) {
    if (!source) continue
    for (const [path, error] of Object.entries(source) as Array<
      [FieldPath<T>, FieldError | undefined]
    >) {
      if (!error) continue
      try {
        parsePath(path)
      } catch {
        continue
      }
      result[path] = error
    }
  }
  return result
}

/** Keep manual/server issues; drop validation-pipeline sources for one path. */
export function stripValidationIssues(error: FieldError | undefined): FieldError | undefined {
  if (!error) return undefined
  const kept = error.issues.filter((issue) => !isValidationErrorSource(issue.source))
  return fieldErrorFromIssues(kept)
}

export function stripValidationIssueAtPath<T extends FormValues>(
  details: FieldErrorDetails<T>,
  name: FieldPath<T>,
): FieldErrorDetails<T> {
  return setFieldErrorDetail(details, name, stripValidationIssues(details[name]))
}

/** Drop `server` issues (they describe the previous submitted value). Keep `manual`. */
export function stripServerIssues(error: FieldError | undefined): FieldError | undefined {
  if (!error) return undefined
  const kept = error.issues.filter((issue) => issue.source !== ErrorSource.Server)
  return fieldErrorFromIssues(kept)
}

export function stripServerIssuesUnder<T extends FormValues>(
  details: FieldErrorDetails<T>,
  root: string,
): FieldErrorDetails<T> {
  let next = details
  for (const path of Object.keys(details) as Array<FieldPath<T>>) {
    if (!isSameOrDescendantPath(path, root)) continue
    next = setFieldErrorDetail(next, path, stripServerIssues(next[path]))
  }
  return next
}

export function hasFieldErrorDetails<T extends FormValues>(
  details: FieldErrorDetails<T> | undefined,
): boolean {
  if (!details) return false
  for (const key of Object.keys(details) as Array<FieldPath<T>>) {
    const error = details[key]
    if (error != null && error.issues.length > 0) return true
  }
  return false
}

export function detailsFromStringMap<T extends FormValues>(
  errors: StringErrorMap<T> | undefined,
  source: ErrorSource,
  type?: string,
): FieldErrorDetails<T> {
  if (!errors) return {}
  const details: FieldErrorDetails<T> = {}
  for (const [path, message] of Object.entries(errors) as Array<
    [FieldPath<T>, string | undefined]
  >) {
    const issue = issueFromInput(message, source, type)
    const error = issue ? fieldErrorFromIssues([issue]) : undefined
    if (error) {
      try {
        parsePath(path)
        details[path] = error
      } catch {
        // Drop unsafe keys.
      }
    }
  }
  return details
}

export function detailsFromSetErrorsInput<T extends FormValues>(
  input: SetErrorsInput<T> | StringErrorMap<T> | undefined,
  options?: SetErrorOptions,
): FieldErrorDetails<T> {
  if (!input) return {}
  const source = options?.source ?? ErrorSource.Manual
  const details: FieldErrorDetails<T> = {}
  for (const [path, value] of Object.entries(input) as Array<
    [FieldPath<T>, string | Exclude<ValidationIssueInput, undefined> | undefined]
  >) {
    const issue = issueFromInput(value, source, options?.type, options?.params)
    const error = issue ? fieldErrorFromIssues([issue]) : undefined
    if (!error) continue
    try {
      parsePath(path)
      details[path] = error
    } catch {
      // Drop unsafe keys.
    }
  }
  return details
}

export function manualFieldError(
  input: string | Exclude<ValidationIssueInput, undefined>,
  options?: SetErrorOptions,
): FieldError | undefined {
  const source = options?.source ?? ErrorSource.Manual
  const issue = issueFromInput(input, source, options?.type, options?.params)
  return issue ? fieldErrorFromIssues([issue]) : undefined
}
