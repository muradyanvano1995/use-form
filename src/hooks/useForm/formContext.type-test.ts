/**
 * Compile-time type tests for opaque FormControl + FormProvider.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  useController,
  useFieldState,
  useForm,
  useFormContext,
  useFormState,
  useWatch,
  type FormControl,
  type FormProviderProps,
  type UseFormReturn,
} from './index.ts'
// @ts-expect-error — createFormStore is not a public export
import { createFormStore as _createFormStore } from './index.ts'
// @ts-expect-error — getControlInternals is not a public export
import { getControlInternals as _getInternals } from './index.ts'
// @ts-expect-error — FormStore is not a public export
import type { FormStore as _PublicFormStore } from './index.ts'

type ProfileValues = {
  email: string
  address: {
    city: string
  }
  avatar: File | null
  documents: File[]
}

declare const form: UseFormReturn<ProfileValues>
declare const control: FormControl<ProfileValues>

type PublicControlKeys = keyof FormControl<ProfileValues>
type _NoStoreKey = '_store' extends PublicControlKeys ? true : false
type _NoHandlersKey = '_getHandlers' extends PublicControlKeys ? true : false
const _noStore: _NoStoreKey = false
const _noHandlers: _NoHandlersKey = false
void _noStore
void _noHandlers

// @ts-expect-error — store mutation is not on the public control
void control._store

// @ts-expect-error — handlers are not on the public control
void control._getHandlers

function useContextTypeChecks() {
  const fromContext = useFormContext<ProfileValues>()
  const city = useController<ProfileValues, 'address.city'>({
    name: 'address.city',
  })
  const cityValue: string = city.field.value
  city.field.onChange('Yerevan')

  // @ts-expect-error — unknown nested path
  useController<ProfileValues>({ name: 'address.missing' })

  const watched = useWatch<ProfileValues, 'email'>({ name: 'email' })
  const email: string = watched

  const fieldState = useFieldState<ProfileValues, 'email'>({ name: 'email' })
  const error: string | undefined = fieldState.error
  const details = fieldState.errorDetails
  void details

  const submitting = useFormState<ProfileValues, boolean>({
    selector: (state) => state.isSubmitting,
  })

  const avatar = useController<ProfileValues, 'avatar'>({ name: 'avatar' })
  const file: File | null = avatar.field.value
  const documents = useController<ProfileValues, 'documents'>({ name: 'documents' })
  const files: File[] = documents.field.value

  const providerProps: FormProviderProps<ProfileValues> = {
    control: form.control,
    children: null,
  }

  void fromContext
  void cityValue
  void email
  void error
  void details
  void submitting
  void file
  void files
  void providerProps
  void control
  void _createFormStore
  void _getInternals
}

function useExplicitStillWorks() {
  const formLocal = useForm<ProfileValues>({
    defaultValues: {
      email: '',
      address: { city: '' },
      avatar: null,
      documents: [],
    },
  })
  const city = useController({
    control: formLocal.control,
    name: 'address.city',
  })
  const value: string = city.field.value
  void value
}

type _Unused = _PublicFormStore<unknown>
void 0 as unknown as _Unused

void useContextTypeChecks
void useExplicitStillWorks

export {}
