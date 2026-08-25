import {
  FormProvider,
  rules,
  useForm,
  ValidationMode,
  type FieldErrors,
  type FormResolver,
} from '../hooks/useForm'
import './examples.css'

type RegistrationInput = {
  email: string
  age: string
  profile: {
    city: string
  }
  tags: string[]
}

type RegistrationOutput = {
  email: string
  age: number
  profile: {
    city: string
  }
  tags: string[]
}

type RegistrationContext = {
  minimumAge: number
}

const registrationResolver: FormResolver<
  RegistrationInput,
  RegistrationOutput,
  RegistrationContext
> = (values, { context }) => {
  const errors: FieldErrors<RegistrationInput> = {}
  const age = Number(values.age)

  if (!values.email.includes('@')) {
    errors.email = 'Enter a valid email'
  }

  if (!Number.isFinite(age) || age < context.minimumAge) {
    errors.age = `You must be at least ${context.minimumAge}`
  }

  if (!values.profile.city.trim()) {
    errors['profile.city'] = 'City is required'
  }

  if (values.tags.length === 0) {
    errors.tags = 'Add at least one tag'
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    values: {
      email: values.email.trim().toLowerCase(),
      age,
      profile: { city: values.profile.city.trim() },
      tags: [...values.tags],
    },
  }
}

export function ResolverRegistrationForm() {
  const form = useForm<RegistrationInput, RegistrationOutput, RegistrationContext>({
    defaultValues: {
      email: '',
      age: '',
      profile: { city: '' },
      tags: [],
    },
    resolver: registrationResolver,
    resolverContext: { minimumAge: 18 },
    rules: {
      email: [rules.required('Email is required')],
    },
    mode: ValidationMode.OnSubmit,
    onSubmit: (values, helpers) => {
      // `values.age` is number — transformed output only.
      if (values.email.endsWith('@blocked.test')) {
        helpers.setError('email', 'This email is blocked by the server')
      }
    },
  })

  return (
    <section className="demo-form">
      <h2>Resolver registration</h2>
      <p className="demo-form__meta">
        Input keeps <code>age</code> as a string; submit receives a number after resolver success.
      </p>
      <FormProvider control={form.control}>
        <form onSubmit={form.handleSubmit} noValidate>
          <div className="demo-form__field">
            <label htmlFor={form.getFieldId('email')}>Email</label>
            <input {...form.register('email', { required: true })} />
            {form.errors.email ? (
              <p id={form.getErrorId('email')} className="demo-form__error" role="alert">
                {form.errors.email}
              </p>
            ) : null}
          </div>

          <div className="demo-form__field">
            <label htmlFor={form.getFieldId('age')}>Age</label>
            <input {...form.register('age')} inputMode="numeric" />
            {form.errors.age ? (
              <p id={form.getErrorId('age')} className="demo-form__error" role="alert">
                {form.errors.age}
              </p>
            ) : null}
          </div>

          <div className="demo-form__field">
            <label htmlFor={form.getFieldId('profile.city')}>City</label>
            <input {...form.register('profile.city')} />
            {form.errors['profile.city'] ? (
              <p id={form.getErrorId('profile.city')} className="demo-form__error" role="alert">
                {form.errors['profile.city']}
              </p>
            ) : null}
          </div>

          <div className="demo-form__field">
            <label htmlFor={form.getFieldId('tags')}>Tags (comma-separated)</label>
            <input
              id={form.getFieldId('tags')}
              value={form.values.tags.join(', ')}
              onChange={(event) => {
                const next = event.target.value
                  .split(',')
                  .map((part) => part.trim())
                  .filter(Boolean)
                form.setValue('tags', next)
              }}
              onBlur={() => form.validateField('tags')}
              aria-invalid={form.errors.tags ? true : undefined}
              aria-describedby={form.errors.tags ? form.getErrorId('tags') : undefined}
            />
            {form.errors.tags ? (
              <p id={form.getErrorId('tags')} className="demo-form__error" role="alert">
                {form.errors.tags}
              </p>
            ) : null}
          </div>

          <p className="demo-form__meta">
            Live age type: {typeof form.values.age} ({form.values.age || 'empty'})
          </p>

          <div className="demo-form__actions">
            <button type="submit" disabled={form.isSubmitting || form.isValidating}>
              {form.isSubmitting ? 'Submitting…' : 'Create account'}
            </button>
            <button type="button" onClick={() => form.reset()}>
              Reset
            </button>
          </div>
        </form>
      </FormProvider>
    </section>
  )
}
