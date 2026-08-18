import type { FieldDirtyMap, FieldErrors } from './formTypes.ts'
import type { DeepPartial, FieldPath, FormValues } from './baseTypes.ts'
import {
  cloneFormValue,
  collectDirtyLeafPaths,
  collectLeafPaths,
  encodePathForId,
  encodeRadioValueForId,
  getLeafPathsAffectedByPartial,
  getValueAtPath,
  leafValuesEqual,
  mergeDeepPartial,
  parsePath,
  setValueAtPath,
} from './pathUtilities.ts'

export {
  cloneFormValue,
  collectDirtyLeafPaths,
  collectLeafPaths,
  deleteValueAtPath,
  encodePathForId,
  encodeRadioValueForId,
  getLeafPathsAffectedByPartial,
  getValueAtPath,
  hasValueAtPath,
  isAtomicValue,
  isPlainObject,
  isSameOrDescendantPath,
  leafValuesEqual,
  mergeDeepPartial,
  parsePath,
  pruneEmptyPlainObjectAncestors,
  removeValueAtPath,
  setValueAtPath,
  InvalidPathError,
  UnsafePathError,
} from './pathUtilities.ts'

export type { DeepPartial, FieldPath, FieldPathValue } from './baseTypes.ts'

/** Deep clone of supported form values. Avoids mutating caller-owned defaults. */
export function cloneValues<T extends FormValues>(values: T): T {
  return cloneFormValue(values)
}

/**
 * Reliable leaf equality for dirty tracking.
 * Uses Object.is for scalars/Files; arrays compare length + per-index Object.is.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  return leafValuesEqual(a, b)
}

export function computeDirtyFields<T extends FormValues>(
  values: T,
  defaultValues: T,
): FieldDirtyMap<T> {
  const dirty: FieldDirtyMap<T> = {}
  for (const path of collectDirtyLeafPaths(values, defaultValues)) {
    dirty[path as FieldPath<T>] = true
  }
  return dirty
}

export function computeIsDirty<T extends FormValues>(values: T, defaultValues: T): boolean {
  return collectDirtyLeafPaths(values, defaultValues).length > 0
}

export function hasFieldErrors<T extends FormValues>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).some((key) => {
    const message = errors[key as FieldPath<T>]
    return typeof message === 'string' && message.length > 0
  })
}

export function omitError<T extends FormValues>(
  errors: FieldErrors<T>,
  name: FieldPath<T>,
): FieldErrors<T> {
  if (!(name in errors)) {
    return errors
  }

  const next = { ...errors }
  delete next[name]
  return next
}

export function mergeErrors<T extends FormValues>(
  ...sources: Array<FieldErrors<T> | undefined>
): FieldErrors<T> {
  const result: FieldErrors<T> = {}

  for (const source of sources) {
    if (!source) continue
    for (const [key, message] of Object.entries(source) as Array<
      [FieldPath<T>, string | undefined]
    >) {
      if (typeof message === 'string' && message.length > 0) {
        try {
          parsePath(key)
          result[key] = message
        } catch {
          // Drop unsafe / malformed backend keys rather than writing them into state.
        }
      }
    }
  }

  return result
}

export function createFieldId(
  formId: string,
  name: string,
  radioValue?: string | number | boolean,
): string {
  const base = `${formId}-field-${encodePathForId(name)}`
  if (radioValue === undefined) return base
  return `${base}-option-${encodeRadioValueForId(String(radioValue))}`
}

export function createErrorId(formId: string, name: string): string {
  return `${formId}-error-${encodePathForId(name)}`
}

export function getFirstErrorField<T extends FormValues>(
  errors: FieldErrors<T>,
  fieldOrder: Array<FieldPath<T>>,
): FieldPath<T> | undefined {
  for (const name of fieldOrder) {
    const message = errors[name]
    if (typeof message === 'string' && message.length > 0) {
      return name
    }
  }

  return (Object.keys(errors) as Array<FieldPath<T>>).find((name) => {
    const message = errors[name]
    return typeof message === 'string' && message.length > 0
  })
}

export function focusFieldById(fieldId: string): void {
  if (typeof document === 'undefined') return

  const element = document.getElementById(fieldId)
  if (element && 'focus' in element && typeof element.focus === 'function') {
    element.focus()
  }
}

export function isCheckboxInput(target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')
  )
}

/**
 * Adapter-friendly normalizer: strip empty error entries so callers can
 * return sparse maps from Zod or other schema libraries.
 */
export function normalizeErrors<T extends FormValues>(
  errors: FieldErrors<T> | undefined | null,
): FieldErrors<T> {
  if (!errors) return {}
  return mergeErrors(errors)
}

export function mergeFormValues<T extends FormValues>(base: T, partial: DeepPartial<T>): T {
  return mergeDeepPartial(base, partial)
}

export function listTouchedPathsFromPartial<T extends FormValues>(
  partial: DeepPartial<T>,
): Array<FieldPath<T>> {
  return getLeafPathsAffectedByPartial(partial) as Array<FieldPath<T>>
}

export function listLeafFieldPaths<T extends FormValues>(values: T): Array<FieldPath<T>> {
  return collectLeafPaths(values) as Array<FieldPath<T>>
}

export function readFieldValue<T extends FormValues, P extends FieldPath<T>>(
  values: T,
  path: P,
): unknown {
  return getValueAtPath(values, path)
}

export function writeFieldValue<T extends FormValues, P extends FieldPath<T>>(
  values: T,
  path: P,
  value: unknown,
): T {
  return setValueAtPath(values, path, value)
}
