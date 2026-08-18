/**
 * Per-form, per-path debounce timer registry.
 * Internals are not exported from the package public API.
 */
export type FieldValidationScheduler = {
  /**
   * Schedule work for a canonical field path.
   * Cancels any prior timer for the same path. `delayMs <= 0` runs on the next macrotask
   * via `setTimeout(0)` so callers can still cancel before the task starts.
   */
  schedule: (path: string, delayMs: number, task: () => void | Promise<void>) => void
  /** Cancel a pending timer for one path (does not abort in-flight validators). */
  cancel: (path: string) => void
  cancelAll: () => void
  cancelWhere: (predicate: (path: string) => boolean) => void
  hasPending: (path: string) => boolean
  /** Clear all timers so the registry can be garbage-collected with the form. */
  dispose: () => void
}

export function createFieldValidationScheduler(): FieldValidationScheduler {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  const cancel = (path: string) => {
    const handle = timers.get(path)
    if (handle === undefined) return
    clearTimeout(handle)
    timers.delete(path)
  }

  const cancelAll = () => {
    for (const handle of timers.values()) {
      clearTimeout(handle)
    }
    timers.clear()
  }

  return {
    schedule(path, delayMs, task) {
      cancel(path)
      const ms = delayMs <= 0 ? 0 : delayMs
      const handle = setTimeout(() => {
        timers.delete(path)
        void task()
      }, ms)
      timers.set(path, handle)
    },
    cancel,
    cancelAll,
    cancelWhere(predicate) {
      for (const path of [...timers.keys()]) {
        if (predicate(path)) {
          cancel(path)
        }
      }
    },
    hasPending(path) {
      return timers.has(path)
    },
    dispose: cancelAll,
  }
}
