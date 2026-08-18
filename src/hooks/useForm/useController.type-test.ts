/**
 * Compile-time type tests for useController.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  useController,
  type FormControl,
  type UseControllerReturn,
  type UseFormReturn,
} from './index.ts'
// @ts-expect-error — FormStore is internal and not re-exported from the public barrel
import type { FormStore as _PublicFormStore } from './index.ts'

type Values = {
  email: string
  price: number
  profile: {
    birthDate: Date | null
    avatar: File | null
  }
  documents: File[]
}

declare const form: UseFormReturn<Values>
declare const control: FormControl<Values>

function useControllerTypeChecks() {
  const birth = useController({
    control: form.control,
    name: 'profile.birthDate',
  })
  const birthValue: Date | null = birth.field.value
  const birthError: string | undefined = birth.fieldState.error
  const birthDetails = birth.fieldState.errorDetails
  birth.field.onChange(new Date())
  birth.field.onChange(null)

  // @ts-expect-error — string is not Date | null
  birth.field.onChange('2026-08-16')

  // @ts-expect-error — unknown path
  useController({ control, name: 'profile.missing' })

  const avatar = useController({ control, name: 'profile.avatar' })
  const avatarValue: File | null = avatar.field.value
  avatar.field.onChange(null)

  const documents = useController({ control, name: 'documents' })
  const docs: File[] = documents.field.value
  documents.field.onChange([])

  const price = useController<Values, 'price', string>({
    control,
    name: 'price',
    parse: (display: string) => Number(display),
    format: (stored: number) => String(stored),
  })
  const priceDisplay: string = price.field.value
  price.field.onChange('12.5')

  // @ts-expect-error — number is not the display type
  price.field.onChange(12.5)

  useController<Values, 'price', string>({
    control,
    name: 'price',
    // @ts-expect-error — parse must return stored number
    parse: (display: string) => display,
    format: (stored: number) => String(stored),
  })

  useController<Values, 'price', string>({
    control,
    name: 'price',
    parse: (display: string) => Number(display),
    // @ts-expect-error — format must return display string
    format: (stored: number) => stored,
  })

  void birthValue
  void birthError
  void birthDetails
  void avatarValue
  void docs
  void priceDisplay
}

type _Return = UseControllerReturn<Values, 'email'>
type _Value = _Return['field']['value']
const _emailValue: _Value = 'x'
void _emailValue

type PublicExports = typeof import('./index.ts')
type _CreateFormStorePublic = 'createFormStore' extends keyof PublicExports ? true : false
const _createFormStoreNotPublic: _CreateFormStorePublic = false
void _createFormStoreNotPublic

type _UnusedStore = _PublicFormStore<unknown>
void 0 as unknown as _UnusedStore

void useControllerTypeChecks

export {}
