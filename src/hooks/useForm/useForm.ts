import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type SubmitEvent,
} from 'react'
import type {
  FieldErrors,
  FieldPath,
  FieldPathValue,
  FieldProps,
  FieldTouched,
  FormInternalState,
  FormValues,
  OnSubmitFn,
  RegisterOptions,
  ResetOptions,
  SetErrorOptions,
  SetValueOptions,
  SubmitHelpers,
  UseFormOptions,
  UseFormReturn,
} from './formTypes.ts'
import type { DeepPartial } from './baseTypes.ts'
import {
  buildDependencyIndex,
  collectAffectedDependents,
  shouldRevalidateDependent,
  type DependencyIndex,
} from './dependencies.ts'
import {
  clearNativeFileInput,
  parseFileInputValue,
  shouldClearNativeFileInput,
} from './fileHelpers.ts'
import {
  applyLoadedDefaultValues,
  assertLoadedDefaultValues,
  isAbortError,
  toDefaultValuesError,
  type DefaultValuesLoadReason,
  type ReloadDefaultValuesOptions,
} from './defaultValuesLoader.ts'
import {
  allocateFieldArrayKeys,
  clearElementMapUnderArray,
  ensureFieldArrayKeys,
  omitArrayPathTree,
  omitArrayPathsFromList,
  parseIndexedPath,
  reindexElementMap,
  reindexPathList,
  reindexPathRecord,
} from './fieldArrayUtilities.ts'
import {
  createFormControl,
  createFormStore,
  type ApplyFieldArrayChangeArgs,
  type FocusableFieldElement,
  type FormControlHandlers,
} from './formStore.ts'
import {
  addInactiveRoot,
  clearFieldElementsUnder,
  connectFieldElement,
  createDeferredUnregisterScheduler,
  DEFAULT_AUTOMATIC_UNREGISTER_OPTIONS,
  DEFAULT_EXPLICIT_UNREGISTER_OPTIONS,
  disconnectFieldElement,
  findInactiveRoot,
  forEachFieldElement,
  getFirstFocusableElement,
  hasConnectedElements,
  isInactivePath,
  isSameOrDescendantPath,
  omitPathAndDescendants,
  omitPathsFromList,
  reactivateInactivePath,
  resolveShouldUnregister,
  resolveUnregisterOptions,
  type UnregisterOptions,
} from './fieldRegistration.ts'
import {
  cloneValues,
  computeDirtyFields,
  computeIsDirty,
  createErrorId,
  createFieldId,
  focusFieldById,
  getFirstErrorField,
  getValueAtPath,
  hasValueAtPath,
  isCheckboxInput,
  leafValuesEqual,
  listLeafFieldPaths,
  listTouchedPathsFromPartial,
  mergeFormValues,
  parsePath,
  readFieldValue,
  removeValueAtPath,
  cloneFormValue,
  writeFieldValue,
} from './utilities.ts'
import {
  detailsFromSetErrorsInput,
  fieldErrorFromIssues,
  manualFieldError,
  mergeFieldErrorDetails,
  omitFieldErrorDetail,
  omitFieldErrorDetailsUnder,
  setFieldErrorDetail,
  stripServerIssuesUnder,
  stripValidationIssueAtPath,
  syncErrorViews,
  type FieldError,
  type FieldErrorDetails,
  type SetErrorsInput,
  type ValidationIssueInput,
} from './errors.ts'
import { runFieldValidationPipeline, runValidationPipeline } from './validation'
import { hasValidationFailure } from './validation/runResolver.ts'
import { getCombinedFieldRules, runFieldRulesDetailed } from './validation/runRules.ts'
import { resolveFieldDebounceMs, shouldDeferDebouncedRules } from './validation/asyncRule.ts'
import type { ValidationReason } from './validation'
import { createFieldValidationScheduler } from './validation/validationScheduler.ts'
import { captureMessageSnapshot } from './validation/validationMessages.ts'
import {
  ASYNC_BATCH_CALLBACK_ERROR,
  clearQueuedValidation,
  createBatchLifecycleError,
  createBatchValidationQueue,
  dropQueuedPathsUnder,
  isThenable,
  queueFieldValidation,
  queueSourcePath,
  type BatchLifecycleOperation,
  type BatchOptions,
  type BatchValidationQueue,
} from './formBatch.ts'
import {
  readDirtyValues,
  readErrorDetails,
  readErrors,
  readFieldState,
  readFormValue,
  readFormValues,
  readTouchedValues,
} from './formGetters.ts'

/** Stringify a registered field value for a native text-like input. */
function formatNativeInputValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'number') return Number.isNaN(value) ? '' : String(value)
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return ''
}

function createInitialState<T extends FormValues>(
  defaultValues: T,
  hasDefaultsLoader: boolean,
): FormInternalState<T> {
  const cloned = cloneValues(defaultValues)
  return {
    values: cloneValues(cloned),
    defaultValues: cloned,
    errors: {},
    errorDetails: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    isLoadingDefaults: hasDefaultsLoader,
    isDefaultsReady: !hasDefaultsLoader,
    defaultValuesError: undefined,
    isSubmitted: false,
    submitCount: 0,
    submitError: undefined,
    rootError: undefined,
    rootErrorDetails: undefined,
  }
}

function shouldValidateOnChange(
  mode: UseFormOptions<FormValues>['mode'],
  reValidateMode: UseFormOptions<FormValues>['reValidateMode'],
  isSubmitted: boolean,
): boolean {
  if (isSubmitted) {
    return reValidateMode === 'onChange'
  }
  return mode === 'onChange'
}

function shouldValidateOnBlur(
  mode: UseFormOptions<FormValues>['mode'],
  reValidateMode: UseFormOptions<FormValues>['reValidateMode'],
  isSubmitted: boolean,
): boolean {
  if (isSubmitted) {
    return reValidateMode === 'onBlur' || reValidateMode === 'onChange'
  }
  return mode === 'onBlur' || mode === 'onChange'
}

/**
 * Production form-state hook for flat and nested, strongly typed form values.
 *
 * Nested fields use dot-separated paths (`'address.city'`). Values stay nested;
 * errors/touched/dirty metadata are keyed by path.
 *
 * Generics: `TInput` is live form state; `TOutput` is successful submit payload
 * (defaults to `TInput`); `TContext` is optional resolver context.
 *
 * Default-value semantics: the provided `defaultValues` are deep-cloned once on mount
 * (plain objects recursively; arrays/atomics by documented clone rules). Later parent
 * re-renders that pass a new `defaultValues` object do **not** reset user input.
 * Call `reset(next, …)` to apply new defaults intentionally.
 */
export function useForm<
  TInput extends FormValues,
  TOutput extends FormValues = TInput,
  TContext = undefined,
>(options: UseFormOptions<TInput, TOutput, TContext>): UseFormReturn<TInput> {
  type T = TInput
  const {
    defaultValues,
    validate: validateForm,
    rules,
    fieldValidators,
    resolver,
    resolverContext,
    dependencies,
    dependencyMode = 'whenTouched',
    onSubmit,
    mode = 'onSubmit',
    reValidateMode = 'onChange',
    focusOnError = true,
    preventDuplicateSubmit = true,
    id: idOption,
    loadDefaultValues,
    defaultValuesLoadMode = 'preserveDirty',
    validateOnDefaultsLoad = false,
    allowSubmitWhileLoading = false,
    allowSubmitWhenDefaultsFailed = false,
    shouldUnregister: shouldUnregisterOption = false,
    criteriaMode = 'firstError',
    validationMessages,
    fieldLabels,
  } = options

  const reactId = useId()
  const formId = idOption ?? reactId

  const [hasDefaultsLoader] = useState(() => typeof loadDefaultValues === 'function')
  const [store] = useState(() =>
    createFormStore(createInitialState(defaultValues, hasDefaultsLoader)),
  )
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getServerSnapshot)

  const [controlBridge] = useState(() => ({
    formId,
    handlers: null as unknown as FormControlHandlers<T>,
  }))
  controlBridge.formId = formId

  const [control] = useState(() =>
    createFormControl<T>({
      store,
      getFormId: () => controlBridge.formId,
      getHandlers: () => controlBridge.handlers,
    }),
  )

  const optionsRef = useRef({
    validate: validateForm,
    rules,
    fieldValidators,
    resolver: resolver,
    resolverContext: resolverContext as TContext,
    dependencies,
    dependencyMode: dependencyMode,
    onSubmit,
    mode,
    reValidateMode,
    focusOnError,
    preventDuplicateSubmit,
    loadDefaultValues,
    defaultValuesLoadMode: defaultValuesLoadMode,
    validateOnDefaultsLoad,
    allowSubmitWhileLoading,
    allowSubmitWhenDefaultsFailed,
    shouldUnregister: shouldUnregisterOption,
    criteriaMode,
    validationMessages,
    fieldLabels,
  })

  useLayoutEffect(() => {
    optionsRef.current = {
      validate: validateForm,
      rules,
      fieldValidators,
      resolver: resolver,
      resolverContext: resolverContext as TContext,
      dependencies,
      dependencyMode: dependencyMode,
      onSubmit,
      mode,
      reValidateMode,
      focusOnError,
      preventDuplicateSubmit,
      loadDefaultValues,
      defaultValuesLoadMode: defaultValuesLoadMode,
      validateOnDefaultsLoad,
      allowSubmitWhileLoading,
      allowSubmitWhenDefaultsFailed,
      shouldUnregister: shouldUnregisterOption,
      criteriaMode,
      validationMessages,
      fieldLabels,
    }
  }, [
    validateForm,
    rules,
    fieldValidators,
    resolver,
    resolverContext,
    dependencies,
    dependencyMode,
    onSubmit,
    mode,
    reValidateMode,
    focusOnError,
    preventDuplicateSubmit,
    loadDefaultValues,
    defaultValuesLoadMode,
    validateOnDefaultsLoad,
    allowSubmitWhileLoading,
    allowSubmitWhenDefaultsFailed,
    shouldUnregisterOption,
    criteriaMode,
    validationMessages,
    fieldLabels,
  ])

  const mountedRef = useRef(true)
  const isSubmittingRef = useRef(false)
  /** Whole-form validation epoch — also invalidates in-flight field results. */
  const formValidationGenerationRef = useRef(0)
  /** Per-path epochs so concurrent field validations do not cancel each other. */
  const fieldValidationGenerationsRef = useRef(new Map<string, number>())
  const fieldOrderRef = useRef<Array<FieldPath<T>>>([])
  const fieldElementsRef = useRef(new Map<string, Set<FocusableFieldElement>>())
  const controllerCountsRef = useRef(new Map<string, number>())
  const fieldUnregisterOptionRef = useRef(new Map<string, boolean | undefined>())
  const inactivePathsRef = useRef(new Set<string>())
  const [unregisterScheduler] = useState(() => createDeferredUnregisterScheduler())
  const fieldArrayMutationEpochRef = useRef(0)
  /** Stable React keys for field arrays — never stored in form values. */
  const fieldArrayKeysRef = useRef(new Map<string, string[]>())
  const nextFieldArrayKeyRef = useRef(0)
  /** Invalidates scheduled field-array focus when mutations race or the form unmounts. */
  const fieldArrayFocusGenerationRef = useRef(0)
  const resolverAbortRef = useRef<AbortController | null>(null)
  const fieldAbortControllersRef = useRef(new Map<string, AbortController>())
  const defaultsLoadGenerationRef = useRef(0)
  const defaultsAbortRef = useRef<AbortController | null>(null)
  const [validationScheduler] = useState(() => createFieldValidationScheduler())
  const dependencyIndexRef = useRef<DependencyIndex>(buildDependencyIndex(dependencies))
  const validatedFieldsRef = useRef(new Set<string>())
  const batchQueueRef = useRef(createBatchValidationQueue())
  const outerBatchCompletionRef = useRef<{
    promise: Promise<void>
    resolve: () => void
    reject: (error: unknown) => void
  } | null>(null)

  useLayoutEffect(() => {
    dependencyIndexRef.current = buildDependencyIndex(dependencies)
  }, [dependencies])

  const abortFieldSignal = useCallback((name: string) => {
    const controller = fieldAbortControllersRef.current.get(name)
    controller?.abort()
    fieldAbortControllersRef.current.delete(name)
  }, [])

  const abortAllFieldSignals = useCallback(() => {
    for (const controller of fieldAbortControllersRef.current.values()) {
      controller.abort()
    }
    fieldAbortControllersRef.current.clear()
  }, [])

  const beginFieldSignal = useCallback(
    (name: string): AbortSignal | undefined => {
      abortFieldSignal(name)
      if (typeof AbortController === 'undefined') {
        return undefined
      }
      const controller = new AbortController()
      fieldAbortControllersRef.current.set(name, controller)
      return controller.signal
    },
    [abortFieldSignal],
  )

  const bumpDefaultsLoadGeneration = useCallback(() => {
    defaultsLoadGenerationRef.current += 1
    defaultsAbortRef.current?.abort()
    defaultsAbortRef.current = null
  }, [])

  const beginDefaultsSignal = useCallback((): AbortSignal | undefined => {
    defaultsAbortRef.current?.abort()
    if (typeof AbortController === 'undefined') {
      defaultsAbortRef.current = null
      return undefined
    }
    const controller = new AbortController()
    defaultsAbortRef.current = controller
    return controller.signal
  }, [])

  const bumpFormValidationGeneration = useCallback(() => {
    formValidationGenerationRef.current += 1
    fieldValidationGenerationsRef.current.forEach((value, key, map) => {
      map.set(key, value + 1)
    })
    resolverAbortRef.current?.abort()
    resolverAbortRef.current = null
    validationScheduler.cancelAll()
    abortAllFieldSignals()
  }, [abortAllFieldSignals, validationScheduler])

  const beginResolverSignal = useCallback((): AbortSignal | undefined => {
    resolverAbortRef.current?.abort()
    if (typeof AbortController === 'undefined') {
      resolverAbortRef.current = null
      return undefined
    }
    const controller = new AbortController()
    resolverAbortRef.current = controller
    return controller.signal
  }, [])

  const allocateFieldArrayKey = useCallback(() => {
    nextFieldArrayKeyRef.current += 1
    return `fa-${nextFieldArrayKeyRef.current}`
  }, [])

  const getFieldArrayKeys = useCallback((name: string) => {
    return fieldArrayKeysRef.current.get(name)
  }, [])

  const ensureFieldArrayKeysForPath = useCallback(
    (name: string, length: number) => {
      const next = ensureFieldArrayKeys(
        fieldArrayKeysRef.current.get(name),
        length,
        allocateFieldArrayKey,
      )
      fieldArrayKeysRef.current.set(name, next)
      return next
    },
    [allocateFieldArrayKey],
  )

  const regenerateFieldArrayKeys = useCallback(
    (name: string, length: number) => {
      const next = allocateFieldArrayKeys(length, allocateFieldArrayKey)
      fieldArrayKeysRef.current.set(name, next)
      return next
    },
    [allocateFieldArrayKey],
  )

  const syncKnownFieldArrayKeys = useCallback(
    (values: T) => {
      for (const name of fieldArrayKeysRef.current.keys()) {
        const current = readFieldValue(values, name as FieldPath<T>)
        const length = Array.isArray(current) ? current.length : 0
        regenerateFieldArrayKeys(name, length)
      }
    },
    [regenerateFieldArrayKeys],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      bumpFormValidationGeneration()
      bumpDefaultsLoadGeneration()
      fieldArrayFocusGenerationRef.current += 1
      unregisterScheduler.dispose()
      validationScheduler.dispose()
    }
  }, [
    bumpDefaultsLoadGeneration,
    bumpFormValidationGeneration,
    unregisterScheduler,
    validationScheduler,
  ])

  const commitState = useCallback(
    (recipe: (prev: FormInternalState<T>) => FormInternalState<T>) => {
      const prev = store.getState()
      const next = recipe(prev)
      store.setState(next)
      return next
    },
    [store],
  )

  const assertNotInBatch = useCallback(
    (operation: BatchLifecycleOperation) => {
      if (store.getTransactionDepth() > 0) {
        throw createBatchLifecycleError(operation)
      }
    },
    [store],
  )

  const markFieldRegistered = useCallback((name: FieldPath<T>) => {
    if (!fieldOrderRef.current.includes(name)) {
      fieldOrderRef.current = [...fieldOrderRef.current, name]
    }
  }, [])

  const nextFieldGeneration = useCallback((name: FieldPath<T>) => {
    const current = fieldValidationGenerationsRef.current.get(name) ?? 0
    const next = current + 1
    fieldValidationGenerationsRef.current.set(name, next)
    return next
  }, [])

  const cancelFieldValidationWork = useCallback(
    (name: string) => {
      validationScheduler.cancel(name)
      abortFieldSignal(name)
      nextFieldGeneration(name as FieldPath<T>)
    },
    [abortFieldSignal, nextFieldGeneration, validationScheduler],
  )

  const hasLiveRegistration = useCallback((name: string) => {
    return (
      hasConnectedElements(fieldElementsRef.current, name) ||
      (controllerCountsRef.current.get(name) ?? 0) > 0
    )
  }, [])

  const stripInactiveValues = useCallback((values: T): T => {
    let next = values
    const roots = [...inactivePathsRef.current].sort((a, b) => a.length - b.length)
    for (const path of roots) {
      next = removeValueAtPath(next, path)
    }
    return next
  }, [])

  const rememberFieldUnregisterOption = useCallback((name: string, option: boolean | undefined) => {
    if (option !== undefined) {
      fieldUnregisterOptionRef.current.set(name, option)
    }
  }, [])

  const cancelRegistrationWorkUnder = useCallback(
    (root: string) => {
      unregisterScheduler.cancelWhere((path) => isSameOrDescendantPath(path, root))
      validationScheduler.cancelWhere((path) => isSameOrDescendantPath(path, root))
      for (const path of [...fieldAbortControllersRef.current.keys()]) {
        if (isSameOrDescendantPath(path, root)) {
          abortFieldSignal(path)
        }
      }
      for (const path of [...fieldValidationGenerationsRef.current.keys()]) {
        if (isSameOrDescendantPath(path, root)) {
          const current = fieldValidationGenerationsRef.current.get(path) ?? 0
          fieldValidationGenerationsRef.current.set(path, current + 1)
        }
      }
    },
    [abortFieldSignal, unregisterScheduler, validationScheduler],
  )

  const restoreInactiveField = useCallback(
    (name: FieldPath<T>) => {
      const inactiveRoot = findInactiveRoot(name, inactivePathsRef.current)
      if (!inactiveRoot) return

      reactivateInactivePath(name, inactivePathsRef.current)

      const snapshot = store.getState()
      if (hasValueAtPath(snapshot.values, name)) return
      if (!hasValueAtPath(snapshot.defaultValues, inactiveRoot)) return

      const restored = cloneFormValue(getValueAtPath(snapshot.defaultValues, inactiveRoot))
      commitState((prev) => ({
        ...prev,
        values: writeFieldValue(prev.values, inactiveRoot as FieldPath<T>, restored),
      }))
    },
    [commitState, store],
  )

  const performUnregister = useCallback(
    (root: string, resolved: Required<UnregisterOptions>, arrayOwnedValue: boolean) => {
      cancelRegistrationWorkUnder(root)

      fieldOrderRef.current = omitPathsFromList(fieldOrderRef.current, root) as Array<FieldPath<T>>
      clearFieldElementsUnder(fieldElementsRef.current, root)

      for (const path of [...controllerCountsRef.current.keys()]) {
        if (isSameOrDescendantPath(path, root)) {
          controllerCountsRef.current.delete(path)
        }
      }
      for (const path of [...fieldUnregisterOptionRef.current.keys()]) {
        if (isSameOrDescendantPath(path, root)) {
          fieldUnregisterOptionRef.current.delete(path)
        }
      }

      if (!resolved.keepValidated) {
        for (const path of [...validatedFieldsRef.current]) {
          if (isSameOrDescendantPath(path, root)) {
            validatedFieldsRef.current.delete(path)
          }
        }
      }

      const keepValue = arrayOwnedValue ? true : resolved.keepValue

      commitState((prev) => {
        let nextValues = prev.values
        let nextDefaults = prev.defaultValues
        let nextTouched = prev.touched

        if (!keepValue) {
          nextValues = removeValueAtPath(nextValues, root)
          addInactiveRoot(inactivePathsRef.current, root)
        }

        if (!resolved.keepDefaultValue) {
          nextDefaults = removeValueAtPath(nextDefaults, root)
        }

        if (!resolved.keepTouched) {
          nextTouched = omitPathAndDescendants(nextTouched, root)
        }

        const nextDetails = resolved.keepError
          ? prev.errorDetails
          : omitFieldErrorDetailsUnder(prev.errorDetails, root)

        return {
          ...prev,
          ...syncErrorViews(nextDetails, prev.rootErrorDetails),
          values: nextValues,
          defaultValues: nextDefaults,
          touched: nextTouched,
        }
      })
    },
    [cancelRegistrationWorkUnder, commitState],
  )

  const maybeScheduleAutomaticUnregister = useCallback(
    (name: string, scheduledEpoch: number) => {
      if (hasLiveRegistration(name)) return
      const fieldOption = fieldUnregisterOptionRef.current.get(name)
      if (!resolveShouldUnregister(fieldOption, optionsRef.current.shouldUnregister)) {
        return
      }

      unregisterScheduler.schedule(name, () => {
        if (!mountedRef.current) return
        if (hasLiveRegistration(name)) return
        const arrayOwned =
          scheduledEpoch !== fieldArrayMutationEpochRef.current ||
          [...fieldArrayKeysRef.current.keys()].some(
            (arrayPath) => name !== arrayPath && isSameOrDescendantPath(name, arrayPath),
          )
        performUnregister(name, DEFAULT_AUTOMATIC_UNREGISTER_OPTIONS, arrayOwned)
      })
    },
    [hasLiveRegistration, performUnregister, unregisterScheduler],
  )

  const connectElement = useCallback(
    (name: FieldPath<T>, element: FocusableFieldElement) => {
      unregisterScheduler.cancel(name)
      connectFieldElement(fieldElementsRef.current, name, element)
      markFieldRegistered(name)
      restoreInactiveField(name)
    },
    [markFieldRegistered, restoreInactiveField, unregisterScheduler],
  )

  const disconnectElement = useCallback(
    (name: FieldPath<T>, element: FocusableFieldElement) => {
      const last = disconnectFieldElement(fieldElementsRef.current, name, element)
      if (last) {
        maybeScheduleAutomaticUnregister(name, fieldArrayMutationEpochRef.current)
      }
    },
    [maybeScheduleAutomaticUnregister],
  )

  const retainController = useCallback(
    (name: FieldPath<T>, retainOptions?: { shouldUnregister?: boolean }) => {
      rememberFieldUnregisterOption(name, retainOptions?.shouldUnregister)
      const count = (controllerCountsRef.current.get(name) ?? 0) + 1
      controllerCountsRef.current.set(name, count)
      unregisterScheduler.cancel(name)
      markFieldRegistered(name)
      restoreInactiveField(name)
    },
    [markFieldRegistered, rememberFieldUnregisterOption, restoreInactiveField, unregisterScheduler],
  )

  const releaseController = useCallback(
    (name: FieldPath<T>) => {
      const count = (controllerCountsRef.current.get(name) ?? 0) - 1
      if (count <= 0) {
        controllerCountsRef.current.delete(name)
        maybeScheduleAutomaticUnregister(name, fieldArrayMutationEpochRef.current)
      } else {
        controllerCountsRef.current.set(name, count)
      }
    },
    [maybeScheduleAutomaticUnregister],
  )

  const applyValidationResult = useCallback(
    (
      generation: number,
      errorDetails: FieldErrorDetails<T>,
      rootErrorDetails: FieldError | undefined,
    ) => {
      if (!mountedRef.current || generation !== formValidationGenerationRef.current) {
        return
      }

      commitState((prev) => ({
        ...prev,
        ...syncErrorViews(errorDetails, rootErrorDetails),
        isValidating: false,
      }))
    },
    [commitState],
  )

  const validateInternal = useCallback(
    async (
      values: T,
      reason: ValidationReason = 'manual',
    ): Promise<{
      errors: FieldErrors<T>
      rootError: string | undefined
      output: TOutput | undefined
    }> => {
      validationScheduler.cancelAll()
      abortAllFieldSignals()

      const generation = ++formValidationGenerationRef.current
      fieldValidationGenerationsRef.current.forEach((value, key, map) => {
        map.set(key, value + 1)
      })
      const signal = beginResolverSignal()

      if (mountedRef.current) {
        commitState((prev) => ({ ...prev, isValidating: true }))
      }

      try {
        const result = await runValidationPipeline<TInput, TOutput, TContext>({
          values,
          validate: optionsRef.current.validate,
          rules: optionsRef.current.rules,
          fieldValidators: optionsRef.current.fieldValidators,
          resolver: optionsRef.current.resolver,
          resolverContext: optionsRef.current.resolverContext,
          signal,
          reason,
          skipFieldPaths: inactivePathsRef.current,
          criteriaMode: optionsRef.current.criteriaMode,
          messages: captureMessageSnapshot(
            optionsRef.current.validationMessages,
            optionsRef.current.fieldLabels,
          ),
        })

        if (!mountedRef.current || generation !== formValidationGenerationRef.current) {
          return result
        }

        for (const path of Object.keys(result.errors)) {
          validatedFieldsRef.current.add(path)
        }
        applyValidationResult(generation, result.errorDetails, result.rootErrorDetails)
        return result
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (mountedRef.current && generation === formValidationGenerationRef.current) {
            commitState((prev) => ({ ...prev, isValidating: false }))
          }
          return {
            errors: store.getState().errors,
            rootError: store.getState().rootError,
            output: undefined,
          }
        }
        if (mountedRef.current && generation === formValidationGenerationRef.current) {
          commitState((prev) => ({ ...prev, isValidating: false }))
        }
        throw error
      }
    },
    [
      abortAllFieldSignals,
      applyValidationResult,
      beginResolverSignal,
      commitState,
      store,
      validationScheduler,
    ],
  )

  const runImmediateFieldValidation = useCallback(
    async (
      name: FieldPath<T>,
      values: T,
      reason: ValidationReason,
    ): Promise<{ message: string | undefined; rootError: string | undefined }> => {
      const formGeneration = formValidationGenerationRef.current
      const fieldGeneration = nextFieldGeneration(name)
      const signal = beginFieldSignal(name)

      if (mountedRef.current) {
        commitState((prev) => ({ ...prev, isValidating: true }))
      }

      try {
        const result = await runFieldValidationPipeline<TInput, TOutput, TContext>({
          name,
          values,
          validate: optionsRef.current.validate,
          rules: optionsRef.current.rules,
          fieldValidators: optionsRef.current.fieldValidators,
          resolver: optionsRef.current.resolver,
          resolverContext: optionsRef.current.resolverContext,
          signal,
          reason,
          skipFieldPaths: inactivePathsRef.current,
          criteriaMode: optionsRef.current.criteriaMode,
          messages: captureMessageSnapshot(
            optionsRef.current.validationMessages,
            optionsRef.current.fieldLabels,
          ),
        })

        if (
          !mountedRef.current ||
          formGeneration !== formValidationGenerationRef.current ||
          fieldGeneration !== fieldValidationGenerationsRef.current.get(name)
        ) {
          return result
        }

        validatedFieldsRef.current.add(name)
        commitState((prev) => {
          const nextDetails = setFieldErrorDetail(prev.errorDetails, name, result.error)
          const nextRoot =
            result.rootErrorDetails !== undefined ? result.rootErrorDetails : prev.rootErrorDetails
          return {
            ...prev,
            ...syncErrorViews(nextDetails, nextRoot),
            isValidating: false,
          }
        })

        return result
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (
            mountedRef.current &&
            formGeneration === formValidationGenerationRef.current &&
            fieldGeneration === fieldValidationGenerationsRef.current.get(name)
          ) {
            commitState((prev) => ({ ...prev, isValidating: false }))
          }
          return { message: undefined, rootError: undefined }
        }
        if (
          mountedRef.current &&
          formGeneration === formValidationGenerationRef.current &&
          fieldGeneration === fieldValidationGenerationsRef.current.get(name)
        ) {
          commitState((prev) => ({ ...prev, isValidating: false }))
        }
        throw error
      }
    },
    [beginFieldSignal, commitState, nextFieldGeneration],
  )

  const validateFieldInternal = useCallback(
    async (
      name: FieldPath<T>,
      values: T,
      reason: ValidationReason = 'manual',
    ): Promise<{ message: string | undefined; rootError: string | undefined }> => {
      if (isInactivePath(name, inactivePathsRef.current)) {
        return { message: undefined, rootError: undefined }
      }
      const formGenerationAtStart = formValidationGenerationRef.current
      const defer = shouldDeferDebouncedRules(reason)
      const combined = getCombinedFieldRules(
        name,
        optionsRef.current.rules,
        optionsRef.current.fieldValidators,
      )
      const debounceMs = resolveFieldDebounceMs(combined)

      if (!defer || debounceMs === 0) {
        validationScheduler.cancel(name)
        return runImmediateFieldValidation(name, values, reason)
      }

      // Cancel prior timer immediately while the sync pass runs.
      validationScheduler.cancel(name)

      const syncOutcome = await runFieldRulesDetailed(
        name,
        values,
        optionsRef.current.rules,
        optionsRef.current.fieldValidators,
        {
          reason,
          scheduleMode: 'defer-debounced',
          criteriaMode: optionsRef.current.criteriaMode,
          messages: captureMessageSnapshot(
            optionsRef.current.validationMessages,
            optionsRef.current.fieldLabels,
          ),
        },
      )

      if (!mountedRef.current || formGenerationAtStart !== formValidationGenerationRef.current) {
        return { message: undefined, rootError: undefined }
      }

      if (syncOutcome.message) {
        validationScheduler.cancel(name)
        abortFieldSignal(name)
        nextFieldGeneration(name)
        if (mountedRef.current && formGenerationAtStart === formValidationGenerationRef.current) {
          validatedFieldsRef.current.add(name)
          commitState((prev) => {
            const error = fieldErrorFromIssues([...syncOutcome.issues])
            return {
              ...prev,
              ...syncErrorViews(
                setFieldErrorDetail(prev.errorDetails, name, error),
                prev.rootErrorDetails,
              ),
              isValidating: false,
            }
          })
        }
        return { message: syncOutcome.message, rootError: undefined }
      }

      if (syncOutcome.pendingDebounceMs > 0) {
        validationScheduler.cancel(name)
        abortFieldSignal(name)
        nextFieldGeneration(name)

        if (!mountedRef.current || formGenerationAtStart !== formValidationGenerationRef.current) {
          return { message: undefined, rootError: undefined }
        }

        if (mountedRef.current) {
          commitState((prev) => ({
            ...prev,
            ...syncErrorViews(
              stripValidationIssueAtPath(prev.errorDetails, name),
              prev.rootErrorDetails,
            ),
            isValidating: false,
          }))
        }

        const snapshot = cloneValues(values)
        const delay = syncOutcome.pendingDebounceMs
        validationScheduler.schedule(name, delay, () => {
          if (
            !mountedRef.current ||
            formGenerationAtStart !== formValidationGenerationRef.current
          ) {
            return
          }
          void runImmediateFieldValidation(name, snapshot, reason)
        })
        return { message: undefined, rootError: undefined }
      }

      validationScheduler.cancel(name)
      return runImmediateFieldValidation(name, values, reason)
    },
    [
      abortFieldSignal,
      commitState,
      nextFieldGeneration,
      runImmediateFieldValidation,
      validationScheduler,
    ],
  )

  const validateDependentsBatch = useCallback(
    async (dependentNames: Array<FieldPath<T>>, values: T) => {
      if (dependentNames.length === 0) return

      const formGeneration = formValidationGenerationRef.current
      const planned = dependentNames.map((name) => ({
        name,
        fieldGeneration: nextFieldGeneration(name),
        signal: beginFieldSignal(name),
      }))

      if (mountedRef.current) {
        commitState((prev) => ({ ...prev, isValidating: true }))
      }

      try {
        const results = await Promise.all(
          planned.map(async ({ name, fieldGeneration, signal }) => {
            try {
              const result = await runFieldValidationPipeline<TInput, TOutput, TContext>({
                name,
                values,
                validate: optionsRef.current.validate,
                rules: optionsRef.current.rules,
                fieldValidators: optionsRef.current.fieldValidators,
                resolver: optionsRef.current.resolver,
                resolverContext: optionsRef.current.resolverContext,
                signal,
                reason: 'dependency',
                skipFieldPaths: inactivePathsRef.current,
                criteriaMode: optionsRef.current.criteriaMode,
                messages: captureMessageSnapshot(
                  optionsRef.current.validationMessages,
                  optionsRef.current.fieldLabels,
                ),
              })
              return { name, fieldGeneration, ...result, aborted: false as const }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                return {
                  name,
                  fieldGeneration,
                  message: undefined,
                  error: undefined,
                  rootError: undefined,
                  rootErrorDetails: undefined,
                  aborted: true as const,
                }
              }
              throw error
            }
          }),
        )

        if (!mountedRef.current || formGeneration !== formValidationGenerationRef.current) {
          return
        }

        commitState((prev) => {
          let nextDetails = prev.errorDetails
          let nextRoot = prev.rootErrorDetails
          for (const result of results) {
            if (result.aborted) continue
            if (result.fieldGeneration !== fieldValidationGenerationsRef.current.get(result.name)) {
              continue
            }
            validatedFieldsRef.current.add(result.name)
            nextDetails = setFieldErrorDetail(nextDetails, result.name, result.error)
            if (result.rootErrorDetails) {
              nextRoot = result.rootErrorDetails
            }
          }
          return {
            ...prev,
            ...syncErrorViews(nextDetails, nextRoot),
            isValidating: false,
          }
        })
      } catch (error) {
        if (
          mountedRef.current &&
          formGeneration === formValidationGenerationRef.current &&
          !(error instanceof Error && error.name === 'AbortError')
        ) {
          commitState((prev) => ({ ...prev, isValidating: false }))
          throw error
        }
        if (mountedRef.current && formGeneration === formValidationGenerationRef.current) {
          commitState((prev) => ({ ...prev, isValidating: false }))
        }
      }
    },
    [beginFieldSignal, commitState, nextFieldGeneration],
  )

  const scheduleDependentRevalidation = useCallback(
    (
      changedPaths: readonly string[],
      values: T,
      force: boolean,
      exclude: ReadonlySet<string> = new Set(),
    ) => {
      const index = dependencyIndexRef.current
      if (index.size === 0) return

      const affected = collectAffectedDependents(changedPaths, index)
      if (affected.length === 0) return

      const stateSnapshot = store.getState()
      const mode = optionsRef.current.dependencyMode
      const eligible = affected.filter(
        (dependent) =>
          !exclude.has(dependent) &&
          !isInactivePath(dependent, inactivePathsRef.current) &&
          shouldRevalidateDependent({
            touched: stateSnapshot.touched[dependent as FieldPath<T>] === true,
            hasError:
              typeof stateSnapshot.errors[dependent as FieldPath<T>] === 'string' &&
              stateSnapshot.errors[dependent as FieldPath<T>]!.length > 0,
            isSubmitted: stateSnapshot.isSubmitted,
            previouslyValidated: validatedFieldsRef.current.has(dependent),
            force,
            mode,
          }),
      ) as Array<FieldPath<T>>

      if (eligible.length === 0) return

      const immediate: Array<FieldPath<T>> = []
      const deferred: Array<FieldPath<T>> = []
      for (const name of eligible) {
        const combined = getCombinedFieldRules(
          name,
          optionsRef.current.rules,
          optionsRef.current.fieldValidators,
        )
        if (resolveFieldDebounceMs(combined) > 0) {
          deferred.push(name)
        } else {
          immediate.push(name)
        }
      }

      if (immediate.length > 0) {
        void validateDependentsBatch(immediate, values)
      }
      for (const name of deferred) {
        void validateFieldInternal(name, values, 'dependency')
      }
    },
    [store, validateDependentsBatch, validateFieldInternal],
  )

  const clearFileInputForPath = useCallback((name: FieldPath<T>) => {
    const elements = fieldElementsRef.current.get(name)
    if (!elements) return
    for (const element of elements) {
      clearNativeFileInput(element)
    }
  }, [])

  const clearChangedNativeFileInputs = useCallback((previous: T, next: T) => {
    forEachFieldElement(fieldElementsRef.current, (path, element) => {
      const before = getValueAtPath(previous, path)
      const after = getValueAtPath(next, path)
      if (!leafValuesEqual(before, after)) {
        clearNativeFileInput(element)
      }
    })
  }, [])

  const clearAllNativeFileInputs = useCallback(() => {
    forEachFieldElement(fieldElementsRef.current, (_path, element) => {
      clearNativeFileInput(element)
    })
  }, [])

  const runDefaultsLoad = useCallback(
    async (
      reason: DefaultValuesLoadReason,
      loadOptions?: ReloadDefaultValuesOptions,
    ): Promise<void> => {
      const loader = optionsRef.current.loadDefaultValues
      if (!loader) {
        if (reason === 'reload') {
          throw new Error('reloadDefaultValues requires useForm({ loadDefaultValues })')
        }
        return
      }

      const generation = ++defaultsLoadGenerationRef.current
      const signal = beginDefaultsSignal()
      const mode = loadOptions?.mode ?? optionsRef.current.defaultValuesLoadMode ?? 'preserveDirty'
      const shouldValidateAfter =
        loadOptions?.validate ?? optionsRef.current.validateOnDefaultsLoad ?? false

      if (mountedRef.current) {
        commitState((prev) => ({
          ...prev,
          isLoadingDefaults: true,
          isDefaultsReady: false,
          defaultValuesError: undefined,
        }))
      }

      try {
        const raw = await loader({
          signal,
          reason,
          context: optionsRef.current.resolverContext,
        })

        if (
          !mountedRef.current ||
          generation !== defaultsLoadGenerationRef.current ||
          signal?.aborted
        ) {
          return
        }

        assertLoadedDefaultValues(raw)
        const loaded = cloneValues(raw)
        const snapshot = store.getState()
        const applied = applyLoadedDefaultValues({
          currentValues: snapshot.values,
          previousDefaults: snapshot.defaultValues,
          loaded,
          mode,
          touched: snapshot.touched,
          errors: snapshot.errors,
          errorDetails: snapshot.errorDetails,
        })

        const nextValues = stripInactiveValues(applied.values)
        let nextDetails = applied.errorDetails
        let nextTouched = applied.touched
        for (const root of inactivePathsRef.current) {
          nextDetails = omitFieldErrorDetailsUnder(nextDetails, root)
          nextTouched = omitPathAndDescendants(nextTouched, root)
        }

        bumpFormValidationGeneration()
        fieldArrayFocusGenerationRef.current += 1

        commitState((prev) => ({
          ...prev,
          values: nextValues,
          defaultValues: applied.defaultValues,
          touched: nextTouched,
          ...syncErrorViews(nextDetails, undefined),
          isLoadingDefaults: false,
          isDefaultsReady: true,
          defaultValuesError: undefined,
        }))

        syncKnownFieldArrayKeys(nextValues)
        clearChangedNativeFileInputs(snapshot.values, nextValues)

        if (shouldValidateAfter && mountedRef.current) {
          await validateInternal(store.getState().values, 'manual')
        }
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) {
          return
        }
        if (!mountedRef.current || generation !== defaultsLoadGenerationRef.current) {
          return
        }
        commitState((prev) => ({
          ...prev,
          isLoadingDefaults: false,
          isDefaultsReady: false,
          defaultValuesError: toDefaultValuesError(error),
        }))
        if (reason === 'reload') {
          throw toDefaultValuesError(error)
        }
      }
    },
    [
      beginDefaultsSignal,
      bumpFormValidationGeneration,
      clearChangedNativeFileInputs,
      commitState,
      store,
      stripInactiveValues,
      syncKnownFieldArrayKeys,
      validateInternal,
    ],
  )

  const reloadDefaultValues = useCallback(
    (loadOptions?: ReloadDefaultValuesOptions) => {
      assertNotInBatch('reloadDefaultValues()')
      return runDefaultsLoad('reload', loadOptions)
    },
    [assertNotInBatch, runDefaultsLoad],
  )

  const runDefaultsLoadRef = useRef(runDefaultsLoad)
  runDefaultsLoadRef.current = runDefaultsLoad

  useEffect(() => {
    if (!hasDefaultsLoader) return
    void runDefaultsLoadRef.current('initial')
  }, [hasDefaultsLoader])

  const setValue = useCallback(
    <K extends FieldPath<T>>(
      name: K,
      value: FieldPathValue<T, K>,
      setOptions?: SetValueOptions,
    ) => {
      markFieldRegistered(name)

      const next = commitState((prev) => {
        const nextTouched =
          setOptions?.shouldTouch === true ? { ...prev.touched, [name]: true } : prev.touched
        const valueChanged = !leafValuesEqual(readFieldValue(prev.values, name), value)
        const nextDetails = valueChanged
          ? stripServerIssuesUnder(prev.errorDetails, name)
          : prev.errorDetails

        return {
          ...prev,
          values: writeFieldValue(prev.values, name, value),
          touched: nextTouched,
          ...syncErrorViews(nextDetails, prev.rootErrorDetails),
        }
      })

      // Native file inputs cannot be populated programmatically; only cleared.
      if (shouldClearNativeFileInput(value)) {
        clearFileInputForPath(name)
      }

      if (store.getTransactionDepth() > 0) {
        const queue = batchQueueRef.current
        if (queue.forceForm) {
          return
        }
        if (setOptions?.shouldValidate === false) {
          return
        }
        const force = setOptions?.shouldValidate === true
        const runSourceValidate =
          force ||
          shouldValidateOnChange(
            optionsRef.current.mode,
            optionsRef.current.reValidateMode,
            next.isSubmitted,
          )
        if (runSourceValidate) {
          queueFieldValidation(queue, name)
        }
        queueSourcePath(queue, name)
        return
      }

      if (setOptions?.shouldValidate === false) {
        return
      }

      const force = setOptions?.shouldValidate === true
      const runSourceValidate =
        force ||
        shouldValidateOnChange(
          optionsRef.current.mode,
          optionsRef.current.reValidateMode,
          next.isSubmitted,
        )

      if (runSourceValidate) {
        void validateFieldInternal(name, next.values, 'change')
      }
      scheduleDependentRevalidation([name], next.values, force)
    },
    [
      clearFileInputForPath,
      commitState,
      markFieldRegistered,
      scheduleDependentRevalidation,
      store,
      validateFieldInternal,
    ],
  )

  const blurField = useCallback(
    (name: FieldPath<T>) => {
      markFieldRegistered(name)
      commitState((prev) => ({
        ...prev,
        touched: { ...prev.touched, [name]: true },
      }))

      if (
        shouldValidateOnBlur(
          optionsRef.current.mode,
          optionsRef.current.reValidateMode,
          store.getState().isSubmitted,
        )
      ) {
        if (store.getTransactionDepth() > 0) {
          if (!batchQueueRef.current.forceForm) {
            queueFieldValidation(batchQueueRef.current, name)
            queueSourcePath(batchQueueRef.current, name)
          }
          return
        }
        void validateFieldInternal(name, store.getState().values, 'blur')
      }
      // When blur does not validate, a pending change debounce remains scheduled.
    },
    [commitState, markFieldRegistered, store, validateFieldInternal],
  )

  const applyFieldArrayChange = useCallback(
    (args: ApplyFieldArrayChangeArgs) => {
      const { name, nextItems, nextKeys, remap, options } = args
      const arrayPath = name as FieldPath<T>

      bumpFormValidationGeneration()
      fieldArrayFocusGenerationRef.current += 1
      fieldArrayMutationEpochRef.current += 1
      const focusGeneration = fieldArrayFocusGenerationRef.current
      fieldArrayKeysRef.current.set(name, nextKeys)

      unregisterScheduler.cancelWhere(
        (path) =>
          path === name || path.startsWith(`${name}.`) || Boolean(parseIndexedPath(path, name)),
      )
      validationScheduler.cancelWhere(
        (path) =>
          path === name || path.startsWith(`${name}.`) || Boolean(parseIndexedPath(path, name)),
      )

      const next = commitState((prev) => {
        const nextDetails =
          remap === 'replace'
            ? (omitArrayPathTree(prev.errorDetails, name) as FieldErrorDetails<T>)
            : (reindexPathRecord(prev.errorDetails, name, remap) as FieldErrorDetails<T>)
        let nextTouched =
          remap === 'replace'
            ? (omitArrayPathTree(prev.touched, name) as FieldTouched<T>)
            : (reindexPathRecord(prev.touched, name, remap) as FieldTouched<T>)

        if (options?.shouldTouch === true) {
          nextTouched = { ...nextTouched, [arrayPath]: true }
        }

        return {
          ...prev,
          values: writeFieldValue(
            prev.values,
            arrayPath,
            nextItems as FieldPathValue<T, typeof arrayPath>,
          ),
          ...syncErrorViews(nextDetails, prev.rootErrorDetails),
          touched: nextTouched,
        }
      })

      if (remap === 'replace') {
        fieldOrderRef.current = omitArrayPathsFromList(fieldOrderRef.current, name) as Array<
          FieldPath<T>
        >
        clearElementMapUnderArray(fieldElementsRef.current, name)
      } else {
        fieldOrderRef.current = reindexPathList(fieldOrderRef.current, name, remap) as Array<
          FieldPath<T>
        >
        reindexElementMap(fieldElementsRef.current, name, remap)
      }

      // Drop validation epochs for removed/reindexed paths so stale results cannot land.
      for (const key of [...fieldValidationGenerationsRef.current.keys()]) {
        if (parseIndexedPath(key, name) || key === name) {
          fieldValidationGenerationsRef.current.delete(key)
        }
      }

      const runValidate =
        options?.shouldValidate === true ||
        shouldValidateOnChange(
          optionsRef.current.mode,
          optionsRef.current.reValidateMode,
          next.isSubmitted,
        )

      if (runValidate) {
        if (store.getTransactionDepth() > 0) {
          batchQueueRef.current.formRequested = true
        } else {
          void validateInternal(next.values, 'change')
        }
      }

      if (options?.shouldFocus === true && options.focusIndex !== undefined) {
        const focusIndex = options.focusIndex
        const relative = options.focusName
        const focusPath = (
          relative && relative.length > 0
            ? `${name}.${focusIndex}.${relative}`
            : `${name}.${focusIndex}`
        ) as FieldPath<T>

        queueMicrotask(() => {
          if (!mountedRef.current || focusGeneration !== fieldArrayFocusGenerationRef.current) {
            return
          }
          requestAnimationFrame(() => {
            if (!mountedRef.current || focusGeneration !== fieldArrayFocusGenerationRef.current) {
              return
            }
            const element = getFirstFocusableElement(fieldElementsRef.current, focusPath)
            if (element && typeof element.focus === 'function') {
              element.focus()
              return
            }
            focusFieldById(createFieldId(formId, focusPath))
          })
        })
      }
    },
    [
      bumpFormValidationGeneration,
      commitState,
      formId,
      store,
      unregisterScheduler,
      validateInternal,
      validationScheduler,
    ],
  )

  controlBridge.handlers = {
    setValue,
    blurField,
    connectElement,
    disconnectElement,
    retainController,
    releaseController,
    markFieldRegistered,
    applyFieldArrayChange,
    getFieldArrayKeys,
    ensureFieldArrayKeys: ensureFieldArrayKeysForPath,
    allocateFieldArrayKey,
  }

  const setValues = useCallback(
    (values: DeepPartial<T>, setOptions?: SetValueOptions) => {
      const paths = listTouchedPathsFromPartial(values)
      paths.forEach(markFieldRegistered)

      const next = commitState((prev) => {
        let nextTouched = prev.touched
        if (setOptions?.shouldTouch === true) {
          nextTouched = { ...prev.touched }
          for (const path of paths) {
            nextTouched[path] = true
          }
        }
        const nextValues = mergeFormValues(prev.values, values)
        let nextDetails = prev.errorDetails
        for (const path of paths) {
          if (
            !leafValuesEqual(readFieldValue(prev.values, path), readFieldValue(nextValues, path))
          ) {
            nextDetails = stripServerIssuesUnder(nextDetails, path)
          }
        }
        return {
          ...prev,
          values: nextValues,
          touched: nextTouched,
          ...syncErrorViews(nextDetails, prev.rootErrorDetails),
        }
      })

      if (store.getTransactionDepth() > 0) {
        const queue = batchQueueRef.current
        if (queue.forceForm) {
          return
        }
        if (setOptions?.shouldValidate === false) {
          return
        }
        const force = setOptions?.shouldValidate === true
        const runFullValidate =
          force ||
          shouldValidateOnChange(
            optionsRef.current.mode,
            optionsRef.current.reValidateMode,
            next.isSubmitted,
          )
        if (runFullValidate) {
          queue.formRequested = true
        } else {
          for (const path of paths) {
            queueSourcePath(queue, path)
          }
        }
        return
      }

      if (setOptions?.shouldValidate === false) {
        return
      }

      const force = setOptions?.shouldValidate === true
      const runFullValidate =
        force ||
        shouldValidateOnChange(
          optionsRef.current.mode,
          optionsRef.current.reValidateMode,
          next.isSubmitted,
        )

      if (runFullValidate) {
        // Whole-form pipeline covers dependents; avoid a second dependency pass.
        void validateInternal(next.values, 'change')
      } else {
        scheduleDependentRevalidation(paths, next.values, force)
      }
    },
    [commitState, markFieldRegistered, scheduleDependentRevalidation, store, validateInternal],
  )

  const setError = useCallback(
    <K extends FieldPath<T>>(
      name: K,
      message: string | Exclude<ValidationIssueInput, undefined | string>,
      options?: SetErrorOptions,
    ) => {
      markFieldRegistered(name)
      const error = manualFieldError(message, options)
      commitState((prev) => ({
        ...prev,
        ...syncErrorViews(
          setFieldErrorDetail(prev.errorDetails, name, error),
          prev.rootErrorDetails,
        ),
      }))
    },
    [commitState, markFieldRegistered],
  )

  const setErrors = useCallback(
    (errors: SetErrorsInput<T> | FieldErrors<T>, options?: SetErrorOptions) => {
      const incoming = detailsFromSetErrorsInput(errors, options)
      commitState((prev) => ({
        ...prev,
        ...syncErrorViews(
          mergeFieldErrorDetails(prev.errorDetails, incoming),
          prev.rootErrorDetails,
        ),
      }))
    },
    [commitState],
  )

  const clearError = useCallback(
    <K extends FieldPath<T>>(name: K) => {
      commitState((prev) => ({
        ...prev,
        ...syncErrorViews(omitFieldErrorDetail(prev.errorDetails, name), prev.rootErrorDetails),
      }))
    },
    [commitState],
  )

  const clearErrors = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      ...syncErrorViews({}, undefined),
    }))
  }, [commitState])

  const clearRootError = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      ...syncErrorViews(prev.errorDetails, undefined),
    }))
  }, [commitState])

  const setSubmitError = useCallback(
    (message: string | undefined) => {
      commitState((prev) => ({
        ...prev,
        submitError: message,
      }))
    },
    [commitState],
  )

  const validate = useCallback((): Promise<boolean> => {
    assertNotInBatch('validate()')
    return (async () => {
      const { errors, rootError } = await validateInternal(store.getState().values, 'manual')
      return !hasValidationFailure(errors, rootError)
    })()
  }, [assertNotInBatch, store, validateInternal])

  const validateField = useCallback(
    <K extends FieldPath<T>>(name: K): Promise<boolean> => {
      assertNotInBatch('validateField()')
      if (isInactivePath(name, inactivePathsRef.current)) {
        return Promise.resolve(true)
      }
      markFieldRegistered(name)
      return (async () => {
        const { message, rootError } = await validateFieldInternal(
          name,
          store.getState().values,
          'manual',
        )
        return message === undefined && !(typeof rootError === 'string' && rootError.length > 0)
      })()
    },
    [assertNotInBatch, markFieldRegistered, store, validateFieldInternal],
  )

  const reset = useCallback(
    (nextValues?: DeepPartial<T>, resetOptions?: ResetOptions<T>) => {
      bumpFormValidationGeneration()
      isSubmittingRef.current = false
      validatedFieldsRef.current.clear()
      clearQueuedValidation(batchQueueRef.current)

      const updatingDefaults = nextValues !== undefined && !resetOptions?.keepDefaultValues
      if (updatingDefaults) {
        bumpDefaultsLoadGeneration()
      }

      const next = commitState((prev) => {
        const nextDefaults = updatingDefaults
          ? cloneValues(mergeFormValues(prev.defaultValues, nextValues))
          : prev.defaultValues

        let restoredValues =
          nextValues !== undefined
            ? cloneValues(mergeFormValues(nextDefaults, nextValues))
            : cloneValues(nextDefaults)

        const keepValues = resetOptions?.keepValues
        if (keepValues?.length) {
          for (const path of keepValues) {
            restoredValues = writeFieldValue(
              restoredValues,
              path,
              readFieldValue(prev.values, path),
            )
          }
        }

        restoredValues = stripInactiveValues(restoredValues)

        return {
          values: restoredValues,
          defaultValues: updatingDefaults ? nextDefaults : prev.defaultValues,
          errors: resetOptions?.keepErrors ? prev.errors : {},
          errorDetails: resetOptions?.keepErrors ? prev.errorDetails : {},
          touched: resetOptions?.keepTouched ? prev.touched : {},
          isSubmitting: false,
          isValidating: false,
          isLoadingDefaults: updatingDefaults ? false : prev.isLoadingDefaults,
          isDefaultsReady: updatingDefaults ? true : prev.isDefaultsReady,
          defaultValuesError: updatingDefaults ? undefined : prev.defaultValuesError,
          isSubmitted: resetOptions?.keepIsSubmitted ? prev.isSubmitted : false,
          submitCount: resetOptions?.keepSubmitCount ? prev.submitCount : 0,
          submitError: resetOptions?.keepSubmitError ? prev.submitError : undefined,
          rootError: resetOptions?.keepErrors ? prev.rootError : undefined,
          rootErrorDetails: resetOptions?.keepErrors ? prev.rootErrorDetails : undefined,
        }
      })

      syncKnownFieldArrayKeys(next.values)

      // Browsers cannot restore a non-empty file selection; clear visible inputs.
      clearAllNativeFileInputs()
    },
    [
      bumpDefaultsLoadGeneration,
      bumpFormValidationGeneration,
      clearAllNativeFileInputs,
      commitState,
      stripInactiveValues,
      syncKnownFieldArrayKeys,
    ],
  )

  const resetField = useCallback(
    <K extends FieldPath<T>>(name: K) => {
      if (isInactivePath(name, inactivePathsRef.current)) {
        cancelFieldValidationWork(name)
        dropQueuedPathsUnder(batchQueueRef.current, name)
        return
      }
      const restoredPreview = readFieldValue(store.getState().defaultValues, name)
      const isArrayField = Array.isArray(restoredPreview)

      if (isArrayField) {
        bumpFormValidationGeneration()
      } else {
        cancelFieldValidationWork(name)
        validatedFieldsRef.current.delete(name)
      }
      dropQueuedPathsUnder(batchQueueRef.current, name)

      commitState((prev) => {
        const restoredValue = readFieldValue(prev.defaultValues, name)
        let nextTouched = { ...prev.touched }
        let nextDetails = prev.errorDetails

        if (Array.isArray(restoredValue)) {
          nextTouched = omitArrayPathTree(nextTouched, name)
          nextDetails = omitArrayPathTree(nextDetails, name)
          for (const path of [...validatedFieldsRef.current]) {
            if (path === name || path.startsWith(`${name}.`)) {
              validatedFieldsRef.current.delete(path)
            }
          }
        } else {
          delete nextTouched[name]
          nextDetails = omitFieldErrorDetail(prev.errorDetails, name)
        }

        return {
          ...prev,
          values: writeFieldValue(prev.values, name, restoredValue),
          touched: nextTouched,
          ...syncErrorViews(nextDetails, prev.rootErrorDetails),
        }
      })

      if (isArrayField) {
        const length = Array.isArray(restoredPreview) ? restoredPreview.length : 0
        regenerateFieldArrayKeys(name, length)
        fieldOrderRef.current = omitArrayPathsFromList(fieldOrderRef.current, name) as Array<
          FieldPath<T>
        >
        clearElementMapUnderArray(fieldElementsRef.current, name)
      }

      clearFileInputForPath(name)
    },
    [
      bumpFormValidationGeneration,
      cancelFieldValidationWork,
      clearFileInputForPath,
      commitState,
      regenerateFieldArrayKeys,
      store,
    ],
  )

  const buildHelpers = useCallback((): SubmitHelpers<T> => {
    return {
      setError,
      setErrors,
      setSubmitError,
      reset,
    }
  }, [reset, setError, setErrors, setSubmitError])

  const handleSubmit = useCallback(
    (event?: SubmitEvent<HTMLFormElement>) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault()
      }
      assertNotInBatch('handleSubmit()')

      const run = async () => {
        const opts = optionsRef.current
        if (opts.preventDuplicateSubmit && isSubmittingRef.current) {
          return
        }

        const defaultsState = store.getState()
        if (defaultsState.isLoadingDefaults && !opts.allowSubmitWhileLoading) {
          return
        }
        if (
          defaultsState.defaultValuesError &&
          !defaultsState.isDefaultsReady &&
          !opts.allowSubmitWhenDefaultsFailed
        ) {
          return
        }

        isSubmittingRef.current = true

        const currentValues = store.getState().values
        const leafPaths = listLeafFieldPaths(currentValues)
        const registered = fieldOrderRef.current
        const allNames = [...new Set<FieldPath<T>>([...registered, ...leafPaths])]
        const touched: FieldTouched<T> = { ...store.getState().touched }
        for (const name of allNames) {
          if (isInactivePath(name, inactivePathsRef.current)) continue
          touched[name] = true
          markFieldRegistered(name)
        }

        commitState((prev) => ({
          ...prev,
          touched,
          isSubmitting: true,
          submitError: undefined,
          submitCount: prev.submitCount + 1,
        }))

        const finishSubmitting = (extra?: Partial<FormInternalState<T>>) => {
          isSubmittingRef.current = false
          if (mountedRef.current) {
            commitState((prev) => ({
              ...prev,
              ...extra,
              isSubmitting: false,
              isSubmitted: true,
            }))
          }
        }

        try {
          const validation = validateInternal(currentValues, 'submit')
          const validationGeneration = formValidationGenerationRef.current
          const { errors, rootError, output } = await validation

          // A reset, field-array mutation, or newer validation invalidated this submit cycle.
          // Do not submit output produced from a stale input snapshot.
          if (!mountedRef.current || validationGeneration !== formValidationGenerationRef.current) {
            isSubmittingRef.current = false
            if (mountedRef.current) {
              commitState((prev) => (prev.isSubmitting ? { ...prev, isSubmitting: false } : prev))
            }
            return
          }

          if (hasValidationFailure(errors, rootError)) {
            if (opts.focusOnError) {
              const first = getFirstErrorField(errors, fieldOrderRef.current)
              if (first && !isInactivePath(first, inactivePathsRef.current)) {
                const el = getFirstFocusableElement(fieldElementsRef.current, first)
                if (el && typeof el.focus === 'function') {
                  el.focus()
                } else if (fieldOrderRef.current.includes(first)) {
                  focusFieldById(createFieldId(formId, first))
                }
              }
            }

            finishSubmitting()
            return
          }

          const submitFn: OnSubmitFn<TOutput, TInput> | undefined = opts.onSubmit
          if (submitFn) {
            const submitValues = (output ?? currentValues) as TOutput
            await submitFn(submitValues, buildHelpers())
          }

          finishSubmitting()
        } catch (error) {
          finishSubmitting()
          throw error
        }
      }

      return run()
    },
    [
      assertNotInBatch,
      buildHelpers,
      commitState,
      formId,
      markFieldRegistered,
      store,
      validateInternal,
    ],
  )

  const parseIncomingValue = useCallback(
    <K extends FieldPath<T>>(
      name: K,
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      registerOptions?: RegisterOptions<T, K>,
    ): FieldPathValue<T, K> => {
      const target = event.target

      const isFileRegistration = registerOptions?.type === 'file'
      const isDomFileInput =
        typeof HTMLInputElement !== 'undefined' &&
        target instanceof HTMLInputElement &&
        target.type === 'file'

      // Prefer explicit `type: 'file'` registration; fall back to DOM type for safety.
      if (isFileRegistration || isDomFileInput) {
        const multiple = registerOptions?.multiple === true || (isDomFileInput && target.multiple)
        const parsed = parseFileInputValue(target, multiple)
        if (registerOptions?.setValueAs) {
          return registerOptions.setValueAs(parsed as never)
        }
        return parsed as FieldPathValue<T, K>
      }

      if (registerOptions?.setValueAs) {
        return registerOptions.setValueAs(isCheckboxInput(target) ? target.checked : target.value)
      }

      const currentValue = readFieldValue(store.getState().values, name)

      if (
        registerOptions?.type === 'checkbox' ||
        (registerOptions?.type === undefined && typeof currentValue === 'boolean')
      ) {
        if (isCheckboxInput(target) && target.type === 'checkbox') {
          return target.checked as FieldPathValue<T, K>
        }
      }

      if (registerOptions?.type === 'radio' || registerOptions?.value !== undefined) {
        if (isCheckboxInput(target) && target.type === 'radio') {
          return (registerOptions.value ?? target.value) as FieldPathValue<T, K>
        }
      }

      if (registerOptions?.valueAsNumber || registerOptions?.type === 'number') {
        const raw = target.value
        const numeric = target instanceof HTMLInputElement ? target.valueAsNumber : Number(raw)
        return (raw === '' ? Number.NaN : numeric) as FieldPathValue<T, K>
      }

      let value: unknown = target.value
      if (registerOptions?.trim && typeof value === 'string') {
        value = value.trim()
      }

      return value as FieldPathValue<T, K>
    },
    [store],
  )

  const createFieldProps = useCallback(
    <K extends FieldPath<T>>(name: K, registerOptions?: RegisterOptions<T, K>): FieldProps => {
      markFieldRegistered(name)
      rememberFieldUnregisterOption(name, registerOptions?.shouldUnregister)

      const errorId = createErrorId(formId, name)
      const errorMessage = state.errors[name]
      const hasError = typeof errorMessage === 'string' && errorMessage.length > 0
      const fieldValue = readFieldValue(state.values, name)

      const isFileField = registerOptions?.type === 'file'
      const isCheckbox =
        !isFileField &&
        (registerOptions?.type === 'checkbox' ||
          (registerOptions?.type === undefined && typeof fieldValue === 'boolean'))

      const isRadio = !isFileField && registerOptions?.type === 'radio'
      const fieldId =
        registerOptions?.id ??
        (isRadio && registerOptions?.value !== undefined
          ? createFieldId(formId, name, registerOptions.value)
          : createFieldId(formId, name))

      const onChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => {
        const nextValue = parseIncomingValue(name, event, registerOptions)
        setValue(name, nextValue)
      }

      const onBlur = () => {
        blurField(name)
      }

      let attached: FocusableFieldElement | null = null
      const ref: FieldProps['ref'] = (element) => {
        if (attached && attached !== element) {
          disconnectElement(name, attached)
        }
        attached = element
        if (element) {
          connectElement(name, element)
        } else if (!hasLiveRegistration(name)) {
          maybeScheduleAutomaticUnregister(name, fieldArrayMutationEpochRef.current)
        }
      }

      const base: FieldProps = {
        name,
        id: fieldId,
        ref,
        onChange,
        onBlur,
        'aria-invalid': hasError || undefined,
        'aria-describedby': hasError ? errorId : undefined,
        disabled: registerOptions?.disabled,
        required: registerOptions?.required,
      }

      // File inputs must remain uncontrolled — never pass `value` or `checked`.
      if (isFileField) {
        return {
          ...base,
          multiple: registerOptions?.multiple === true ? true : undefined,
          accept: registerOptions?.accept,
        }
      }

      if (isCheckbox) {
        return {
          ...base,
          checked: Boolean(fieldValue),
        }
      }

      if (isRadio) {
        return {
          ...base,
          checked: Object.is(fieldValue, registerOptions?.value),
          value: registerOptions?.value === undefined ? undefined : String(registerOptions.value),
        }
      }

      const displayValue = formatNativeInputValue(fieldValue)

      return {
        ...base,
        value: displayValue,
      }
    },
    [
      blurField,
      connectElement,
      disconnectElement,
      formId,
      hasLiveRegistration,
      markFieldRegistered,
      maybeScheduleAutomaticUnregister,
      parseIncomingValue,
      rememberFieldUnregisterOption,
      setValue,
      state.errors,
      state.values,
    ],
  )

  const register = useCallback(
    <K extends FieldPath<T>>(name: K, registerOptions?: RegisterOptions<T, K>) =>
      createFieldProps(name, registerOptions),
    [createFieldProps],
  )

  const unregister = useCallback(
    (name: FieldPath<T> | readonly FieldPath<T>[], options?: UnregisterOptions) => {
      const names: readonly FieldPath<T>[] = typeof name === 'string' ? [name] : name
      const resolved = resolveUnregisterOptions(options, DEFAULT_EXPLICIT_UNREGISTER_OPTIONS)
      for (const path of names) {
        parsePath(path)
        dropQueuedPathsUnder(batchQueueRef.current, path)
        performUnregister(path, resolved, false)
      }
      if (resolved.shouldValidate) {
        if (store.getTransactionDepth() > 0) {
          batchQueueRef.current.formRequested = true
        } else {
          void validateInternal(store.getState().values, 'manual')
        }
      }
    },
    [performUnregister, store, validateInternal],
  )

  const getFieldId = useCallback(
    <K extends FieldPath<T>>(name: K) => createFieldId(formId, name),
    [formId],
  )

  const getErrorId = useCallback(
    <K extends FieldPath<T>>(name: K) => createErrorId(formId, name),
    [formId],
  )

  const getValues = useCallback(() => readFormValues(store.getState()), [store])

  const getValue = useCallback(
    <K extends FieldPath<T>>(name: K) => readFormValue(store.getState(), name),
    [store],
  )

  const getErrors = useCallback(() => readErrors(store.getState()), [store])

  const getErrorDetails = useCallback(() => readErrorDetails(store.getState()), [store])

  const getFieldState = useCallback(
    <K extends FieldPath<T>>(name: K) =>
      readFieldState(store.getState(), name, {
        registered: hasLiveRegistration(name),
        active: !isInactivePath(name, inactivePathsRef.current),
      }),
    [hasLiveRegistration, store],
  )

  const getDirtyValues = useCallback(() => readDirtyValues(store.getState()), [store])

  const getTouchedValues = useCallback(() => readTouchedValues(store.getState()), [store])

  const flushBatchValidation = useCallback(
    async (queue: BatchValidationQueue) => {
      const values = store.getState().values
      if (queue.forceForm || queue.formRequested) {
        await validateInternal(values, queue.forceForm ? 'manual' : 'change')
        return
      }
      const validated = new Set<string>()
      for (const path of queue.fieldPaths) {
        validated.add(path)
        await validateFieldInternal(path as FieldPath<T>, values, 'change')
      }
      if (queue.sourcePaths.length > 0) {
        scheduleDependentRevalidation(queue.sourcePaths, store.getState().values, false, validated)
      }
    },
    [scheduleDependentRevalidation, store, validateFieldInternal, validateInternal],
  )

  const batch = useCallback(
    (callback: () => void, options?: BatchOptions): Promise<void> => {
      const isOuter = store.getTransactionDepth() === 0
      if (isOuter) {
        store.beginTransaction()
        batchQueueRef.current = createBatchValidationQueue()
        let resolveCompletion!: () => void
        let rejectCompletion!: (error: unknown) => void
        const promise = new Promise<void>((resolve, reject) => {
          resolveCompletion = resolve
          rejectCompletion = reject
        })
        void promise.catch(() => undefined)
        outerBatchCompletionRef.current = {
          promise,
          resolve: resolveCompletion,
          reject: rejectCompletion,
        }
      }
      if (options?.shouldValidate === true) {
        batchQueueRef.current.forceForm = true
      }

      let callbackError: unknown
      try {
        // Widen `() => void` so we can inspect an illegal thenable return at runtime.
        const run: () => unknown = callback
        const result = run()
        if (isThenable(result)) {
          callbackError = new Error(ASYNC_BATCH_CALLBACK_ERROR)
        }
      } catch (error) {
        callbackError = error
      }

      if (callbackError !== undefined) {
        if (isOuter) {
          store.endTransaction()
          clearQueuedValidation(batchQueueRef.current)
          batchQueueRef.current.forceForm = false
          const completion = outerBatchCompletionRef.current
          outerBatchCompletionRef.current = null
          completion?.resolve()
        }
        throw callbackError instanceof Error
          ? callbackError
          : new Error('form.batch() callback failed', { cause: callbackError })
      }

      if (!isOuter) {
        return outerBatchCompletionRef.current?.promise ?? Promise.resolve()
      }

      store.endTransaction()
      const queue = batchQueueRef.current
      batchQueueRef.current = createBatchValidationQueue()
      const completion = outerBatchCompletionRef.current
      outerBatchCompletionRef.current = null
      const flush = flushBatchValidation(queue)
      void flush.then(
        () => {
          completion?.resolve()
        },
        (error: unknown) => {
          completion?.reject(error)
        },
      )
      return completion?.promise ?? flush
    },
    [flushBatchValidation, store],
  )

  const dirtyFields = useMemo(
    () => computeDirtyFields(state.values, state.defaultValues),
    [state.defaultValues, state.values],
  )

  const isDirty = useMemo(
    () => computeIsDirty(state.values, state.defaultValues),
    [state.defaultValues, state.values],
  )

  return {
    values: state.values,
    defaultValues: state.defaultValues,
    errors: state.errors,
    errorDetails: state.errorDetails,
    touched: state.touched,
    dirtyFields,
    isDirty,
    isValid: !hasValidationFailure(state.errors, state.rootError),
    isSubmitting: state.isSubmitting,
    isValidating: state.isValidating,
    isLoadingDefaults: state.isLoadingDefaults,
    isDefaultsReady: state.isDefaultsReady,
    defaultValuesError: state.defaultValuesError,
    isSubmitted: state.isSubmitted,
    submitCount: state.submitCount,
    submitError: state.submitError,
    rootError: state.rootError,
    rootErrorDetails: state.rootErrorDetails,
    control,
    setValue,
    setValues,
    setError,
    setErrors,
    clearError,
    clearErrors,
    clearRootError,
    setSubmitError,
    reset,
    resetField,
    reloadDefaultValues,
    validateField,
    validate,
    handleSubmit,
    register,
    unregister,
    getFieldProps: register,
    getFieldId,
    getErrorId,
    getValues,
    getValue,
    getErrors,
    getErrorDetails,
    getFieldState,
    getDirtyValues,
    getTouchedValues,
    batch,
  }
}
