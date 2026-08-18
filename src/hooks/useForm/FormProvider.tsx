import { useMemo, type ReactNode } from 'react'
import type { FormValues } from './formTypes.ts'
import { isFormControl, type FormControl } from './formStore.ts'
import { FormControlContext } from './formContext.ts'

export type FormProviderProps<T extends FormValues = FormValues> = {
  control: FormControl<T>
  children: ReactNode
}

/**
 * Provides a stable `FormControl` to descendants.
 * Pass `form.control` — not the full `useForm` return — so provider identity stays stable.
 */
export function FormProvider<T extends FormValues>({ control, children }: FormProviderProps<T>) {
  if (!isFormControl(control)) {
    throw new Error('FormProvider requires a FormControl from useForm().control.')
  }

  const value = useMemo(() => control as FormControl<FormValues>, [control])

  return <FormControlContext.Provider value={value}>{children}</FormControlContext.Provider>
}
