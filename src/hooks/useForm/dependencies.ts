import type { FieldPath, FormValues } from './baseTypes.ts'
import { parsePath } from './pathUtilities.ts'

/**
 * Consumer dependency map: dependent field → source fields that should revalidate it.
 *
 * @example
 * ```ts
 * {
 *   confirmPassword: ['password'],
 *   'address.postalCode': ['address.country'],
 * }
 * ```
 */
export type FieldDependencies<TValues extends FormValues> = {
  [TDependent in FieldPath<TValues>]?: readonly FieldPath<TValues>[]
}

/** When dependents are revalidated after a source change. Default: `whenTouched`. */
export type DependencyMode = 'whenTouched' | 'always'

/** Internal reverse index: source → dependents (declaration order, deduped). */
export type DependencyIndex = ReadonlyMap<string, readonly string[]>

/**
 * Build a reverse dependency index from consumer config.
 * Drops unsafe/malformed paths. Deduplicates edges. Preserves declaration order.
 * Cycles are allowed; traversal uses a visited set at runtime.
 */
export function buildDependencyIndex(
  dependencies: FieldDependencies<FormValues> | undefined,
): DependencyIndex {
  const reverse = new Map<string, string[]>()
  if (!dependencies) return reverse

  for (const [dependent, sources] of Object.entries(dependencies)) {
    if (!isSafePath(dependent) || !sources) continue
    const seenSources = new Set<string>()
    for (const source of sources) {
      if (typeof source !== 'string' || !isSafePath(source)) continue
      if (seenSources.has(source)) continue
      seenSources.add(source)

      const list = reverse.get(source)
      if (list) {
        if (!list.includes(dependent)) {
          list.push(dependent)
        }
      } else {
        reverse.set(source, [dependent])
      }
    }
  }

  return reverse
}

function isSafePath(path: string): boolean {
  try {
    parsePath(path)
    return true
  } catch {
    return false
  }
}

/**
 * A source path is affected when `changedPath` equals it or is its ancestor
 * (`address` affects `address.country`). Segment-aware — not string-prefix.
 */
export function isSourceAffectedByChange(sourcePath: string, changedPath: string): boolean {
  if (sourcePath === changedPath) return true
  return sourcePath.startsWith(`${changedPath}.`)
}

/**
 * Collect transitive dependents for changed paths (BFS, visited once, declaration order).
 */
export function collectAffectedDependents(
  changedPaths: readonly string[],
  index: DependencyIndex,
): string[] {
  const queue: string[] = []
  const enqueued = new Set<string>()

  for (const changed of changedPaths) {
    for (const [source, dependents] of index) {
      if (!isSourceAffectedByChange(source, changed)) continue
      for (const dependent of dependents) {
        if (enqueued.has(dependent)) continue
        enqueued.add(dependent)
        queue.push(dependent)
      }
    }
  }

  // Transitive expansion
  const result: string[] = []
  const visited = new Set<string>()
  let cursor = 0
  while (cursor < queue.length) {
    const current = queue[cursor]
    cursor += 1
    if (visited.has(current)) continue
    visited.add(current)
    result.push(current)

    for (const [source, dependents] of index) {
      if (!isSourceAffectedByChange(source, current)) continue
      for (const dependent of dependents) {
        if (enqueued.has(dependent)) continue
        enqueued.add(dependent)
        queue.push(dependent)
      }
    }
  }

  return result
}

export type DependentEligibility = {
  touched: boolean
  hasError: boolean
  isSubmitted: boolean
  previouslyValidated: boolean
  force: boolean
  mode: DependencyMode
}

/**
 * Default policy (`whenTouched`): revalidate when touched, has error, submitted,
 * previously validated, or forced. Never marks the dependent touched by itself.
 */
export function shouldRevalidateDependent(eligibility: DependentEligibility): boolean {
  if (eligibility.mode === 'always' || eligibility.force) return true
  return (
    eligibility.touched ||
    eligibility.hasError ||
    eligibility.isSubmitted ||
    eligibility.previouslyValidated
  )
}
