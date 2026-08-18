import { useCallback, useEffect, useMemo, useRef, type RefCallback } from 'react'
import type { FieldPath, FieldPathValue, FormValues, SetValueOptions } from './formTypes.ts'
import type { OptionalFieldPath } from './baseTypes.ts'
import type { FieldError } from './errors.ts'
import { getControlInternals, type FocusableFieldElement, type FormControl } from './formStore.ts'
import { resolveControl, useOptionalFormContext } from './formContext.ts'
import { useStoreSelector } from './subscriptions.ts'
import { computeDirtyFields, createErrorId, createFieldId, readFieldValue } from './utilities.ts'

export type ControllerFieldState = {
  error: string | undefined
  errorDetails: FieldError | undefined
  /** True when this field currently has an error message. */
  invalid: boolean
  touched: boolean
  dirty: boolean
}

export type ControllerField<TDisplay> = {
  name: string
  value: TDisplay
  onChange: (value: TDisplay) => void
  onBlur: () => void
  ref: RefCallback<FocusableFieldElement>
  disabled: boolean
  id: string
  errorId: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

export type UseControllerOptions<
  T extends FormValues,
  TName extends FieldPath<T>,
  TDisplay = FieldPathValue<T, TName>,
> = {
  /** Explicit control. When omitted, the nearest `FormProvider` is required. */
  control?: FormControl<T>
  name: TName
  /**
   * UI-only disabled flag (same policy as `register({ disabled })`):
   * value remains in form state, is validated, and is submitted.
   * Controller `onChange` is a no-op while disabled; `form.setValue` still works.
   */
  disabled?: boolean
  /** Convert UI/display value → stored field value. Not validation — thrown errors propagate. */
  parse?: (value: TDisplay) => FieldPathValue<T, TName>
  /** Convert stored field value → UI/display value. Must not mutate stored state. */
  format?: (value: FieldPathValue<T, TName>) => TDisplay
  /** When true, marks the field touched on every `onChange` (default false). */
  shouldTouchOnChange?: boolean
  /**
   * Force or skip validation on change.
   * When omitted, existing `mode` / `reValidateMode` rules apply via `setValue`.
   */
  shouldValidateOnChange?: boolean
  /**
   * When true, the controller unregisters after unmount (deferred; cancelled on Strict Mode remount).
   * Overrides the form-level `shouldUnregister` option.
   * Only valid for optional paths.
   */
  shouldUnregister?: [TName] extends [OptionalFieldPath<T>] ? boolean : false
}

export type UseControllerReturn<
  T extends FormValues,
  TName extends FieldPath<T>,
  TDisplay = FieldPathValue<T, TName>,
> = {
  field: ControllerField<TDisplay>
  fieldState: ControllerFieldState
}

type ControllerSnapshot<TStored> = {
  value: TStored
  error: string | undefined
  errorDetails: FieldError | undefined
  touched: boolean
  dirty: boolean
}

function controllerSnapshotsEqual<TStored>(
  a: ControllerSnapshot<TStored>,
  b: ControllerSnapshot<TStored>,
): boolean {
  return (
    Object.is(a.value, b.value) &&
    Object.is(a.error, b.error) &&
    Object.is(a.errorDetails, b.errorDetails) &&
    a.touched === b.touched &&
    a.dirty === b.dirty
  )
}

/**
 * Headless controlled-field binding for custom components (date pickers, selects, uploaders).
 * Prefer `register()` for native HTML inputs.
 *
 * Pass `control` explicitly, or omit it inside `<FormProvider>`.
 */
export function useController<
  T extends FormValues,
  TName extends FieldPath<T>,
  TDisplay = FieldPathValue<T, TName>,
>(options: UseControllerOptions<T, TName, TDisplay>): UseControllerReturn<T, TName, TDisplay> {
  const {
    control: controlOption,
    name,
    disabled = false,
    parse,
    format,
    shouldTouchOnChange = false,
    shouldValidateOnChange,
    shouldUnregister,
  } = options

  const context = useOptionalFormContext()
  const control = resolveControl(controlOption, context, 'useController')
  const internals = getControlInternals(control)
  const store = internals.store

  const parseRef = useRef(parse)
  const formatRef = useRef(format)
  const disabledRef = useRef(disabled)
  const shouldTouchRef = useRef(shouldTouchOnChange)
  const shouldValidateRef = useRef(shouldValidateOnChange)
  const shouldUnregisterRef = useRef(shouldUnregister)
  const nameRef = useRef(name)
  const controlRef = useRef(control)
  const attachedElementRef = useRef<FocusableFieldElement | null>(null)

  /* eslint-disable react-hooks/refs -- keep latest options for stable callbacks */
  parseRef.current = parse
  formatRef.current = format
  disabledRef.current = disabled
  shouldTouchRef.current = shouldTouchOnChange
  shouldValidateRef.current = shouldValidateOnChange
  shouldUnregisterRef.current = shouldUnregister
  nameRef.current = name
  controlRef.current = control
  /* eslint-enable react-hooks/refs */

  const snapshot = useStoreSelector(
    store,
    (state): ControllerSnapshot<FieldPathValue<T, TName>> => {
      const dirtyFields = computeDirtyFields(state.values, state.defaultValues)
      return {
        value: readFieldValue(state.values, name) as FieldPathValue<T, TName>,
        error: state.errors[name],
        errorDetails: state.errorDetails[name],
        touched: state.touched[name] === true,
        dirty: dirtyFields[name] === true,
      }
    },
    controllerSnapshotsEqual,
  )

  const formId = internals.getFormId()
  const fieldId = createFieldId(formId, name)
  const errorId = createErrorId(formId, name)
  const invalid = snapshot.errorDetails != null

  const displayValue = (format ? format(snapshot.value) : snapshot.value) as TDisplay

  const onChange = useCallback((value: TDisplay) => {
    if (disabledRef.current) return

    const parseFn = parseRef.current
    const nextStored = (
      parseFn ? parseFn(value) : (value as unknown as FieldPathValue<T, TName>)
    ) as FieldPathValue<T, TName>

    const setOptions: SetValueOptions = {}
    if (shouldTouchRef.current) {
      setOptions.shouldTouch = true
    }
    if (shouldValidateRef.current !== undefined) {
      setOptions.shouldValidate = shouldValidateRef.current
    }

    getControlInternals(controlRef.current)
      .getHandlers()
      .setValue(nameRef.current, nextStored, setOptions)
  }, [])

  const onBlur = useCallback(() => {
    getControlInternals(controlRef.current).getHandlers().blurField(nameRef.current)
  }, [])

  const ref = useCallback<RefCallback<FocusableFieldElement>>((element) => {
    const handlers = getControlInternals(controlRef.current).getHandlers()
    const currentName = nameRef.current
    const previous = attachedElementRef.current
    if (previous && previous !== element) {
      handlers.disconnectElement(currentName, previous)
    }
    attachedElementRef.current = element
    if (element) {
      handlers.connectElement(currentName, element)
    }
  }, [])

  useEffect(() => {
    const currentControl = control
    const currentName = name
    const handlers = getControlInternals(currentControl).getHandlers()
    handlers.retainController(currentName, { shouldUnregister })

    const attached = attachedElementRef.current
    if (attached) {
      handlers.connectElement(currentName, attached)
    }

    return () => {
      const cleanupHandlers = getControlInternals(currentControl).getHandlers()
      const element = attachedElementRef.current
      if (element) {
        cleanupHandlers.disconnectElement(currentName, element)
      }
      cleanupHandlers.releaseController(currentName)
    }
  }, [control, name, shouldUnregister])

  const fieldState = useMemo<ControllerFieldState>(
    () => ({
      error: snapshot.error,
      errorDetails: snapshot.errorDetails,
      invalid,
      touched: snapshot.touched,
      dirty: snapshot.dirty,
    }),
    [invalid, snapshot.dirty, snapshot.error, snapshot.errorDetails, snapshot.touched],
  )

  const field = useMemo<ControllerField<TDisplay>>(
    () => ({
      name,
      value: displayValue,
      onChange,
      onBlur,
      ref,
      disabled,
      id: fieldId,
      errorId,
      'aria-invalid': invalid ? true : undefined,
      'aria-describedby': invalid ? errorId : undefined,
    }),
    [disabled, displayValue, errorId, fieldId, invalid, name, onBlur, onChange, ref],
  )

  return useMemo(
    () => ({
      field,
      fieldState,
    }),
    [field, fieldState],
  )
}
