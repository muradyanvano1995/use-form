/**
 * Compile-time type tests for the rules API.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  createRule,
  rules,
  ValidationMode,
  type FieldRules,
  type UseFormOptions,
  type ValidationRule,
} from '../index.ts'

type DemoForm = {
  name: string
  age: number
  acceptTerms: boolean
  password: string
  confirmPassword: string
}

const _modeLiteral: 'onSubmit' = ValidationMode.OnSubmit
void _modeLiteral

const defaults: DemoForm = {
  name: '',
  age: 18,
  acceptTerms: false,
  password: '',
  confirmPassword: '',
}

const _validRules: FieldRules<DemoForm> = {
  name: [rules.required(), rules.minLength(2)],
  age: [rules.min(18)],
  acceptTerms: rules.accepted(),
  confirmPassword: rules.matchesField('password'),
}

const _stringRule: ValidationRule<string, DemoForm> = rules.email()
const _numberRule: ValidationRule<number, DemoForm> = rules.min(1)
const _custom = createRule<string, DemoForm>((value, values) => {
  const _name: string = value
  const _age: number = values.age
  return _name && _age >= 0 ? undefined : 'bad'
})

const _validOptions: UseFormOptions<DemoForm> = {
  defaultValues: defaults,
  mode: ValidationMode.OnSubmit,
  reValidateMode: 'onChange',
  rules: {
    name: rules.required(),
    age: [rules.required(), rules.min(18)],
  },
}

const _stringMode: UseFormOptions<DemoForm> = {
  defaultValues: defaults,
  mode: 'onBlur',
}

const _invalidFieldName: UseFormOptions<DemoForm> = {
  defaultValues: defaults,
  rules: {
    // @ts-expect-error — unknown field name is not assignable
    missing: rules.required(),
  },
}

const _emailOnNumber: UseFormOptions<DemoForm> = {
  defaultValues: defaults,
  rules: {
    // @ts-expect-error — string email rule is not valid for a number field
    age: rules.email(),
  },
}

const _minOnString: UseFormOptions<DemoForm> = {
  defaultValues: defaults,
  rules: {
    // @ts-expect-error — numeric min is not valid for a string field
    name: rules.min(3),
  },
}

const _acceptedOnString: UseFormOptions<DemoForm> = {
  defaultValues: defaults,
  rules: {
    // @ts-expect-error — accepted expects a boolean field
    password: rules.accepted(),
  },
}

const _invalidMode: UseFormOptions<DemoForm> = {
  defaultValues: defaults,
  // @ts-expect-error — unsupported validation mode
  mode: 'onTouched',
}

const _asyncDebounced: FieldRules<DemoForm> = {
  name: [
    rules.required(),
    rules.minLength(3),
    rules.async(
      async (value, values, context) => {
        const _v: string = value
        const _age: number = values.age
        const _name: string = context.name
        const _reason = context.reason
        const _signal: AbortSignal | undefined = context.signal
        void _v
        void _age
        void _name
        void _reason
        void _signal
        return undefined
      },
      { debounce: 400, validateEmpty: false },
    ),
  ],
}

const _ordinaryAsyncStillOk: FieldRules<DemoForm> = {
  name: [async (value) => (value.length > 0 ? undefined : 'Required')],
}

const _twoArgCustomStillOk: FieldRules<DemoForm> = {
  name: [(value, values) => (value && values.age >= 0 ? undefined : 'bad')],
}

void _validRules
void _stringRule
void _numberRule
void _custom
void _validOptions
void _stringMode
void _invalidFieldName
void _emailOnNumber
void _minOnString
void _acceptedOnString
void _invalidMode
void _asyncDebounced
void _ordinaryAsyncStillOk
void _twoArgCustomStillOk

export {}
