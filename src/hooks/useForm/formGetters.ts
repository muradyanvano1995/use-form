import type { DeepPartial, FieldPath, FieldPathValue, FormValues } from './baseTypes.ts'
import type { FieldErrorDetails } from './errors.ts'
import type {
  FieldErrors,
  FieldTouched,
  FormInternalState,
  ImperativeFieldState,
} from './formTypes.ts'
import {
  cloneFormValue,
  computeDirtyFields,
  getValueAtPath,
  hasValueAtPath,
  parsePath,
  setValueAtPath,
} from './utilities.ts'

export type FieldPresence = {
  registered: boolean
  active: boolean
}

function comparePathDepth(a: string, b: string): number {
  const depthA = a.split('.').length
  const depthB = b.split('.').length
  return depthA - depthB || (a < b ? -1 : a > b ? 1 : 0)
}

function isCoveredBySelectedAncestor(path: string, selected: ReadonlySet<string>): boolean {
  const segments = path.split('.')
  for (let index = 1; index < segments.length; index += 1) {
    if (selected.has(segments.slice(0, index).join('.'))) return true
  }
  return false
}

/**
 * Reconstruct a deep partial from selected leaf/parent paths and current values.
 * Shorter paths are written first so a dirty parent object is cloned, then child
 * overlays apply. If a parent path is also selected, descendants are skipped so
 * array parents stay arrays (no object properties attached to the array).
 * Unsafe paths are skipped. Sparse indexed writes that cannot be represented
 * without inventing items are skipped.
 */
export function pickPathValues<T extends FormValues>(
  values: T,
  paths: Iterable<string>,
): DeepPartial<T> {
  const unique = [...new Set(paths)]
  const selected = new Set(unique)
  const ordered = unique
    .filter((path) => !isCoveredBySelectedAncestor(path, selected))
    .sort(comparePathDepth)
  let result: unknown = {}

  for (const path of ordered) {
    try {
      parsePath(path)
    } catch {
      continue
    }
    if (!hasValueAtPath(values, path)) continue
    const cloned = cloneFormValue(getValueAtPath(values, path))
    try {
      result = setValueAtPath(result, path, cloned)
    } catch {
      // Skip paths that cannot be reconstructed into a partial tree.
    }
  }

  return result as DeepPartial<T>
}

export function readFormValues<T extends FormValues>(state: FormInternalState<T>): T {
  return cloneFormValue(state.values)
}

export function readFormValue<T extends FormValues, P extends FieldPath<T>>(
  state: FormInternalState<T>,
  name: P,
): FieldPathValue<T, P> {
  parsePath(name)
  return cloneFormValue(getValueAtPath(state.values, name)) as FieldPathValue<T, P>
}

export function readErrors<T extends FormValues>(state: FormInternalState<T>): FieldErrors<T> {
  return { ...state.errors }
}

export function readErrorDetails<T extends FormValues>(
  state: FormInternalState<T>,
): FieldErrorDetails<T> {
  return { ...state.errorDetails }
}

export function readFieldState<T extends FormValues, P extends FieldPath<T>>(
  state: FormInternalState<T>,
  name: P,
  presence: FieldPresence,
): ImperativeFieldState<T, P> {
  parsePath(name)
  const dirtyFields = computeDirtyFields(state.values, state.defaultValues)
  const errorDetails = state.errorDetails[name]
  return {
    value: cloneFormValue(getValueAtPath(state.values, name)) as FieldPathValue<T, P>,
    defaultValue: cloneFormValue(getValueAtPath(state.defaultValues, name)) as FieldPathValue<T, P>,
    error: state.errors[name],
    errorDetails,
    touched: state.touched[name] === true,
    dirty: dirtyFields[name] === true,
    invalid: errorDetails != null && errorDetails.issues.length > 0,
    registered: presence.registered,
    active: presence.active,
  }
}

export function readDirtyValues<T extends FormValues>(state: FormInternalState<T>): DeepPartial<T> {
  const dirtyFields = computeDirtyFields(state.values, state.defaultValues)
  return pickPathValues(state.values, Object.keys(dirtyFields))
}

export function readTouchedValues<T extends FormValues>(
  state: FormInternalState<T>,
  touched: FieldTouched<T> = state.touched,
): DeepPartial<T> {
  const paths = Object.keys(touched).filter((path) => touched[path as FieldPath<T>] === true)
  return pickPathValues(state.values, paths)
}
