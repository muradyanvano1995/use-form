import { useCallback, useDebugValue, useRef, useSyncExternalStore } from 'react'
import type { FieldPath, FieldPathValue, FormInternalState, FormValues } from './formTypes.ts'
import type { FieldError } from './errors.ts'
import { computeDirtyFields, computeIsDirty, readFieldValue } from './utilities.ts'
import { hasValidationFailure } from './validation/runResolver.ts'
import {
  getControlInternals,
  isFormControl,
  resolveFormControl,
  type FormControl,
  type FormStore,
} from './formStore.ts'
import { resolveControl, useOptionalFormContext } from './formContext.ts'

export type FormStateSnapshot<T extends FormValues> = FormInternalState<T> & {
  dirtyFields: ReturnType<typeof computeDirtyFields<T>>
  isDirty: boolean
  isValid: boolean
}

export type FieldStateSnapshot = {
  error: string | undefined
  errorDetails: FieldError | undefined
  invalid: boolean
  touched: boolean
  dirty: boolean
  /**
   * Currently mirrors form-level `isValidating`.
   * Per-path pending flags are deferred to async-debounce work.
   */
  isValidating: boolean
}

export type UseWatchOptions<T extends FormValues, P extends FieldPath<T> = FieldPath<T>> = {
  control?: FormControl<T>
  name?: P
}

export type UseFormStateOptions<T extends FormValues, TSelected> = {
  control?: FormControl<T>
  selector: (state: FormStateSnapshot<T>) => TSelected
  isEqual?: (a: TSelected, b: TSelected) => boolean
}

export type UseFieldStateOptions<T extends FormValues, P extends FieldPath<T> = FieldPath<T>> = {
  control?: FormControl<T>
  name: P
}

function buildSnapshot<T extends FormValues>(state: FormInternalState<T>): FormStateSnapshot<T> {
  return {
    ...state,
    dirtyFields: computeDirtyFields(state.values, state.defaultValues),
    isDirty: computeIsDirty(state.values, state.defaultValues),
    isValid: !hasValidationFailure(state.errors, state.rootError),
  }
}

/**
 * Subscribe to a store with a selector. Cached selection uses `isEqual` so
 * `useSyncExternalStore` does not loop when the selector returns a new equal value.
 */
export function useStoreSelector<TState, TSelected>(
  store: FormStore<TState>,
  selector: (state: TState) => TSelected,
  isEqual: (a: TSelected, b: TSelected) => boolean = Object.is,
): TSelected {
  const selectorRef = useRef(selector)
  const isEqualRef = useRef(isEqual)
  const selectionRef = useRef<TSelected | undefined>(undefined)
  const hasSelectionRef = useRef(false)

  /* eslint-disable react-hooks/refs -- keep selector/equality current for getSnapshot */
  selectorRef.current = selector
  isEqualRef.current = isEqual
  /* eslint-enable react-hooks/refs */

  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(onStoreChange),
    [store],
  )

  const getSnapshot = useCallback((): TSelected => {
    const next = selectorRef.current(store.getState())
    if (hasSelectionRef.current && isEqualRef.current(selectionRef.current as TSelected, next)) {
      return selectionRef.current as TSelected
    }
    selectionRef.current = next
    hasSelectionRef.current = true
    return next
  }, [store])

  const getServerSnapshot = useCallback((): TSelected => {
    const next = selectorRef.current(store.getServerSnapshot())
    if (hasSelectionRef.current && isEqualRef.current(selectionRef.current as TSelected, next)) {
      return selectionRef.current as TSelected
    }
    selectionRef.current = next
    hasSelectionRef.current = true
    return next
  }, [store])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function isUseFormReturnLike(value: object): boolean {
  return 'register' in value || 'handleSubmit' in value || 'setValue' in value
}

function isWatchOptionsObject(value: unknown): value is UseWatchOptions<FormValues> {
  if (typeof value !== 'object' || value === null) return false
  if (isFormControl(value)) return false
  if (isUseFormReturnLike(value)) return false
  return 'name' in value || 'control' in value
}

function isFormStateOptionsObject(
  value: unknown,
): value is UseFormStateOptions<FormValues, unknown> {
  if (typeof value !== 'object' || value === null) return false
  if (isFormControl(value)) return false
  if (isUseFormReturnLike(value)) return false
  return 'selector' in value
}

function isFieldStateOptionsObject(value: unknown): value is UseFieldStateOptions<FormValues> {
  if (typeof value !== 'object' || value === null) return false
  if (isFormControl(value)) return false
  if (isUseFormReturnLike(value)) return false
  return 'name' in value
}

function resolvePositionalOrOptionsControl<T extends FormValues>(
  source: FormControl<T> | { control: FormControl<T> } | UseWatchOptions<T>,
  context: FormControl<FormValues> | null,
  hookName: string,
  asOptions: boolean,
): FormControl<T> {
  if (asOptions) {
    const options = source as UseWatchOptions<T>
    return resolveControl(options.control, context, hookName)
  }
  return resolveFormControl(source as FormControl<T> | { control: FormControl<T> })
}

/**
 * Watch a single field value (or the entire `values` object when `name` is omitted).
 *
 * Explicit:
 * - `useWatch(form)` / `useWatch(form, 'email')`
 * - `useWatch({ control, name: 'email' })`
 *
 * Context (inside FormProvider):
 * - `useWatch({ name: 'email' })`
 * - `useWatch({} as UseWatchOptions<T>)` for whole values — prefer `useWatch({ control })` or pass form
 */
export function useWatch<T extends FormValues>(
  form: FormControl<T> | { control: FormControl<T> },
): T
export function useWatch<T extends FormValues, P extends FieldPath<T>>(
  form: FormControl<T> | { control: FormControl<T> },
  name: P,
): FieldPathValue<T, P>
export function useWatch<T extends FormValues, P extends FieldPath<T>>(
  options: UseWatchOptions<T, P> & { name: P },
): FieldPathValue<T, P>
export function useWatch<T extends FormValues>(
  options: UseWatchOptions<T> & { name?: undefined },
): T
export function useWatch<T extends FormValues, P extends FieldPath<T>>(
  formOrOptions: FormControl<T> | { control: FormControl<T> } | UseWatchOptions<T, P>,
  nameArg?: P,
): T | FieldPathValue<T, P> {
  const context = useOptionalFormContext()
  const optionsMode = nameArg === undefined && isWatchOptionsObject(formOrOptions)
  const control = resolvePositionalOrOptionsControl(formOrOptions, context, 'useWatch', optionsMode)
  const name = optionsMode ? (formOrOptions as UseWatchOptions<T, P>).name : nameArg

  const store = getControlInternals(control).store
  const selected = useStoreSelector(store, (state) => {
    if (name === undefined) return state.values as T | FieldPathValue<T, P>
    return readFieldValue(state.values, name) as T | FieldPathValue<T, P>
  })
  useDebugValue(selected)
  return selected
}

/**
 * Subscribe to a derived slice of form state.
 *
 * Explicit: `useFormState(form, selector, isEqual?)`
 * Options / context: `useFormState({ control?, selector, isEqual? })`
 */
export function useFormState<T extends FormValues, TSelected>(
  form: FormControl<T> | { control: FormControl<T> },
  selector: (state: FormStateSnapshot<T>) => TSelected,
  isEqual?: (a: TSelected, b: TSelected) => boolean,
): TSelected
export function useFormState<T extends FormValues, TSelected>(
  options: UseFormStateOptions<T, TSelected>,
): TSelected
export function useFormState<T extends FormValues, TSelected>(
  formOrOptions: FormControl<T> | { control: FormControl<T> } | UseFormStateOptions<T, TSelected>,
  selectorArg?: (state: FormStateSnapshot<T>) => TSelected,
  isEqualArg: (a: TSelected, b: TSelected) => boolean = Object.is,
): TSelected {
  const context = useOptionalFormContext()

  let control: FormControl<T>
  let selector: (state: FormStateSnapshot<T>) => TSelected
  let isEqual = isEqualArg

  if (isFormStateOptionsObject(formOrOptions)) {
    const options = formOrOptions as UseFormStateOptions<T, TSelected>
    control = resolveControl(options.control, context, 'useFormState')
    selector = options.selector
    isEqual = options.isEqual ?? Object.is
  } else {
    control = resolveFormControl(formOrOptions as FormControl<T> | { control: FormControl<T> })
    if (!selectorArg) {
      throw new Error('useFormState requires a selector.')
    }
    selector = selectorArg
  }

  const store = getControlInternals(control).store
  const selected = useStoreSelector(store, (state) => selector(buildSnapshot(state)), isEqual)
  useDebugValue(selected)
  return selected
}

/**
 * Subscribe to error / touched / dirty for one field path.
 *
 * Explicit: `useFieldState(form, name)`
 * Options / context: `useFieldState({ control?, name })`
 */
export function useFieldState<T extends FormValues, P extends FieldPath<T>>(
  form: FormControl<T> | { control: FormControl<T> },
  name: P,
): FieldStateSnapshot
export function useFieldState<T extends FormValues, P extends FieldPath<T>>(
  options: UseFieldStateOptions<T, P>,
): FieldStateSnapshot
export function useFieldState<T extends FormValues, P extends FieldPath<T>>(
  formOrOptions: FormControl<T> | { control: FormControl<T> } | UseFieldStateOptions<T, P>,
  nameArg?: P,
): FieldStateSnapshot {
  const context = useOptionalFormContext()

  let control: FormControl<T>
  let name: P

  if (nameArg !== undefined) {
    control = resolveFormControl(formOrOptions as FormControl<T> | { control: FormControl<T> })
    name = nameArg
  } else if (isFieldStateOptionsObject(formOrOptions)) {
    const options = formOrOptions as UseFieldStateOptions<T, P>
    control = resolveControl(options.control, context, 'useFieldState')
    name = options.name
  } else {
    throw new Error(
      'useFieldState requires a field name. Pass `useFieldState(form, name)` or `useFieldState({ name })`.',
    )
  }

  const store = getControlInternals(control).store
  const selected = useStoreSelector(
    store,
    (state) => {
      const dirtyFields = computeDirtyFields(state.values, state.defaultValues)
      const next: FieldStateSnapshot = {
        error: state.errors[name],
        errorDetails: state.errorDetails[name],
        invalid: state.errorDetails[name] != null,
        touched: state.touched[name] === true,
        dirty: dirtyFields[name] === true,
        isValidating: state.isValidating,
      }
      return next
    },
    (a, b) =>
      Object.is(a.error, b.error) &&
      Object.is(a.errorDetails, b.errorDetails) &&
      a.invalid === b.invalid &&
      a.touched === b.touched &&
      a.dirty === b.dirty &&
      a.isValidating === b.isValidating,
  )
  useDebugValue(selected)
  return selected
}
