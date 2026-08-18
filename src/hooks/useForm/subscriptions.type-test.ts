/**
 * Compile-time type tests for subscription hooks.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  useFieldState,
  useForm,
  useFormState,
  useWatch,
  type FormControl,
  type UseFormReturn,
} from './index.ts'

type Values = {
  email: string
  profile: {
    age: number
  }
}

function useSubscriptionTypeChecks() {
  const form = useForm<Values>({
    defaultValues: {
      email: '',
      profile: { age: 0 },
    },
  })

  const control: FormControl<Values> = form.control
  const email: string = useWatch(form, 'email')
  const age: number = useWatch(control, 'profile.age')
  const all: Values = useWatch(form)
  const submitting: boolean = useFormState(form, (state) => state.isSubmitting)
  const fieldError: string | undefined = useFieldState(form, 'email').error
  const fieldDetails = useFieldState(form, 'email').errorDetails
  const invalid: boolean = useFieldState(form, 'email').invalid

  void control
  void email
  void age
  void all
  void submitting
  void fieldError
  void fieldDetails
  void invalid

  // @ts-expect-error — unknown path
  useWatch(form, 'missing')

  // @ts-expect-error — unknown path
  useFieldState(form, 'profile.missing')
}

type _HasControl = UseFormReturn<Values>['control']
type _ControlIsFormControl = _HasControl extends FormControl<Values> ? true : false
const _controlCheck: _ControlIsFormControl = true
void _controlCheck

void useSubscriptionTypeChecks

export {}
