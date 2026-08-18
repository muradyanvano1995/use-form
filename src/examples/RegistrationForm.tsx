import { useState } from 'react'
import {
  createRule,
  ReValidateMode,
  rules,
  useForm,
  ValidationMode,
  type FieldErrors,
  type FieldRules,
} from '../hooks/useForm'
import './examples.css'

type RegistrationFormValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
  age: number
  acceptTerms: boolean
}

const registrationDefaults: RegistrationFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  age: 18,
  acceptTerms: false,
}

/** Reusable custom rule: reject names containing a forbidden token. */
const notContainsAdmin = createRule<string, RegistrationFormValues>((value) =>
  value.toLowerCase().includes('admin') ? 'Name cannot contain “admin”' : undefined,
)

const registrationRules: FieldRules<RegistrationFormValues> = {
  name: [
    rules.required('Name is required'),
    rules.minLength(3, 'Use at least 3 characters'),
    notContainsAdmin,
  ],
  email: [rules.required('Email is required'), rules.email('Enter a valid email address')],
  password: [
    rules.required('Password is required'),
    rules.minLength(8, 'Use at least 8 characters'),
  ],
  confirmPassword: [
    rules.required('Confirm your password'),
    rules.matchesField('password', 'Passwords must match'),
  ],
  age: [rules.required('Age is required'), rules.min(18, 'You must be at least 18')],
  acceptTerms: [rules.accepted('You must accept the terms')],
}

function isEmailExistsError(
  error: unknown,
): error is Error & { fieldErrors?: FieldErrors<RegistrationFormValues> } {
  return error instanceof Error && error.message === 'EMAIL_EXISTS'
}

async function fakeRegisterRequest(values: RegistrationFormValues): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })

  if (values.email.toLowerCase() === 'exists@example.com') {
    const error = new Error('EMAIL_EXISTS') as Error & {
      fieldErrors?: FieldErrors<RegistrationFormValues>
    }
    error.fieldErrors = {
      email: 'An account with this email already exists.',
    }
    throw error
  }
}

export function RegistrationForm() {
  const [statusMessage, setStatusMessage] = useState<string | undefined>()

  const form = useForm<RegistrationFormValues>({
    id: 'register',
    defaultValues: registrationDefaults,
    mode: ValidationMode.OnSubmit,
    reValidateMode: ReValidateMode.OnChange,
    rules: registrationRules,
    onSubmit: async (values, helpers) => {
      setStatusMessage(undefined)
      try {
        await fakeRegisterRequest(values)
        helpers.reset(registrationDefaults)
        helpers.setSubmitError(undefined)
        setStatusMessage('Account created. The form was reset to defaults.')
      } catch (error) {
        if (isEmailExistsError(error)) {
          if (error.fieldErrors) {
            helpers.setErrors(error.fieldErrors)
          }
          helpers.setSubmitError('We could not create your account.')
          return
        }
        throw error
      }
    },
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Create account</h2>
        <p>Built-in rules, cross-field match, and a reusable custom name rule.</p>
      </header>

      {form.submitError ? (
        <p className="demo-form__banner" role="alert">
          {form.submitError}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="demo-form__success" role="status">
          {statusMessage}
        </p>
      ) : null}

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('name')}>Full name</label>
        <input {...form.register('name')} type="text" autoComplete="name" />
        {form.errors.name ? (
          <p id={form.getErrorId('name')} className="demo-form__error" role="alert">
            {form.errors.name}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('email')}>Email</label>
        <input {...form.register('email')} type="email" autoComplete="email" />
        {form.errors.email ? (
          <p id={form.getErrorId('email')} className="demo-form__error" role="alert">
            {form.errors.email}
          </p>
        ) : null}
      </div>

      <div className="demo-form__row">
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('password')}>Password</label>
          <input {...form.register('password')} type="password" autoComplete="new-password" />
          {form.errors.password ? (
            <p id={form.getErrorId('password')} className="demo-form__error" role="alert">
              {form.errors.password}
            </p>
          ) : null}
        </div>

        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('confirmPassword')}>Confirm password</label>
          <input
            {...form.register('confirmPassword')}
            type="password"
            autoComplete="new-password"
          />
          {form.errors.confirmPassword ? (
            <p id={form.getErrorId('confirmPassword')} className="demo-form__error" role="alert">
              {form.errors.confirmPassword}
            </p>
          ) : null}
        </div>
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('age')}>Age</label>
        <input {...form.register('age', { valueAsNumber: true })} type="number" min={0} />
        {form.errors.age ? (
          <p id={form.getErrorId('age')} className="demo-form__error" role="alert">
            {form.errors.age}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field demo-form__field--inline">
        <input {...form.register('acceptTerms')} type="checkbox" />
        <label htmlFor={form.getFieldId('acceptTerms')}>I accept the terms of service</label>
      </div>
      {form.errors.acceptTerms ? (
        <p id={form.getErrorId('acceptTerms')} className="demo-form__error" role="alert">
          {form.errors.acceptTerms}
        </p>
      ) : null}

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Creating…' : 'Create account'}
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => {
            setStatusMessage(undefined)
            form.reset()
          }}
          disabled={form.isSubmitting}
        >
          Reset
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => form.resetField('password')}
          disabled={form.isSubmitting}
        >
          Reset password
        </button>
      </div>

      <p className="demo-form__hint">
        Try <code>exists@example.com</code> to map a simulated API validation error.
      </p>
    </form>
  )
}
