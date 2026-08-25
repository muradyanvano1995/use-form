import type { FieldErrors, FieldTouched, FormValues } from './formTypes.ts'
import type { FieldErrorDetails } from './errors.ts'
import { omitFieldErrorDetail } from './errors.ts'
import type { FieldPath } from './baseTypes.ts'
import {
  cloneFormValue,
  collectDirtyLeafPaths,
  isPlainObject,
  getValueAtPath,
  setValueAtPath,
} from './pathUtilities.ts'
import { cloneValues, omitError } from './utilities.ts'

/** When async defaults are applied relative to in-progress user edits. */
export type DefaultValuesLoadMode = 'preserveDirty' | 'replace'

/** Why a defaults loader invocation started. */
export type DefaultValuesLoadReason = 'initial' | 'reload'

/**
 * Context passed to {@link DefaultValuesLoader}.
 * `signal` may be undefined when `AbortController` is unavailable (SSR-safe).
 */
export type DefaultValuesLoaderContext<TContext = undefined> = {
  signal?: AbortSignal
  reason: DefaultValuesLoadReason
  context: TContext
}

/**
 * Loads complete input defaults. Must return a full `TInput` object (not a partial).
 * Prefer promising values; sync returns are allowed for tests/composition.
 */
export type DefaultValuesLoader<TInput extends FormValues, TContext = undefined> = (
  context: DefaultValuesLoaderContext<TContext>,
) => TInput | Promise<TInput>

export type ReloadDefaultValuesOptions = {
  /** Defaults to the form's `defaultValuesLoadMode` (usually `preserveDirty`). */
  mode?: DefaultValuesLoadMode
  /** When true, run one complete validation cycle after applying. Default false. */
  validate?: boolean
}

export type ApplyLoadedDefaultsArgs<T extends FormValues> = {
  currentValues: T
  previousDefaults: T
  loaded: T
  mode: DefaultValuesLoadMode
  touched: FieldTouched<T>
  errors: FieldErrors<T>
  errorDetails: FieldErrorDetails<T>
}

export type ApplyLoadedDefaultsResult<T extends FormValues> = {
  values: T
  defaultValues: T
  touched: FieldTouched<T>
  errors: FieldErrors<T>
  errorDetails: FieldErrorDetails<T>
}

/**
 * Collect object-key paths whose values are arrays (one field-array level).
 * Does not descend into array items for nested arrays (unsupported).
 */
export function collectArrayFieldPaths(values: unknown, prefix = ''): string[] {
  if (!isPlainObject(values)) return []
  const paths: string[] = []
  for (const key of Object.keys(values)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
    const path = prefix ? `${prefix}.${key}` : key
    const child = values[key]
    if (Array.isArray(child)) {
      paths.push(path)
    } else if (isPlainObject(child)) {
      paths.push(...collectArrayFieldPaths(child, path))
    }
  }
  return paths
}

function isUnderPath(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}.`)
}

/**
 * Runtime guard: loader results must be plain objects (complete `TInput` shape).
 * Does not deep-validate against generics.
 */
export function assertLoadedDefaultValues(value: unknown): asserts value is FormValues {
  if (!isPlainObject(value)) {
    throw new Error('loadDefaultValues must return a complete plain object of form values')
  }
}

export function toDefaultValuesError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'Failed to load default values')
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * Merge loaded defaults with current values.
 *
 * - `replace`: values become a clone of loaded; touched/errors cleared.
 * - `preserveDirty`: loaded becomes new defaults; dirty leaves keep user values;
 *   dirty arrays (or any dirty descendant) keep the entire current array.
 *
 * Successful apply clears `rootError` at the call site. Field errors: cleared for
 * replaced paths; preserved for dirty retained paths. Touched follows the same split.
 */
export function applyLoadedDefaultValues<T extends FormValues>({
  currentValues,
  previousDefaults,
  loaded,
  mode,
  touched,
  errors,
  errorDetails,
}: ApplyLoadedDefaultsArgs<T>): ApplyLoadedDefaultsResult<T> {
  const nextDefaults = cloneValues(loaded)

  if (mode === 'replace') {
    return {
      values: cloneValues(loaded),
      defaultValues: nextDefaults,
      touched: {},
      errors: {},
      errorDetails: {},
    }
  }

  const dirtyPaths = collectDirtyLeafPaths(currentValues, previousDefaults)
  const dirtySet = new Set(dirtyPaths)

  const arrayRoots = new Set([
    ...collectArrayFieldPaths(currentValues),
    ...collectArrayFieldPaths(previousDefaults),
    ...collectArrayFieldPaths(loaded),
  ])

  const dirtyArrays = new Set<string>()
  for (const arrayPath of arrayRoots) {
    if (dirtyPaths.some((path) => isUnderPath(path, arrayPath))) {
      dirtyArrays.add(arrayPath)
    }
  }

  let nextValues = cloneValues(loaded)

  for (const arrayPath of dirtyArrays) {
    const currentArray = getValueAtPath(currentValues, arrayPath)
    nextValues = setValueAtPath(nextValues, arrayPath, cloneFormValue(currentArray))
  }

  for (const path of dirtyPaths) {
    if ([...dirtyArrays].some((root) => isUnderPath(path, root))) {
      continue
    }
    const currentLeaf = getValueAtPath(currentValues, path)
    nextValues = setValueAtPath(nextValues, path, cloneFormValue(currentLeaf))
  }

  const nextTouched: FieldTouched<T> = {}
  for (const [path, value] of Object.entries(touched)) {
    if (value !== true) continue
    if (dirtySet.has(path) || [...dirtyArrays].some((root) => isUnderPath(path, root))) {
      nextTouched[path as FieldPath<T>] = true
    }
  }

  let nextErrors: FieldErrors<T> = { ...errors }
  let nextErrorDetails: FieldErrorDetails<T> = { ...errorDetails }
  for (const path of Object.keys(errors) as Array<FieldPath<T>>) {
    const keep = dirtySet.has(path) || [...dirtyArrays].some((root) => isUnderPath(path, root))
    if (!keep) {
      nextErrors = omitError(nextErrors, path)
      nextErrorDetails = omitFieldErrorDetail(nextErrorDetails, path)
    }
  }

  for (const path of Object.keys(nextErrorDetails) as Array<FieldPath<T>>) {
    const keep = dirtySet.has(path) || [...dirtyArrays].some((root) => isUnderPath(path, root))
    if (!keep) {
      nextErrorDetails = omitFieldErrorDetail(nextErrorDetails, path)
    }
  }

  return {
    values: nextValues,
    defaultValues: nextDefaults,
    touched: nextTouched,
    errors: nextErrors,
    errorDetails: nextErrorDetails,
  }
}
