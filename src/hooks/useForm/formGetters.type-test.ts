/**
 * Compile-time type tests for non-reactive getters.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  type DeepPartial,
  type FieldError,
  type FieldErrorDetails,
  type FieldErrors,
  type ImperativeFieldState,
  type UseFormReturn,
} from './index.ts'
// @ts-expect-error — FormDevTools is not a core export
import { FormDevTools as _FormDevTools } from './index.ts'
// @ts-expect-error — safeSerialize is not a core export
import { safeSerialize as _safeSerialize } from './index.ts'

type Profile = {
  profile: {
    email: string
    age: number
  }
  tags: string[]
  avatar: File | null
}

declare const form: UseFormReturn<Profile>

const values: Profile = form.getValues()
const email: string = form.getValue('profile.email')
const age: number = form.getValue('profile.age')
const tag: string = form.getValue('tags.0')
const avatar: File | null = form.getValue('avatar')
const errors: FieldErrors<Profile> = form.getErrors()
const details: FieldErrorDetails<Profile> = form.getErrorDetails()
const dirty: DeepPartial<Profile> = form.getDirtyValues()
const touched: DeepPartial<Profile> = form.getTouchedValues()
const field: ImperativeFieldState<Profile, 'profile.email'> = form.getFieldState('profile.email')
const fieldEmail: string = field.value
const fieldError: string | undefined = field.error
const fieldDetails: FieldError | undefined = field.errorDetails

void values
void email
void age
void tag
void avatar
void errors
void details
void dirty
void touched
void fieldEmail
void fieldError
void fieldDetails
void _FormDevTools
void _safeSerialize

// @ts-expect-error — invalid nested path
form.getValue('profile.missing')
// @ts-expect-error — invalid root path
form.getValue('nope')
// @ts-expect-error — invalid field-state path
form.getFieldState('profile.missing')

export {}
