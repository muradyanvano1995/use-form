import {
  ReValidateMode,
  rules,
  useForm,
  ValidationMode,
  type FieldErrors,
  type FieldRules,
} from '../hooks/useForm'
import './examples.css'

type LoginFormValues = {
  email: string
  password: string
  rememberMe: boolean
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

export function LoginForm() {
  const form = useForm<LoginFormValues>({
    id: 'login',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode: ValidationMode.OnBlur,
    reValidateMode: ReValidateMode.OnChange,
    rules: loginRules,
    onSubmit: async (values, helpers) => {
      try {
        await fakeLoginRequest(values)
        helpers.setSubmitError(undefined)
      } catch (error) {
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
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Sign in</h2>
        <p>Email, password, and remember-me with blur validation.</p>
      </header>

      {form.submitError ? (
        <p className="demo-form__banner" role="alert">
          {form.submitError}
        </p>
      ) : null}

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('email')}>Email</label>
        <input
          {...form.register('email')}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        {form.errors.email ? (
          <p id={form.getErrorId('email')} className="demo-form__error" role="alert">
            {form.errors.email}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('password')}>Password</label>
        <input {...form.register('password')} type="password" autoComplete="current-password" />
        {form.errors.password ? (
          <p id={form.getErrorId('password')} className="demo-form__error" role="alert">
            {form.errors.password}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field demo-form__field--inline">
        <input {...form.register('rememberMe')} type="checkbox" />
        <label htmlFor={form.getFieldId('rememberMe')}>Remember me</label>
      </div>

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => form.reset()}
          disabled={form.isSubmitting}
        >
          Reset
        </button>
      </div>

      <p className="demo-form__hint">
        Try <code>taken@example.com</code> to simulate a backend field error.
      </p>
    </form>
  )
}
