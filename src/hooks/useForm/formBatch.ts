import { isSameOrDescendantPath } from './pathUtilities.ts'

export type BatchOptions = {
  /**
   * When true, run one complete validation cycle after the outermost batch exits.
   * Individual `shouldValidate: false` operations do not override this.
   */
  shouldValidate?: boolean
}

/** Synchronous batch work only. Async callbacks are rejected at runtime. */
export type BatchCallback = () => void

export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

export type BatchValidationQueue = {
  forceForm: boolean
  formRequested: boolean
  fieldPaths: string[]
  sourcePaths: string[]
}

export function createBatchValidationQueue(): BatchValidationQueue {
  return {
    forceForm: false,
    formRequested: false,
    fieldPaths: [],
    sourcePaths: [],
  }
}

export function queueUniquePath(paths: string[], path: string): void {
  if (!paths.includes(path)) {
    paths.push(path)
  }
}

export function queueFieldValidation(queue: BatchValidationQueue, path: string): void {
  queueUniquePath(queue.fieldPaths, path)
}

export function queueSourcePath(queue: BatchValidationQueue, path: string): void {
  queueUniquePath(queue.sourcePaths, path)
}

export function dropQueuedPathsUnder(queue: BatchValidationQueue, root: string): void {
  queue.fieldPaths = queue.fieldPaths.filter((path) => !isSameOrDescendantPath(path, root))
  queue.sourcePaths = queue.sourcePaths.filter((path) => !isSameOrDescendantPath(path, root))
}

export function clearQueuedValidation(queue: BatchValidationQueue): void {
  queue.formRequested = false
  queue.fieldPaths = []
  queue.sourcePaths = []
}

export const ASYNC_BATCH_CALLBACK_ERROR =
  'form.batch() does not support async callbacks. Keep the callback synchronous. Mutations before the first await remain applied because batching does not roll back. Perform asynchronous work before or after the batch; do not continue mutating after an await inside the callback.'

export type BatchLifecycleOperation =
  'validate()' | 'validateField()' | 'handleSubmit()' | 'reloadDefaultValues()'

export function createBatchLifecycleError(operation: BatchLifecycleOperation): Error {
  const bare = operation.endsWith('()') ? operation.slice(0, -2) : operation
  return new Error(
    `${operation} cannot be called inside form.batch(). Complete the batch first, then ${bare}.`,
  )
}
