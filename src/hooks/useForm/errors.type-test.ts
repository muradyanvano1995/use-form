/**
 * Compile-time type tests for structured errors and criteria mode.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  CriteriaMode,
  ErrorSource,
  rules,
  useController,
  useForm,
  type FieldError,
  type FieldErrorDetails,
  type FieldIssue,
  type SetErrorOptions,
  type UseFormOptions,
  type UseFormReturn,
  type ValidationIssueInput,
} from './index.ts'

type Values = {
  email: string
  password: string
  products: Array<{ name: string }>
}

const defaults: Values = {
  email: '',
  password: '',
  products: [],
}

function stringErrorConsumersCompile(form: UseFormReturn<Values>) {
  const primary: string | undefined = form.errors.email
  if (form.errors.email) {
    const rendered: string = form.errors.email
    void rendered
  }
  const root: string | undefined = form.rootError
  void primary
  void root
}

function structuredDetailAccessIsTyped(form: UseFormReturn<Values>) {
  const details: FieldErrorDetails<Values> = form.errorDetails
  const email: FieldError | undefined = details.email
  const issue: FieldIssue | undefined = email?.issues[0]
  const root: FieldError | undefined = form.rootErrorDetails
  const params: Readonly<Record<string, unknown>> | undefined = email?.params
  void details
  void email
  void issue
  void root
  void params

  // @ts-expect-error — params are readonly
  if (email?.params) email.params.min = 1
}

function criteriaModeAcceptsOnlyValidValues() {
  const ok: UseFormOptions<Values> = {
    defaultValues: defaults,
    criteriaMode: 'all',
  }
  const alsoOk: UseFormOptions<Values> = {
    defaultValues: defaults,
    criteriaMode: CriteriaMode.FirstError,
  }
  void ok
  void alsoOk

  const bad: UseFormOptions<Values> = {
    defaultValues: defaults,
    // @ts-expect-error — unknown criteria mode
    criteriaMode: 'everything',
  }
  void bad
}

function customStructuredRuleResultIsTyped() {
  const form = useForm<Values>({
    defaultValues: defaults,
    rules: {
      password: [
        rules.required(),
        (_value: string): ValidationIssueInput => {
          void _value
          return {
            message: 'Password needs a number',
            type: 'requiresNumber',
            params: { minDigits: 1 },
          }
        },
      ],
    },
  })
  void form
}

function errorSourceAcceptsOnlySupportedSources(form: UseFormReturn<Values>) {
  const options: SetErrorOptions = { source: 'server', type: 'unique' }
  form.setError('email', 'Email already exists', options)
  form.setError('email', 'Invalid email')
  form.setError('email', { message: 'Taken', type: 'unique' }, { source: 'manual' })
  form.setErrors({ email: 'Invalid email' })
  form.setErrors({ email: { message: 'Taken', type: 'unique' } }, { source: 'server' })

  // @ts-expect-error — ordinary callers cannot impersonate rule/resolver sources
  form.setError('email', 'x', { source: 'rule' })
}

function invalidFieldPathsFail(form: UseFormReturn<Values>) {
  const indexed: string | undefined = form.errors['products.0.name']
  const indexedDetails: FieldError | undefined = form.errorDetails['products.0.name']
  void indexed
  void indexedDetails

  // @ts-expect-error — unknown path
  form.setError('missing', 'nope')

  // @ts-expect-error — unknown detail path
  const _missing = form.errorDetails.missing
  void _missing
}

function controllerFieldDetailsAreTyped(form: UseFormReturn<Values>) {
  const { fieldState } = useController({ control: form.control, name: 'email' })
  const error: string | undefined = fieldState.error
  const details: FieldError | undefined = fieldState.errorDetails
  const invalid: boolean = fieldState.invalid
  void error
  void details
  void invalid
}

function existingGenericsDoNotRegress() {
  const form = useForm<Values, Values, { token: string }>({
    defaultValues: defaults,
    resolverContext: { token: 't' },
    criteriaMode: 'firstError',
  })
  const values: Values = form.values
  void values
  void form.control
}

type PublicExports = typeof import('./index.ts')
type _FieldErrorFromIssuesPublic = 'fieldErrorFromIssues' extends keyof PublicExports ? true : false
type _FreezeParamsPublic = 'freezeParams' extends keyof PublicExports ? true : false
type _MergeDetailsPublic = 'mergeFieldErrorDetails' extends keyof PublicExports ? true : false
type _StripPublic = 'stripValidationIssueAtPath' extends keyof PublicExports ? true : false
const _internalNormalizationNotPublic: _FieldErrorFromIssuesPublic = false
const _freezeNotPublic: _FreezeParamsPublic = false
const _mergeNotPublic: _MergeDetailsPublic = false
const _stripNotPublic: _StripPublic = false
void _internalNormalizationNotPublic
void _freezeNotPublic
void _mergeNotPublic
void _stripNotPublic

void stringErrorConsumersCompile
void structuredDetailAccessIsTyped
void criteriaModeAcceptsOnlyValidValues
void customStructuredRuleResultIsTyped
void errorSourceAcceptsOnlySupportedSources
void invalidFieldPathsFail
void controllerFieldDetailsAreTyped
void existingGenericsDoNotRegress
void ErrorSource.Manual

export {}
