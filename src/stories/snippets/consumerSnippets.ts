/** Copyable consumer snippets for Storybook. Imports use the public package placeholder. */

export const snippets = {
  basicUseForm: `import { rules, useForm, ValidationMode } from '<package-name>'

type LoginValues = {
  email: string
  password: string
}

export function Login() {
  const form = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
    mode: ValidationMode.OnSubmit,
    rules: {
      email: [rules.required(), rules.email()],
      password: [rules.required(), rules.minLength(8)],
    },
    onSubmit: (values) => {
      void values
    },
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <input {...form.register('email')} type="email" autoComplete="email" />
      <input {...form.register('password')} type="password" autoComplete="current-password" />
      <button type="submit">Sign in</button>
    </form>
  )
}`,

  registration: `import { rules, useForm, ValidationMode } from '<package-name>'

type LoginValues = {
  email: string
  password: string
}

export function Login() {
  const form = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
    mode: ValidationMode.OnSubmit,
    rules: {
      email: [rules.required('Email is required'), rules.email('Enter a valid email address')],
      password: [rules.required(), rules.minLength(8)],
    },
    onSubmit: (values) => {
      void values
    },
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <label htmlFor={form.getFieldId('email')}>Email</label>
      <input {...form.register('email')} type="email" autoComplete="email" />
      {form.errors.email ? (
        <p id={form.getErrorId('email')}>{form.errors.email}</p>
      ) : null}
      <button type="submit">Sign in</button>
    </form>
  )
}`,

  validationModes: `import { ReValidateMode, rules, useForm, ValidationMode } from '<package-name>'

const form = useForm({
  defaultValues: { email: '', password: '' },
  mode: ValidationMode.OnBlur,
  reValidateMode: ReValidateMode.OnChange,
  focusOnError: true,
  rules: {
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(6)],
  },
  onSubmit: (values) => {
    void values
  },
})

// OnSubmit waits until submit. OnBlur validates when leaving a field.
// OnChange validates while typing. reValidateMode applies after the first submit.`,

  builtInRules: `import { rules, useForm } from '<package-name>'

const form = useForm({
  defaultValues: {
    email: '',
    password: '',
    confirmPassword: '',
    age: 18,
    acceptTerms: false,
  },
  rules: {
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(8)],
    confirmPassword: [rules.required(), rules.matchesField('password')],
    age: [rules.min(18)],
    acceptTerms: [rules.accepted()],
  },
  onSubmit: (values) => {
    void values
  },
})`,

  customRules: `import { createRule, rules, useForm } from '<package-name>'

type AccountValues = {
  name: string
}

const notContainsAdmin = createRule<string, AccountValues>((value) =>
  value.toLowerCase().includes('admin') ? 'Name cannot contain “admin”' : undefined,
)

const form = useForm<AccountValues>({
  defaultValues: { name: '' },
  rules: {
    name: [rules.required(), rules.minLength(3), notContainsAdmin],
  },
  onSubmit: (values) => {
    void values
  },
})`,

  formLevel: `import { rules, useForm } from '<package-name>'

type OrderValues = {
  products: Array<{ name: string; quantity: number }>
}

const form = useForm<OrderValues>({
  defaultValues: { products: [{ name: '', quantity: 1 }] },
  rules: {
    products: [rules.minItems(1, 'Add at least one item')],
  },
  validate: (values) => {
    const errors: Partial<Record<'products.0.name' | 'products.0.quantity', string>> = {}
    if (!values.products[0]?.name) {
      errors['products.0.name'] = 'Name is required'
    }
    if ((values.products[0]?.quantity ?? 0) < 1) {
      errors['products.0.quantity'] = 'Quantity must be at least 1'
    }
    return errors
  },
  onSubmit: (values) => {
    void values
  },
})`,

  structuredErrors: `import { rules, useForm } from '<package-name>'

const form = useForm({
  defaultValues: { password: '' },
  criteriaMode: 'all',
  rules: {
    password: [rules.required(), rules.minLength(8), rules.pattern(/[A-Z]/)],
  },
  onSubmit: (values, helpers) => {
    helpers.setError('password', 'Choose a stronger password', {
      source: 'server',
      type: 'policy',
    })
  },
})

const issues = form.errorDetails.password?.issues ?? []
// form.errors.password is the first issue message.
// form.errorDetails.password.issues lists every issue when criteriaMode is 'all'.`,

  internationalization: `import { rules, useForm, type FieldLabels, type ValidationMessageCatalog } from '<package-name>'
import { useEffect, useRef, useState } from 'react'

type Values = { name: string }
type Locale = 'en' | 'hy'

const labels: Record<Locale, FieldLabels<Values>> = {
  en: { name: 'Full name' },
  hy: { name: 'Անուն' },
}

const messages: Record<Locale, ValidationMessageCatalog<Values>> = {
  en: { required: ({ label }) => \`\${label} is required\` },
  hy: { required: ({ label }) => \`\${label} դաշտը պարտադիր է\` },
}

export function LocalizedName({ locale }: { locale: Locale }) {
  const skipFirst = useRef(true)
  const form = useForm<Values>({
    defaultValues: { name: '' },
    fieldLabels: labels[locale],
    validationMessages: messages[locale],
    rules: { name: [rules.required()] },
    onSubmit: () => undefined,
  })

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    const hasErrors = Object.values(form.errors).some(Boolean)
    if (hasErrors) {
      void form.validate()
    }
    // Catalogs commit on this render. Do not list form.errors as a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <label htmlFor={form.getFieldId('name')}>{labels[locale].name}</label>
      <input {...form.register('name')} />
      {form.errors.name ? <p>{form.errors.name}</p> : null}
      <button type="submit">Submit</button>
    </form>
  )
}`,

  asyncValidation: `import { rules, useForm, ValidationMode } from '<package-name>'

async function checkUsername(username: string, signal?: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 120)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      const error = new Error('Aborted')
      error.name = 'AbortError'
      reject(error)
    }, { once: true })
  })
  return username === 'admin' ? 'Username is already taken' : undefined
}

const form = useForm({
  defaultValues: { username: '' },
  mode: ValidationMode.OnChange,
  rules: {
    username: [
      rules.required(),
      rules.minLength(3),
      rules.async(
        async (username, _values, { signal }) => checkUsername(username, signal),
        { debounce: 400, validateEmpty: false },
      ),
    ],
  },
  onSubmit: () => undefined,
})`,

  createAsyncRule: `import { createAsyncRule, rules, useForm, ValidationMode } from '<package-name>'

async function checkUsername(username: string, signal?: AbortSignal) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 120)
  })
  return username === 'taken' ? 'Username is already taken' : undefined
}

const remote = createAsyncRule(
  async (username, _values, { signal }) => checkUsername(username, signal),
  { debounce: 400, validateEmpty: false },
)

const form = useForm({
  defaultValues: { username: '' },
  mode: ValidationMode.OnChange,
  rules: {
    username: [rules.required(), rules.minLength(3), remote],
  },
  onSubmit: () => undefined,
})

// createAsyncRule is the same scheduler as rules.async; prefer rules.async in apps.`,

  asyncDefaults: `import { rules, useForm, ValidationMode } from '<package-name>'

const fallback = { name: '', email: '' }

const form = useForm({
  defaultValues: fallback,
  mode: ValidationMode.OnBlur,
  defaultValuesLoadMode: 'preserveDirty',
  loadDefaultValues: async ({ signal }) => {
    const profile = await fetch('/profile', { signal }).then((response) => response.json())
    return profile as { name: string; email: string }
  },
  rules: {
    name: [rules.required()],
    email: [rules.required(), rules.email()],
  },
  onSubmit: (values) => {
    void values
  },
})

// form.isLoadingDefaults / form.isDefaultsReady / form.defaultValuesError
// form.reloadDefaultValues() retries after a failed load.`,

  dependencies: `import { rules, useForm, type FieldDependencies } from '<package-name>'

type Values = {
  password: string
  confirmPassword: string
}

const dependencies: FieldDependencies<Values> = {
  confirmPassword: ['password'],
}

const form = useForm<Values>({
  defaultValues: { password: '', confirmPassword: '' },
  dependencies,
  rules: {
    confirmPassword: [rules.required(), rules.matchesField('password', 'Passwords must match')],
  },
  onSubmit: () => undefined,
})`,

  schemaResolver: `import { useForm, ValidationMode } from '<package-name>'
import {
  standardSchemaResolver,
  type StandardSchemaV1,
} from '<package-name>/resolvers/standard-schema'

type Input = { username: string; age: string }
type Output = { username: string; age: number }

const schema: StandardSchemaV1<Input, Output> = {
  '~standard': {
    version: 1,
    vendor: 'example',
    validate: (value) => {
      const input = value as Input
      const age = Number(input.age)
      if (!input.username.trim() || !Number.isFinite(age) || age < 18) {
        return { issues: [{ message: 'Invalid account', path: ['username'] }] }
      }
      return { value: { username: input.username.trim(), age } }
    },
  },
}

const form = useForm<Input, Output>({
  defaultValues: { username: '', age: '' },
  mode: ValidationMode.OnSubmit,
  resolver: standardSchemaResolver(schema),
  onSubmit: (values) => {
    void values.age
  },
})`,

  nestedFields: `import { rules, useForm } from '<package-name>'

type ProfileValues = {
  personal: { firstName: string }
  address: { city: string }
}

function NestedProfile() {
  const form = useForm<ProfileValues>({
    defaultValues: {
      personal: { firstName: '' },
      address: { city: '' },
    },
    rules: {
      'personal.firstName': [rules.required()],
      'address.city': [rules.required()],
    },
    onSubmit: (values) => {
      void values.address.city
    },
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <input {...form.register('personal.firstName')} />
      <input {...form.register('address.city')} />
      <button type="submit">Save</button>
    </form>
  )
}`,

  controlledFields: `import { useController, useForm } from '<package-name>'

function PriceField({
  control,
}: {
  control: ReturnType<typeof useForm<{ price: number }>>['control']
}) {
  const { field, fieldState } = useController({ control, name: 'price' })

  return (
    <input
      id={field.id}
      value={Number.isFinite(field.value) ? String(field.value) : ''}
      aria-invalid={fieldState.invalid || undefined}
      aria-describedby={fieldState.error ? field.errorId : undefined}
      onBlur={field.onBlur}
      onChange={(event) => field.onChange(Number(event.target.value))}
      ref={field.ref}
    />
  )
}

function PriceForm() {
  const form = useForm({
    defaultValues: { price: 0 },
    onSubmit: (values) => {
      void values.price
    },
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <PriceField control={form.control} />
      <button type="submit">Save</button>
    </form>
  )
}`,

  conditionalFields: `import { rules, useForm, useWatch, ValidationMode } from '<package-name>'

type Values = {
  accountType: 'personal' | 'company'
  company?: { name: string }
}

const form = useForm<Values>({
  defaultValues: { accountType: 'personal' },
  shouldUnregister: true,
  mode: ValidationMode.OnBlur,
  rules: {
    'company.name': [rules.required('Company name is required')],
  },
  onSubmit: (values) => {
    void values
  },
})

const accountType = useWatch(form, 'accountType')`,

  fieldArrays: `import { rules, useFieldArray, useForm } from '<package-name>'

type OrderValues = {
  products: Array<{ name: string; quantity: number }>
}

function Order() {
  const form = useForm<OrderValues>({
    defaultValues: { products: [{ name: '', quantity: 1 }] },
    rules: {
      products: [rules.minItems(1)],
    },
    onSubmit: (values) => {
      void values.products
    },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products',
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      {fields.map((field, index) => (
        <div key={field.key}>
          <input {...form.register(\`products.\${index}.name\`)} />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: '', quantity: 1 })}>
        Add
      </button>
    </form>
  )
}`,

  fileInputs: `import { rules, useForm } from '<package-name>'

type UploadValues = {
  avatar: File | null
  documents: File[]
}

function Upload() {
  const form = useForm<UploadValues>({
    defaultValues: { avatar: null, documents: [] },
    rules: {
      avatar: [rules.required(), rules.fileType(['image/jpeg', 'image/png']), rules.fileSize(2 * 1024 * 1024)],
      documents: [rules.minItems(1), rules.maxItems(3)],
    },
    onSubmit: (values) => {
      void values.avatar?.name
      void values.documents.length
    },
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <input {...form.register('avatar', { type: 'file' })} />
      <input {...form.register('documents', { type: 'file', multiple: true })} />
      <button type="submit">Upload</button>
    </form>
  )
}`,

  context: `import { FormProvider, useController, useForm, useFormState } from '<package-name>'

type ProfileValues = { displayName: string }

function DisplayNameField() {
  const { field, fieldState } = useController<ProfileValues, 'displayName'>({
    name: 'displayName',
  })

  return (
    <>
      <label htmlFor={field.id}>Display name</label>
      <input
        id={field.id}
        value={field.value}
        onBlur={field.onBlur}
        onChange={(event) => field.onChange(event.target.value)}
        ref={field.ref}
        aria-invalid={field['aria-invalid']}
        aria-describedby={field['aria-describedby']}
      />
      {fieldState.error ? <p id={field.errorId}>{fieldState.error}</p> : null}
    </>
  )
}

function SubmitButton() {
  const isSubmitting = useFormState<ProfileValues, boolean>({
    selector: (state) => state.isSubmitting,
  })
  return (
    <button type="submit" disabled={isSubmitting}>
      Save
    </button>
  )
}

function Profile() {
  const form = useForm<ProfileValues>({
    defaultValues: { displayName: '' },
    onSubmit: (values) => {
      void values
    },
  })

  return (
    <FormProvider control={form.control}>
      <form onSubmit={form.handleSubmit} noValidate>
        <DisplayNameField />
        <SubmitButton />
      </form>
    </FormProvider>
  )
}`,

  watchers: `import { FormProvider, useForm, useFormState, useWatch } from '<package-name>'

type WatchValues = { title: string }

function TitlePreview() {
  const title = useWatch<WatchValues, 'title'>({ name: 'title' })
  return <p>{title || '—'}</p>
}

function DirtyFlag() {
  const isDirty = useFormState<WatchValues, boolean>({
    selector: (state) => state.isDirty,
  })
  return <p>{isDirty ? 'dirty' : 'clean'}</p>
}

function Editor() {
  const form = useForm<WatchValues>({
    defaultValues: { title: '' },
    onSubmit: () => undefined,
  })

  return (
    <FormProvider control={form.control}>
      <form onSubmit={form.handleSubmit} noValidate>
        <input {...form.register('title')} />
        <TitlePreview />
        <DirtyFlag />
      </form>
    </FormProvider>
  )
}`,

  batching: `import { useForm } from '<package-name>'

const form = useForm({
  defaultValues: {
    address: { city: '', country: '' },
  },
})

await form.batch(() => {
  form.setValue('address.city', 'Yerevan')
  form.setValue('address.country', 'Armenia')
})
// One store notification and one coordinated validation pass.
// The callback must be synchronous.`,

  getters: `import { useForm } from '<package-name>'

const form = useForm({
  defaultValues: {
    address: { city: '', country: '' },
  },
})

form.setValue('address.city', 'Yerevan')

const values = form.getValues()
const city = form.getValue('address.city')
const dirty = form.getDirtyValues()
const field = form.getFieldState('address.city')
// Getters do not subscribe. Reading them during render will not re-render on change.`,

  devtools: `import { FormProvider, useForm } from '<package-name>'
import { FormDevTools } from '<package-name>/devtools'

function Inspector() {
  const form = useForm({
    defaultValues: {
      profile: { displayName: '', password: '' },
    },
    onSubmit: () => undefined,
  })

  return (
    <FormProvider control={form.control}>
      <form onSubmit={form.handleSubmit} noValidate>
        <input {...form.register('profile.displayName')} />
        <input {...form.register('profile.password')} type="password" />
        <FormDevTools
          position="inline"
          initiallyOpen
          redact={['profile.password']}
        />
      </form>
    </FormProvider>
  )
}`,

  backendErrors: `import { rules, useForm, ValidationMode, type FieldErrors } from '<package-name>'

type LoginValues = { email: string; password: string }

async function loginRequest(values: LoginValues): Promise<void> {
  if (values.email === 'taken@example.com') {
    const error = new Error('EMAIL_TAKEN') as Error & { fieldErrors?: FieldErrors<LoginValues> }
    error.fieldErrors = { email: 'This email is already registered.' }
    throw error
  }
}

const form = useForm<LoginValues>({
  defaultValues: { email: '', password: '' },
  mode: ValidationMode.OnBlur,
  rules: {
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(6)],
  },
  onSubmit: async (values, helpers) => {
    try {
      await loginRequest(values)
    } catch (error) {
      const fieldErrors =
        error instanceof Error ? (error as { fieldErrors?: FieldErrors<LoginValues> }).fieldErrors : undefined
      if (fieldErrors) {
        helpers.setErrors(fieldErrors, { source: 'server' })
        helpers.setSubmitError('Could not sign in. Check the highlighted fields.')
      }
    }
  },
})`,

  radioCheckbox: `import { rules, useForm } from '<package-name>'

type Preferences = {
  plan: 'free' | 'pro'
  newsletter: boolean
}

function PreferencesForm() {
  const form = useForm<Preferences>({
    defaultValues: { plan: 'free', newsletter: false },
    rules: {
      plan: [rules.required()],
    },
    onSubmit: (values) => {
      void values
    },
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <fieldset>
        <legend>Plan</legend>
        <label>
          <input {...form.register('plan', { type: 'radio', value: 'free' })} />
          Free
        </label>
        <label>
          <input {...form.register('plan', { type: 'radio', value: 'pro' })} />
          Pro
        </label>
      </fieldset>
      <label>
        <input {...form.register('newsletter')} type="checkbox" />
        Newsletter
      </label>
    </form>
  )
}`,

  submission: `import { rules, useForm, ValidationMode } from '<package-name>'

const form = useForm({
  defaultValues: { email: '', password: '' },
  mode: ValidationMode.OnSubmit,
  focusOnError: true,
  preventDuplicateSubmit: true,
  rules: {
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(8)],
  },
  onSubmit: async (values) => {
    await save(values)
  },
})

async function save(values: { email: string; password: string }) {
  void values
}`,

  reset: `import { rules, useForm } from '<package-name>'

const form = useForm({
  defaultValues: { name: '', password: '' },
  rules: {
    name: [rules.required()],
    password: [rules.required(), rules.minLength(8)],
  },
  onSubmit: () => {
    form.reset()
  },
})

form.resetField('password')
form.reset({ name: 'Ada', password: '' })`,

  fieldState: `import { FormProvider, rules, useFieldState, useForm, ValidationMode } from '<package-name>'

type Values = { email: string }

function EmailMeta() {
  const field = useFieldState<Values, 'email'>({ name: 'email' })
  return (
    <p>
      invalid={String(field.invalid)} touched={String(field.touched)} dirty={String(field.dirty)}
    </p>
  )
}

function EmailForm() {
  const form = useForm<Values>({
    defaultValues: { email: '' },
    mode: ValidationMode.OnBlur,
    rules: {
      email: [rules.required(), rules.email()],
    },
    onSubmit: () => undefined,
  })

  return (
    <FormProvider control={form.control}>
      <form onSubmit={form.handleSubmit} noValidate>
        <input {...form.register('email')} type="email" />
        <EmailMeta />
      </form>
    </FormProvider>
  )
}`,

  imperativeMutations: `import { ErrorSource, rules, useForm, ValidationMode } from '<package-name>'

const form = useForm({
  defaultValues: { email: '', note: '' },
  mode: ValidationMode.OnSubmit,
  rules: {
    email: [rules.required(), rules.email()],
  },
  onSubmit: () => undefined,
})

await form.validateField('email')
form.setError('email', 'Manual review required', { source: ErrorSource.Manual })
form.clearError('email')
form.clearRootError()
form.clearErrors()
await form.validate()
// No public setFocus — focusOnError uses registered refs on submit.`,

  normalizeErrors: `import { normalizeErrors } from '<package-name>'

const cleaned = normalizeErrors({
  email: 'Email is required',
  password: '',
  'profile.city': 'City is required',
})

// Empty messages and unsafe keys are dropped before merge.
void cleaned.email
void cleaned.password`,

  formState: `import { useForm } from '<package-name>'

const form = useForm({
  defaultValues: { title: '' },
  onSubmit: () => undefined,
})

void form.values
void form.errors
void form.touched
void form.dirtyFields
void form.isDirty
void form.isValid
void form.isSubmitting
void form.isValidating
void form.isSubmitted
void form.submitCount
// The useForm caller re-renders on these fields. Isolate children with
// useWatch / useFormState / useFieldState.`,
} as const
