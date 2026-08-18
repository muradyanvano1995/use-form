type FocusableMapEntry = {
  focus?: () => void
}

/** Remap an old array index to a new index, or `null` to drop the entry. */
export type IndexRemap = (oldIndex: number) => number | null

export type FieldArrayMutationOptions = {
  shouldValidate?: boolean
  shouldTouch?: boolean
  shouldFocus?: boolean
  /** Relative path within the focused item (e.g. `'name'`). Ignored for primitive arrays. */
  focusName?: string
  /** Index of the item to focus when `shouldFocus` is true. */
  focusIndex?: number
}

/**
 * Parse an indexed descendant of `arrayPath`.
 * Segment-aware: `products` does not match `productsBackup`.
 * Returns `null` for the array path itself and for unrelated paths.
 */
export function parseIndexedPath(
  path: string,
  arrayPath: string,
): { index: number; suffix: string } | null {
  if (path === arrayPath) return null
  const prefix = `${arrayPath}.`
  if (!path.startsWith(prefix)) return null

  const rest = path.slice(prefix.length)
  const match = /^(\d+)(.*)$/.exec(rest)
  if (!match) return null

  const after = match[2] ?? ''
  if (after.length > 0 && !after.startsWith('.')) return null

  return {
    index: Number(match[1]),
    suffix: after,
  }
}

/** True when `path` is `arrayPath` or a descendant under a numeric index. */
export function isArrayPathOrDescendant(path: string, arrayPath: string): boolean {
  if (path === arrayPath) return true
  return parseIndexedPath(path, arrayPath) !== null
}

export function reindexPathRecord<T>(
  record: Partial<Record<string, T>>,
  arrayPath: string,
  remap: IndexRemap,
): Partial<Record<string, T>> {
  const next: Partial<Record<string, T>> = { ...record }
  const moves: Array<[string, T]> = []

  for (const key of Object.keys(record)) {
    const parsed = parseIndexedPath(key, arrayPath)
    if (!parsed) continue
    const value = record[key]
    delete next[key]
    if (value === undefined) continue
    const newIndex = remap(parsed.index)
    if (newIndex === null) continue
    moves.push([`${arrayPath}.${newIndex}${parsed.suffix}`, value])
  }

  for (const [key, value] of moves) {
    next[key] = value
  }
  return next
}

export function omitArrayPathTree<T>(
  record: Partial<Record<string, T>>,
  arrayPath: string,
): Partial<Record<string, T>> {
  const next: Partial<Record<string, T>> = { ...record }
  for (const key of Object.keys(next)) {
    if (isArrayPathOrDescendant(key, arrayPath)) {
      delete next[key]
    }
  }
  return next
}

export function reindexPathList(
  paths: readonly string[],
  arrayPath: string,
  remap: IndexRemap,
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const path of paths) {
    const parsed = parseIndexedPath(path, arrayPath)
    let nextPath = path
    if (parsed) {
      const newIndex = remap(parsed.index)
      if (newIndex === null) continue
      nextPath = `${arrayPath}.${newIndex}${parsed.suffix}`
    }
    if (seen.has(nextPath)) continue
    seen.add(nextPath)
    result.push(nextPath)
  }

  return result
}

export function omitArrayPathsFromList(paths: readonly string[], arrayPath: string): string[] {
  return paths.filter((path) => !isArrayPathOrDescendant(path, arrayPath) || path === arrayPath)
}

export function reindexElementMap<T = FocusableMapEntry>(
  map: Map<string, T>,
  arrayPath: string,
  remap: IndexRemap,
): void {
  const moves: Array<[string, T]> = []

  for (const key of [...map.keys()]) {
    const parsed = parseIndexedPath(key, arrayPath)
    if (!parsed) continue
    const element = map.get(key)
    map.delete(key)
    if (element === undefined) continue
    const newIndex = remap(parsed.index)
    if (newIndex === null) continue
    moves.push([`${arrayPath}.${newIndex}${parsed.suffix}`, element])
  }

  for (const [key, element] of moves) {
    map.set(key, element)
  }
}

export function clearElementMapUnderArray<T = FocusableMapEntry>(
  map: Map<string, T>,
  arrayPath: string,
): void {
  for (const key of [...map.keys()]) {
    if (parseIndexedPath(key, arrayPath)) {
      map.delete(key)
    }
  }
}

export function ensureFieldArrayKeys(
  existing: readonly string[] | undefined,
  length: number,
  allocateKey: () => string,
): string[] {
  const keys = existing ? existing.slice(0, Math.max(0, length)) : []
  while (keys.length < length) {
    keys.push(allocateKey())
  }
  return keys
}

export function allocateFieldArrayKeys(length: number, allocateKey: () => string): string[] {
  return Array.from({ length }, () => allocateKey())
}

export function identityRemap(): IndexRemap {
  return (index) => index
}

export function removeRemap(removedIndex: number): IndexRemap {
  return (index) => {
    if (index === removedIndex) return null
    if (index > removedIndex) return index - 1
    return index
  }
}

export function insertRemap(insertedIndex: number): IndexRemap {
  return (index) => (index >= insertedIndex ? index + 1 : index)
}

export function swapRemap(firstIndex: number, secondIndex: number): IndexRemap {
  return (index) => {
    if (index === firstIndex) return secondIndex
    if (index === secondIndex) return firstIndex
    return index
  }
}

export function moveRemap(fromIndex: number, toIndex: number): IndexRemap {
  return (index) => {
    if (index === fromIndex) return toIndex
    if (fromIndex < toIndex) {
      if (index > fromIndex && index <= toIndex) return index - 1
    } else if (fromIndex > toIndex) {
      if (index >= toIndex && index < fromIndex) return index + 1
    }
    return index
  }
}

export function assertArrayIndex(index: number, length: number, action: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new RangeError(
      `useFieldArray.${action}: index ${index} is out of range for array of length ${length}`,
    )
  }
}

export function assertInsertIndex(index: number, length: number): void {
  if (!Number.isInteger(index) || index < 0 || index > length) {
    throw new RangeError(
      `useFieldArray.insert: index ${index} is out of range for array of length ${length} (0..${length} allowed)`,
    )
  }
}
