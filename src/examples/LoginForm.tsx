import { useState } from 'react'
import {
  ReValidateMode,
  rules,
  useForm,
  ValidationMode,
  type FieldErrors,
  type FieldRules,
} from '../hooks/useForm'
import type { DemoFormProps, DemoSubmitHandlers } from './demoFormTypes.ts'
import './examples.css'

type LoginFormValues = {
  email: string
  password: string
  rememberMe: boolean
}

export type LoginFormProps = DemoFormProps &
  DemoSubmitHandlers<{ email: string; rememberMe: boolean; password: '[redacted]' }> & {
    mode?: ValidationMode
    reValidateMode?: ReValidateMode
    focusOnError?: boolean
    preventDuplicateSubmit?: boolean
  }

const loginRules: FieldRules<LoginFormValues> = {
  email: [rules.required('Email is required'), rules.email('Enter a valid email address')],
  password: [
    rules.required('Password is required'),
    rules.minLength(6, 'Password must be at least 6 characters'),
  ],
}

function isEmailTakenError(
  error: unknown,
): error is Error & { fieldErrors?: FieldErrors<LoginFormValues> } {
  return error instanceof Error && error.message === 'EMAIL_TAKEN'
}

async function fakeLoginRequest(values: LoginFormValues): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 450)
  })

  if (values.email.toLowerCase() === 'taken@example.com') {
    const error = new Error('EMAIL_TAKEN') as Error & {
      fieldErrors?: FieldErrors<LoginFormValues>
    }
    error.fieldErrors = {
      email: 'This email is already registered.',
    }
    throw error
  }
}

export function LoginForm({
  disabled = false,
  mode = ValidationMode.OnBlur,
  reValidateMode = ReValidateMode.OnChange,
  focusOnError = true,
  preventDuplicateSubmit = true,
  onSubmitSuccess,
  onSubmitInvalid,
  onReset,
}: LoginFormProps) {
  const [statusMessage, setStatusMessage] = useState<string | undefined>()

  const form = useForm<LoginFormValues>({
    id: 'login',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode,
    reValidateMode,
    focusOnError,
    preventDuplicateSubmit,
    rules: loginRules,
    onSubmit: async (values, helpers) => {
      try {
        await fakeLoginRequest(values)
        helpers.setSubmitError(undefined)
        setStatusMessage('Signed in. Password values are never sent to Actions.')
        onSubmitSuccess?.({
          email: values.email,
          rememberMe: values.rememberMe,
          password: '[redacted]',
        })
      } catch (error) {
        setStatusMessage(undefined)
        if (isEmailTakenError(error)) {
          if (error.fieldErrors) {
            helpers.setErrors(error.fieldErrors)
          }
          helpers.setSubmitError('Sign-in failed. Check the highlighted fields.')
          return
        }
        throw error
      }
    },
  })

  return (
    <form
      className="demo-form"
      onSubmit={(event) => {
        setStatusMessage(undefined)
        void form.handleSubmit(event).then(() => {
          const fieldCount = Object.keys(form.getErrors()).length
          if (fieldCount > 0) onSubmitInvalid?.({ fieldCount })
        })
      }}
      noValidate
    >
      <div className="demo-form__header">
        <h2>Sign in</h2>
        <p>Email, password, and remember-me. Validation mode defaults to blur.</p>
      </div>

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

      <fieldset disabled={disabled}>
        <legend>Credentials</legend>
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('email')}>Email</label>
          <input
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          {form.errors.email ? (
            <p id={form.getErrorId('email')} className="demo-form__error">
              {form.errors.email}
            </p>
          ) : null}
        </div>

        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('password')}>Password</label>
          <input {...form.register('password')} type="password" autoComplete="current-password" />
          {form.errors.password ? (
            <p id={form.getErrorId('password')} className="demo-form__error">
              {form.errors.password}
            </p>
          ) : null}
        </div>

        <div className="demo-form__field demo-form__field--inline">
          <input {...form.register('rememberMe')} type="checkbox" />
          <label htmlFor={form.getFieldId('rememberMe')}>Remember me</label>
        </div>
      </fieldset>

      <div className="demo-form__actions">
        <button type="submit" disabled={disabled || form.isSubmitting}>
          {form.isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => {
            setStatusMessage(undefined)
            form.reset()
            onReset?.()
          }}
          disabled={disabled || form.isSubmitting}
        >
          Reset
        </button>
      </div>

      <p className="demo-form__hint">
        Try <code>taken@example.com</code> with any 6+ character password to simulate a backend
        field error (450ms).
      </p>
    </form>
  )
}
