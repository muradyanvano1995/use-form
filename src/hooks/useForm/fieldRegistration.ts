import type { FieldPath, FormValues, OptionalFieldPath } from './baseTypes.ts'
import { isSameOrDescendantPath, parsePath } from './pathUtilities.ts'
import type { FocusableFieldElement } from './formStore.ts'

export { isSameOrDescendantPath }

/**
 * Options for {@link UseFormReturn.unregister}.
 *
 * Dirty state is derived from values vs defaults, so there is no `keepDirty`.
 * Dependency configuration is a static consumer map, so there is no `keepDependencies`.
 */
export type UnregisterOptions = {
  /** Keep the current value. Default `true` for explicit `unregister`. */
  keepValue?: boolean
  /** Keep the stored default. Default `true`. */
  keepDefaultValue?: boolean
  /** Keep the field error (and descendant errors when unregistering a parent). Default `false`. */
  keepError?: boolean
  /** Keep touched metadata. Default `false`. */
  keepTouched?: boolean
  /** Keep “previously validated” bookkeeping used by dependent revalidation. Default `false`. */
  keepValidated?: boolean
  /** Run one complete validation cycle after unregistering. Default `false`. */
  shouldValidate?: boolean
}

/**
 * Restrict `keepValue: false` to optional paths when the name is not an optional path.
 * Union names that include a required path cannot opt into destructive removal.
 */
export type UnregisterOptionsFor<TValues extends FormValues, TName extends FieldPath<TValues>> = [
  TName,
] extends [OptionalFieldPath<TValues>]
  ? UnregisterOptions
  : Omit<UnregisterOptions, 'keepValue'> & { keepValue?: true }

export const DEFAULT_EXPLICIT_UNREGISTER_OPTIONS: Required<UnregisterOptions> = {
  keepValue: true,
  keepDefaultValue: true,
  keepError: false,
  keepTouched: false,
  keepValidated: false,
  shouldValidate: false,
}

export const DEFAULT_AUTOMATIC_UNREGISTER_OPTIONS: Required<UnregisterOptions> = {
  keepValue: false,
  keepDefaultValue: true,
  keepError: false,
  keepTouched: false,
  keepValidated: false,
  shouldValidate: false,
}

/** field/controller option → form-level option → `false`. */
export function resolveShouldUnregister(
  fieldOption: boolean | undefined,
  formOption: boolean | undefined,
): boolean {
  return fieldOption ?? formOption ?? false
}

export function resolveUnregisterOptions(
  options: UnregisterOptions | undefined,
  defaults: Required<UnregisterOptions> = DEFAULT_EXPLICIT_UNREGISTER_OPTIONS,
): Required<UnregisterOptions> {
  return {
    keepValue: options?.keepValue ?? defaults.keepValue,
    keepDefaultValue: options?.keepDefaultValue ?? defaults.keepDefaultValue,
    keepError: options?.keepError ?? defaults.keepError,
    keepTouched: options?.keepTouched ?? defaults.keepTouched,
    keepValidated: options?.keepValidated ?? defaults.keepValidated,
    shouldValidate: options?.shouldValidate ?? defaults.shouldValidate,
  }
}

export function isInactivePath(path: string, inactiveRoots: ReadonlySet<string>): boolean {
  for (const root of inactiveRoots) {
    if (isSameOrDescendantPath(path, root)) return true
  }
  return false
}

export function findInactiveRoot(
  path: string,
  inactiveRoots: ReadonlySet<string>,
): string | undefined {
  let found: string | undefined
  for (const root of inactiveRoots) {
    if (!isSameOrDescendantPath(path, root)) continue
    if (found === undefined || root.length < found.length) {
      found = root
    }
  }
  return found
}

/** Remove roots that this path reactivates (self, ancestors, and descendants). */
export function reactivateInactivePath(path: string, inactiveRoots: Set<string>): void {
  for (const root of [...inactiveRoots]) {
    if (isSameOrDescendantPath(path, root) || isSameOrDescendantPath(root, path)) {
      inactiveRoots.delete(root)
    }
  }
}

export function omitPathAndDescendants<T>(
  record: Partial<Record<string, T>>,
  root: string,
): Partial<Record<string, T>> {
  const next: Partial<Record<string, T>> = { ...record }
  for (const key of Object.keys(next)) {
    if (isSameOrDescendantPath(key, root)) {
      delete next[key]
    }
  }
  return next
}

export function omitPathsFromList(paths: readonly string[], root: string): string[] {
  return paths.filter((path) => !isSameOrDescendantPath(path, root))
}

export function collectKeysUnderRoot(keys: Iterable<string>, root: string): string[] {
  const result: string[] = []
  for (const key of keys) {
    if (isSameOrDescendantPath(key, root)) {
      result.push(key)
    }
  }
  return result
}

export function addInactiveRoot(inactiveRoots: Set<string>, path: string): void {
  for (const existing of [...inactiveRoots]) {
    if (isSameOrDescendantPath(existing, path)) {
      inactiveRoots.delete(existing)
    } else if (isSameOrDescendantPath(path, existing)) {
      return
    }
  }
  inactiveRoots.add(path)
}

export type FieldElementRegistry = Map<string, Set<FocusableFieldElement>>

export function connectFieldElement(
  registry: FieldElementRegistry,
  name: string,
  element: FocusableFieldElement,
): void {
  let set = registry.get(name)
  if (!set) {
    set = new Set()
    registry.set(name, set)
  }
  set.add(element)
}

/**
 * @returns `true` when no connected element remains for `name`.
 */
export function disconnectFieldElement(
  registry: FieldElementRegistry,
  name: string,
  element: FocusableFieldElement,
): boolean {
  const set = registry.get(name)
  if (!set) return true
  set.delete(element)
  if (set.size === 0) {
    registry.delete(name)
    return true
  }
  return false
}

export function hasConnectedElements(registry: FieldElementRegistry, name: string): boolean {
  const set = registry.get(name)
  return Boolean(set && set.size > 0)
}

export function getFirstFocusableElement(
  registry: FieldElementRegistry,
  name: string,
): FocusableFieldElement | undefined {
  const set = registry.get(name)
  if (!set) return undefined
  for (const element of set) {
    if (typeof element.focus === 'function') {
      return element
    }
  }
  return undefined
}

export function forEachFieldElement(
  registry: FieldElementRegistry,
  callback: (name: string, element: FocusableFieldElement) => void,
): void {
  for (const [name, set] of registry) {
    for (const element of set) {
      callback(name, element)
    }
  }
}

export function clearFieldElementsUnder(registry: FieldElementRegistry, root: string): void {
  for (const name of [...registry.keys()]) {
    if (isSameOrDescendantPath(name, root)) {
      registry.delete(name)
    }
  }
}

export type DeferredUnregisterScheduler = {
  schedule: (path: string, task: () => void) => void
  cancel: (path: string) => void
  cancelWhere: (predicate: (path: string) => boolean) => void
  cancelAll: () => void
  hasPending: (path: string) => boolean
  dispose: () => void
}

function queueMicrotaskSafe(task: () => void): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(task)
    return
  }
  void Promise.resolve().then(task)
}

/**
 * Deferred, generation-token unregister scheduler.
 * Default transport is `queueMicrotask` (no arbitrary timeout).
 */
export function createDeferredUnregisterScheduler(
  scheduleFn: (task: () => void) => void = queueMicrotaskSafe,
): DeferredUnregisterScheduler {
  const generations = new Map<string, number>()
  const pending = new Set<string>()

  const bump = (path: string) => {
    const next = (generations.get(path) ?? 0) + 1
    generations.set(path, next)
    pending.delete(path)
    return next
  }

  return {
    schedule(path, task) {
      const generation = bump(path)
      pending.add(path)
      scheduleFn(() => {
        if (generations.get(path) !== generation) return
        pending.delete(path)
        task()
      })
    },
    cancel(path) {
      bump(path)
    },
    cancelWhere(predicate) {
      for (const path of [...pending]) {
        if (predicate(path)) {
          bump(path)
        }
      }
    },
    cancelAll() {
      for (const path of [...pending]) {
        bump(path)
      }
    },
    hasPending(path) {
      return pending.has(path)
    },
    dispose() {
      for (const path of [...generations.keys()]) {
        bump(path)
      }
      generations.clear()
    },
  }
}

export function assertSafeUnregisterPath(path: string): void {
  parsePath(path)
}

export function normalizeUnregisterNames(name: string | readonly string[]): string[] {
  if (typeof name === 'string') return [name]
  return [...name]
}
