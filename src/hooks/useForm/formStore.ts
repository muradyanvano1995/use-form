import type {
  FieldPath,
  FieldPathValue,
  FormInternalState,
  FormValues,
  SetValueOptions,
} from './formTypes.ts'
import type { FieldArrayMutationOptions, IndexRemap } from './fieldArrayUtilities.ts'

export type FormStoreListener = () => void

export type FormStore<TState> = {
  getState: () => TState
  getServerSnapshot: () => TState
  setState: (next: TState | ((prev: TState) => TState)) => void
  subscribe: (listener: FormStoreListener) => () => void
  beginTransaction: () => void
  endTransaction: () => void
  getTransactionDepth: () => number
}

/** Minimal focus contract for registered / controller field elements. */
export type FocusableFieldElement = {
  focus?: () => void
}

export type ApplyFieldArrayChangeArgs = {
  name: string
  nextItems: unknown[]
  nextKeys: string[]
  /** Structural remapping for metadata, or `'replace'` to drop all indexed metadata. */
  remap: IndexRemap | 'replace'
  options?: FieldArrayMutationOptions
}

/** Imperative handlers bound by `useForm` (not part of the public control surface). */
export type FormControlHandlers<T extends FormValues> = {
  setValue: <K extends FieldPath<T>>(
    name: K,
    value: FieldPathValue<T, K>,
    options?: SetValueOptions,
  ) => void
  blurField: (name: FieldPath<T>) => void
  connectElement: (name: FieldPath<T>, element: FocusableFieldElement) => void
  disconnectElement: (name: FieldPath<T>, element: FocusableFieldElement) => void
  retainController: (name: FieldPath<T>, options?: { shouldUnregister?: boolean }) => void
  releaseController: (name: FieldPath<T>) => void
  markFieldRegistered: (name: FieldPath<T>) => void
  applyFieldArrayChange: (args: ApplyFieldArrayChangeArgs) => void
  getFieldArrayKeys: (name: string) => readonly string[] | undefined
  ensureFieldArrayKeys: (name: string, length: number) => readonly string[]
  allocateFieldArrayKey: () => string
}

function notifyListeners(listeners: Set<FormStoreListener>): void {
  for (const listener of [...listeners]) {
    listener()
  }
}

/**
 * Minimal external store for form state.
 * Subscribers are notified after each `setState` when the state reference changes,
 * except inside an open transaction — then notification waits for the outermost
 * `endTransaction` if the final snapshot differs from the snapshot at begin.
 */
export function createFormStore<TState>(initialState: TState): FormStore<TState> {
  let state = initialState
  const listeners = new Set<FormStoreListener>()
  let transactionDepth = 0
  let snapshotAtTransactionStart = initialState

  return {
    getState: () => state,
    /** Stable reference until `setState` replaces state (SSR-safe for `useSyncExternalStore`). */
    getServerSnapshot: () => state,
    setState: (next) => {
      const resolved = typeof next === 'function' ? (next as (prev: TState) => TState)(state) : next
      if (Object.is(resolved, state)) return
      state = resolved
      if (transactionDepth > 0) return
      notifyListeners(listeners)
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    beginTransaction: () => {
      if (transactionDepth === 0) {
        snapshotAtTransactionStart = state
      }
      transactionDepth += 1
    },
    endTransaction: () => {
      if (transactionDepth === 0) return
      transactionDepth -= 1
      if (transactionDepth === 0 && !Object.is(state, snapshotAtTransactionStart)) {
        notifyListeners(listeners)
      }
    },
    getTransactionDepth: () => transactionDepth,
  }
}

declare const formControlBrand: unique symbol

/**
 * Opaque stable handle for subscription / controller hooks.
 * Internals live in a module WeakMap — consumers cannot read store or handlers from the public type.
 * The empty control object is frozen as an implementation safeguard (not a public API feature).
 */
export type FormControl<T extends FormValues = FormValues> = {
  readonly [formControlBrand]?: T
}

type ControlInternals<T extends FormValues> = {
  store: FormStore<FormInternalState<T>>
  getFormId: () => string
  getHandlers: () => FormControlHandlers<T>
}

/**
 * Per-module registry (not a global package-id string).
 * WeakMap keys allow form controls to be garbage-collected with their owners.
 */
const controlInternals = new WeakMap<object, ControlInternals<FormValues>>()

/** @internal Create a public control and register its private internals. */
export function createFormControl<T extends FormValues>(
  internals: ControlInternals<T>,
): FormControl<T> {
  const control: FormControl<T> = Object.freeze({})
  controlInternals.set(control, internals as ControlInternals<FormValues>)
  return control
}

/** @internal */
export function getControlInternals<T extends FormValues>(
  control: FormControl<T>,
): ControlInternals<T> {
  const internals = controlInternals.get(control)
  if (!internals) {
    throw new Error(
      'Invalid FormControl: missing internals. Pass a control created by useForm / FormProvider.',
    )
  }
  return internals as ControlInternals<T>
}

/** @internal True when the value is a registered FormControl instance. */
export function isFormControl(value: unknown): value is FormControl<FormValues> {
  return typeof value === 'object' && value !== null && controlInternals.has(value)
}

/**
 * Resolve a control from a FormControl or a form-like `{ control }` object.
 * Does not read React context — use `resolveControl` for optional context.
 */
export function resolveFormControl<T extends FormValues>(
  source: FormControl<T> | { control: FormControl<T> },
): FormControl<T> {
  if (
    typeof source === 'object' &&
    source !== null &&
    'control' in source &&
    source.control != null &&
    isFormControl(source.control)
  ) {
    return source.control
  }
  if (isFormControl(source)) {
    return source
  }
  throw new Error(
    'Invalid FormControl. Pass `form.control` or a form return value that includes `control`.',
  )
}
