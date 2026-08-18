/**
 * Compile-time type tests for validation message catalogs and field labels.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  rules,
  useForm,
  type BuiltInRuleParams,
  type BuiltInRuleType,
  type FieldLabels,
  type ValidationMessageCatalog,
  type ValidationMessageContext,
} from '../index.ts'

type Values = {
  email: string
  password: string
  address: { city: string }
  products: Array<{ name: string }>
}

const defaults: Values = {
  email: '',
  password: '',
  address: { city: '' },
  products: [{ name: '' }],
}

function catalogKeysAcceptBuiltInTypes() {
  const catalog: ValidationMessageCatalog<Values> = {
    required: 'This field is required',
    email: ({ label }) => `${label} must be a valid email`,
    minLength: ({ params }) => {
      const min: number = params.min
      return `Use at least ${min} characters`
    },
    fileSize: ({ params }) => {
      const maxBytes: number = params.maxBytes
      return `Max ${maxBytes}`
    },
    matchesField: ({ params }) => {
      const field: string = params.field
      return `Must match ${field}`
    },
  }
  void catalog
}

function invalidCatalogKeysFail() {
  const catalog: ValidationMessageCatalog<Values> = {
    required: 'Required',
    // @ts-expect-error — unknown catalog key
    notARule: 'nope',
  }
  void catalog
}

function paramsAreReadonly() {
  const catalog: ValidationMessageCatalog<Values> = {
    minLength: ({ params }) => {
      // @ts-expect-error — params are readonly
      params.min = 1
      return 'x'
    },
  }
  void catalog
}

function labelsAcceptValidPaths() {
  const labels: FieldLabels<Values> = {
    email: 'Email address',
    'address.city': 'City',
    'products.0.name': 'Product name',
  }
  void labels
}

function invalidLabelPathsFail() {
  const labels: FieldLabels<Values> = {
    email: 'Email',
    // @ts-expect-error — unknown field path
    missing: 'Nope',
  }
  void labels
}

function perRuleFactoryReceivesContext() {
  const rule = rules.minLength(8, ({ label, params, type, name }) => {
    const min: number = params.min
    const typedType: string = type
    const typedName: string = name
    const typedLabel: string = label
    void typedType
    void typedName
    void typedLabel
    return `${label}: minimum ${min}`
  })
  const existingString = rules.required('Email is required')
  const existingMin = rules.minLength(8, 'Use at least 8 characters')
  void rule
  void existingString
  void existingMin
}

function existingApisStillCompile() {
  const custom = (value: string) => (value === 'admin' ? 'Reserved username' : undefined)
  const structured = (value: string) =>
    value === 'admin'
      ? { type: 'reservedUsername', message: 'Reserved username', params: {} }
      : undefined

  const form = useForm<Values, Values, { token: string }>({
    defaultValues: defaults,
    resolverContext: { token: 't' },
    validationMessages: {
      required: ({ label }) => `${label} is required`,
    },
    fieldLabels: {
      email: 'Email address',
    },
    rules: {
      email: [rules.required(), rules.email()],
      password: [rules.required(), rules.minLength(8), custom, structured],
    },
    validate: (values) => ({
      password: values.password === values.email ? 'Too similar' : undefined,
    }),
  })

  form.setError('email', 'Server says no', { source: 'server', type: 'unique' })
  form.setErrors({ email: 'Manual' })
  void form.errors.email
  void form.errorDetails.email?.issues
}

function builtInRuleTypeIsClosed() {
  const type: BuiltInRuleType = 'required'
  const params: BuiltInRuleParams['fileSize'] = { maxBytes: 10 }
  const context: ValidationMessageContext<Values, 'email', BuiltInRuleParams['email']> = {
    type: 'email',
    name: 'email',
    label: 'Email',
    params: {},
  }
  void type
  void params
  void context
}

type PublicExports = typeof import('../index.ts')
type _ResolvePublic = 'resolveFailureMessage' extends keyof PublicExports ? true : false
type _CapturePublic = 'captureMessageSnapshot' extends keyof PublicExports ? true : false
type _FlattenPublic = 'flattenValidationResult' extends keyof PublicExports ? true : false
type _SnapshotSymbolPublic = 'MESSAGE_SNAPSHOT' extends keyof PublicExports ? true : false
type _RuleMetaPublic = 'annotateRule' extends keyof PublicExports ? true : false
const _resolveNotPublic: _ResolvePublic = false
const _captureNotPublic: _CapturePublic = false
const _flattenNotPublic: _FlattenPublic = false
const _symbolNotPublic: _SnapshotSymbolPublic = false
const _metaNotPublic: _RuleMetaPublic = false

void catalogKeysAcceptBuiltInTypes
void invalidCatalogKeysFail
void paramsAreReadonly
void labelsAcceptValidPaths
void invalidLabelPathsFail
void perRuleFactoryReceivesContext
void existingApisStillCompile
void builtInRuleTypeIsClosed
void _resolveNotPublic
void _captureNotPublic
void _flattenNotPublic
void _symbolNotPublic
void _metaNotPublic

export {}
