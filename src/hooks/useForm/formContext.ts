import { createContext, useContext } from 'react'
import type { FormValues } from './formTypes.ts'
import { isFormControl, type FormControl } from './formStore.ts'

const FormControlContext = createContext<FormControl<FormValues> | null>(null)

export { FormControlContext }

/**
 * Returns the nearest provided `FormControl`.
 * The type parameter is a compile-time assertion and cannot be verified at runtime.
 */
export function useFormContext<T extends FormValues = FormValues>(): FormControl<T> {
  const control = useContext(FormControlContext)
  if (!control) {
    throw new Error(
      'useFormContext requires a FormControl. Render this hook inside <FormProvider>.',
    )
  }
  return control as FormControl<T>
}

/** @internal Nearest provider control, or `null` when outside a provider. */
export function useOptionalFormContext(): FormControl<FormValues> | null {
  return useContext(FormControlContext)
}

/**
 * Prefer an explicit control; otherwise use context.
 * @internal
 */
export function resolveControl<T extends FormValues>(
  explicit: FormControl<T> | undefined,
  context: FormControl<FormValues> | null,
  hookName: string,
): FormControl<T> {
  if (explicit != null) {
    if (!isFormControl(explicit)) {
      throw new Error(
        `${hookName} received an invalid FormControl. Pass \`form.control\` from useForm.`,
      )
    }
    return explicit
  }
  if (context != null) {
    return context as FormControl<T>
  }
  throw new Error(
    `${hookName} requires a FormControl. Pass \`control\` explicitly or render it inside <FormProvider>.`,
  )
}
