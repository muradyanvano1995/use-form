import type { DeepPartial, FieldPath, FormValues } from './baseTypes.ts'

const UNSAFE_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor'])

export class UnsafePathError extends Error {
  constructor(path: string, segment: string) {
    super(`Unsafe form path segment "${segment}" in "${path}"`)
    this.name = 'UnsafePathError'
  }
}

export class InvalidPathError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidPathError'
  }
}

/**
 * Plain object check for nested form trees.
 * Arrays, Dates, Files, class instances, and null are not plain objects.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * True when a value is treated as a leaf for dirty/path expansion (not nested further).
 * Arrays are handled separately by collectors — they are not plain-object leaves.
 */
export function isAtomicValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  const type = typeof value
  if (type !== 'object' && type !== 'function') return true
  if (Array.isArray(value)) return true
  return !isPlainObject(value)
}

export function isNumericPathSegment(segment: string): boolean {
  return /^\d+$/.test(segment)
}

export function parsePath(path: string): string[] {
  if (typeof path !== 'string' || path.length === 0) {
    throw new InvalidPathError('Form path must be a non-empty string')
  }
  if (path.includes('..') || path.startsWith('.') || path.endsWith('.')) {
    throw new InvalidPathError(`Invalid form path "${path}"`)
  }

  const segments = path.split('.')
  for (const segment of segments) {
    if (segment.length === 0) {
      throw new InvalidPathError(`Invalid form path "${path}"`)
    }
    if (UNSAFE_SEGMENTS.has(segment)) {
      throw new UnsafePathError(path, segment)
    }
  }
  return segments
}

export function getValueAtPath(values: unknown, path: string): unknown {
  const segments = parsePath(path)
  let current: unknown = values

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    if (!isPlainObject(current) && !Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

export function hasValueAtPath(values: unknown, path: string): boolean {
  const segments = parsePath(path)
  let current: unknown = values

  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!isNumericPathSegment(segment)) return false
      const index = Number(segment)
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return false
      if (!Object.prototype.hasOwnProperty.call(current, index)) return false
      current = current[index]
      continue
    }

    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return false
    }
    current = current[segment]
  }

  return true
}

/**
 * Immutable set at a nested path.
 * Missing intermediate **plain** objects are created as `{}`.
 * Numeric segments write into arrays (no sparse holes; `index === length` appends).
 * Does not mutate `values`. Sibling keys and unrelated references are preserved.
 */
export function setValueAtPath<T>(values: T, path: string, value: unknown): T {
  const segments = parsePath(path)
  return setAtSegments(values, segments, value, 0) as T
}

function setAtSegments(
  current: unknown,
  segments: string[],
  value: unknown,
  index: number,
): unknown {
  const segment = segments[index]!
  const isLast = index === segments.length - 1
  const pathSoFar = segments.slice(0, index).join('.')

  if (Array.isArray(current) || (current === undefined && isNumericPathSegment(segment))) {
    if (!isNumericPathSegment(segment)) {
      throw new InvalidPathError(
        `Expected numeric array index at "${segments.slice(0, index + 1).join('.')}"`,
      )
    }

    const arrayIndex = Number(segment)
    if (!Number.isInteger(arrayIndex) || arrayIndex < 0) {
      throw new InvalidPathError(`Invalid array index "${segment}"`)
    }

    const arr = Array.isArray(current) ? current.slice() : []

    if (arrayIndex > arr.length) {
      throw new InvalidPathError(
        `Cannot set sparse array index ${arrayIndex}${pathSoFar ? ` under "${pathSoFar}"` : ''}`,
      )
    }

    if (isLast) {
      if (arrayIndex === arr.length) {
        arr.push(value)
      } else {
        arr[arrayIndex] = value
      }
      return arr
    }

    if (arrayIndex === arr.length) {
      arr.push({})
    }

    arr[arrayIndex] = setAtSegments(arr[arrayIndex], segments, value, index + 1)
    return arr
  }

  if (current !== undefined && current !== null && !isPlainObject(current)) {
    throw new InvalidPathError(
      `Cannot set path through non-plain value at segment "${pathSoFar || segment}"`,
    )
  }

  const base: Record<string, unknown> = isPlainObject(current) ? current : {}
  const next: Record<string, unknown> = { ...base }

  if (isLast) {
    next[segment] = value
    return next
  }

  next[segment] = setAtSegments(base[segment], segments, value, index + 1)
  return next
}

/**
 * Deep-clone supported form values.
 * - Plain objects: recursive clone
 * - Arrays: new array; plain-object elements deep-cloned; atomics by reference
 * - Date/File/Blob/Map/Set/class instances/functions: same reference (atomic)
 * - Primitives: by value
 */
export function cloneFormValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => (isPlainObject(item) ? cloneFormValue(item) : item)) as T
  }
  if (!isPlainObject(value)) {
    return value
  }

  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value)) {
    result[key] = cloneFormValue(value[key])
  }
  return result as T
}

/**
 * Deep-merge a `DeepPartial` into a base object.
 * - Plain objects merge recursively
 * - Arrays and atomic values replace
 * - `undefined` in `partial` skips the key (does not delete)
 * Does not mutate `base` or `partial`.
 */
export function mergeDeepPartial<T>(base: T, partial: DeepPartial<T>): T {
  if (!isPlainObject(partial)) {
    return cloneFormValue(partial as T)
  }
  if (!isPlainObject(base)) {
    return cloneFormValue(partial as unknown as T)
  }

  const result: Record<string, unknown> = { ...base }
  for (const key of Object.keys(partial)) {
    const nextValue = (partial as Record<string, unknown>)[key]
    if (nextValue === undefined) continue

    const prevValue = result[key]
    if (isPlainObject(nextValue) && isPlainObject(prevValue)) {
      result[key] = mergeDeepPartial(prevValue, nextValue)
    } else {
      result[key] = cloneFormValue(nextValue)
    }
  }
  return result as T
}

/** Collect leaf field paths under a values object (one level of array indices expanded). */
export function collectLeafPaths(values: unknown, prefix = ''): string[] {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return prefix ? [prefix] : []
    }

    const paths: string[] = []
    for (let index = 0; index < values.length; index += 1) {
      const path = prefix ? `${prefix}.${index}` : String(index)
      const child = values[index]
      if (isPlainObject(child)) {
        const nested = collectLeafPaths(child, path)
        paths.push(...(nested.length > 0 ? nested : [path]))
      } else {
        // Primitives, Files, and nested arrays (unsupported) are leaves at this index.
        paths.push(path)
      }
    }
    return paths
  }

  if (!isPlainObject(values)) {
    return prefix ? [prefix] : []
  }

  const keys = Object.keys(values)
  if (keys.length === 0) {
    return prefix ? [prefix] : []
  }

  const paths: string[] = []
  for (const key of keys) {
    if (UNSAFE_SEGMENTS.has(key)) continue
    const child = values[key]
    const path = prefix ? `${prefix}.${key}` : key
    if (isPlainObject(child) || Array.isArray(child)) {
      const nested = collectLeafPaths(child, path)
      if (nested.length === 0) {
        paths.push(path)
      } else {
        paths.push(...nested)
      }
    } else {
      paths.push(path)
    }
  }
  return paths
}

/** Leaf paths that changed between two value trees. */
export function collectDirtyLeafPaths(values: unknown, defaults: unknown, prefix = ''): string[] {
  if (Array.isArray(values) || Array.isArray(defaults)) {
    if (!Array.isArray(values) || !Array.isArray(defaults)) {
      return prefix ? [prefix] : []
    }

    const childDirty: string[] = []
    const max = Math.max(values.length, defaults.length)
    for (let index = 0; index < max; index += 1) {
      const path = prefix ? `${prefix}.${index}` : String(index)

      if (index >= values.length || index >= defaults.length) {
        const present = index < values.length ? values[index] : defaults[index]
        if (isPlainObject(present)) {
          childDirty.push(...collectLeafPaths(present, path))
        } else {
          childDirty.push(path)
        }
        continue
      }

      const current = values[index]
      const baseline = defaults[index]

      if (isPlainObject(current) && isPlainObject(baseline)) {
        childDirty.push(...collectDirtyLeafPaths(current, baseline, path))
      } else if (Array.isArray(current) || Array.isArray(baseline)) {
        if (!leafValuesEqual(current, baseline)) {
          childDirty.push(path)
        }
      } else if (!Object.is(current, baseline)) {
        childDirty.push(path)
      }
    }

    const dirty: string[] = []
    if ((values.length !== defaults.length || childDirty.length > 0) && prefix) {
      dirty.push(prefix)
    }
    dirty.push(...childDirty)
    return dirty
  }

  if (isAtomicValue(values) || isAtomicValue(defaults)) {
    if (!leafValuesEqual(values, defaults)) {
      return prefix ? [prefix] : []
    }
    return []
  }

  if (!isPlainObject(values) || !isPlainObject(defaults)) {
    if (!leafValuesEqual(values, defaults)) {
      return prefix ? [prefix] : []
    }
    return []
  }

  const keys = new Set([...Object.keys(values), ...Object.keys(defaults)])
  const dirty: string[] = []
  for (const key of keys) {
    if (UNSAFE_SEGMENTS.has(key)) continue
    const path = prefix ? `${prefix}.${key}` : key
    dirty.push(...collectDirtyLeafPaths(values[key], defaults[key], path))
  }
  return dirty
}

/**
 * Leaf equality for dirty tracking.
 * - Primitives / Files / Blobs / other atomics: `Object.is`
 * - Arrays (including `File[]`): same length and `Object.is` per index (reorder → dirty)
 */
export function leafValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let index = 0; index < a.length; index += 1) {
      if (!Object.is(a[index], b[index])) return false
    }
    return true
  }
  return false
}

export function getLeafPathsAffectedByPartial<T extends FormValues>(
  partial: DeepPartial<T>,
  prefix = '',
): string[] {
  if (Array.isArray(partial)) {
    return prefix ? [prefix] : []
  }

  if (!isPlainObject(partial)) {
    return prefix ? [prefix] : []
  }

  const paths: string[] = []
  for (const key of Object.keys(partial)) {
    if (UNSAFE_SEGMENTS.has(key)) continue
    const value = partial[key]
    if (value === undefined) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (isPlainObject(value)) {
      const nested = getLeafPathsAffectedByPartial(value as DeepPartial<FormValues>, path)
      paths.push(...(nested.length > 0 ? nested : [path]))
    } else {
      paths.push(path)
    }
  }
  return paths
}

export function assertSafeFieldPath(path: string): asserts path is string {
  parsePath(path)
}

/** Encode a field path into a collision-resistant HTML id fragment.
 * Dot separators are preserved so `address.city` and `address-city` never collide.
 */
export function encodePathForId(path: string): string {
  return parsePath(path)
    .map((segment) => encodeURIComponent(segment))
    .join('.')
}

/**
 * Encode a radio option value for an HTML id.
 * Dots are escaped so `pro.plan` and `pro-plan` cannot collide (`encodeURIComponent`
 * leaves `.` unencoded).
 */
export function encodeRadioValueForId(value: string): string {
  return encodeURIComponent(value).replace(/\./g, '%2E')
}

export function joinFieldPath(parent: string, child: string): FieldPath<FormValues> {
  return (parent ? `${parent}.${child}` : child) as FieldPath<FormValues>
}

/**
 * Segment-aware descendant check.
 * `company.address` matches `company.address.city`; `company` does not match `companyBackup`.
 */
export function isSameOrDescendantPath(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}.`)
}

/**
 * Immutable delete at a nested path.
 * Missing paths return the same reference. Array indices are not spliced —
 * field arrays own structural item removal — but nested object keys inside
 * array items can still be deleted.
 */
export function deleteValueAtPath<T>(values: T, path: string): T {
  const segments = parsePath(path)
  return deleteAtSegments(values, segments, 0) as T
}

function deleteAtSegments(current: unknown, segments: string[], index: number): unknown {
  const segment = segments[index]!
  const isLast = index === segments.length - 1

  if (Array.isArray(current)) {
    if (!isNumericPathSegment(segment)) return current
    const arrayIndex = Number(segment)
    if (!Number.isInteger(arrayIndex) || arrayIndex < 0 || arrayIndex >= current.length) {
      return current
    }

    if (isLast) {
      return current
    }

    const child = current[arrayIndex]
    const nextChild = deleteAtSegments(child, segments, index + 1)
    if (Object.is(nextChild, child)) return current
    const next = current.slice()
    next[arrayIndex] = nextChild
    return next
  }

  if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
    return current
  }

  if (isLast) {
    const next: Record<string, unknown> = { ...current }
    delete next[segment]
    return next
  }

  const child = current[segment]
  const nextChild = deleteAtSegments(child, segments, index + 1)
  if (Object.is(nextChild, child)) return current
  return { ...current, [segment]: nextChild }
}

/**
 * After deleting a nested key, remove empty plain-object ancestors (not arrays, not root).
 * Lets optional objects such as `company?: { name: string }` disappear once every child is gone.
 */
export function pruneEmptyPlainObjectAncestors<T>(values: T, path: string): T {
  const segments = parsePath(path)
  let current = values

  for (let depth = segments.length - 1; depth > 0; depth -= 1) {
    const parentPath = segments.slice(0, depth).join('.')
    const parent = getValueAtPath(current, parentPath)
    if (!isPlainObject(parent) || Object.keys(parent).length > 0) {
      break
    }
    current = deleteValueAtPath(current, parentPath)
  }

  return current
}

/** Delete a path and prune empty plain-object ancestors. */
export function removeValueAtPath<T>(values: T, path: string): T {
  const deleted = deleteValueAtPath(values, path)
  if (Object.is(deleted, values)) return values
  return pruneEmptyPlainObjectAncestors(deleted, path)
}
