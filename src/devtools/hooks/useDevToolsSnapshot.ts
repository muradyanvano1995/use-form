import { useCallback, useRef, useSyncExternalStore } from 'react'
import { getControlInternals, type FormControl } from '../../hooks/useForm/formStore.ts'
import type { FormInternalState, FormValues } from '../../hooks/useForm/formTypes.ts'

export type DevToolsSnapshot<T extends FormValues> = {
  values: T
  defaultValues: T
  errors: FormInternalState<T>['errors']
  errorDetails: FormInternalState<T>['errorDetails']
  rootError: FormInternalState<T>['rootError']
  rootErrorDetails: FormInternalState<T>['rootErrorDetails']
  touched: FormInternalState<T>['touched']
  isSubmitting: boolean
  isValidating: boolean
  submitCount: number
  isLoadingDefaults: boolean
  isDefaultsReady: boolean
  defaultValuesError: string | undefined
}

function snapshotsEqual<T extends FormValues>(
  a: DevToolsSnapshot<T>,
  b: DevToolsSnapshot<T>,
): boolean {
  return (
    a.values === b.values &&
    a.defaultValues === b.defaultValues &&
    a.errors === b.errors &&
    a.errorDetails === b.errorDetails &&
    a.rootError === b.rootError &&
    a.rootErrorDetails === b.rootErrorDetails &&
    a.touched === b.touched &&
    a.isSubmitting === b.isSubmitting &&
    a.isValidating === b.isValidating &&
    a.submitCount === b.submitCount &&
    a.isLoadingDefaults === b.isLoadingDefaults &&
    a.isDefaultsReady === b.isDefaultsReady &&
    a.defaultValuesError === b.defaultValuesError
  )
}

/**
 * Subscribe to form store slices without `useFormState`'s dirty/valid snapshot helpers,
 * keeping pathUtilities / resolver helpers out of the DevTools consumer bundle.
 */
export function useDevToolsSnapshot<T extends FormValues>(
  control: FormControl<T>,
): DevToolsSnapshot<T> {
  const store = getControlInternals(control).store
  const selectionRef = useRef<DevToolsSnapshot<T> | undefined>(undefined)
  const hasSelectionRef = useRef(false)

  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(onStoreChange),
    [store],
  )

  const select = useCallback((state: FormInternalState<T>): DevToolsSnapshot<T> => {
    const next: DevToolsSnapshot<T> = {
      values: state.values,
      defaultValues: state.defaultValues,
      errors: state.errors,
      errorDetails: state.errorDetails,
      rootError: state.rootError,
      rootErrorDetails: state.rootErrorDetails,
      touched: state.touched,
      isSubmitting: state.isSubmitting,
      isValidating: state.isValidating,
      submitCount: state.submitCount,
      isLoadingDefaults: state.isLoadingDefaults,
      isDefaultsReady: state.isDefaultsReady,
      defaultValuesError: state.defaultValuesError?.message,
    }
    if (
      hasSelectionRef.current &&
      snapshotsEqual(selectionRef.current as DevToolsSnapshot<T>, next)
    ) {
      return selectionRef.current as DevToolsSnapshot<T>
    }
    selectionRef.current = next
    hasSelectionRef.current = true
    return next
  }, [])

  const getSnapshot = useCallback(() => select(store.getState()), [select, store])
  const getServerSnapshot = useCallback(() => select(store.getServerSnapshot()), [select, store])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
