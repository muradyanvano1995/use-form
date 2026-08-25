import {
  FormProvider,
  rules,
  useFieldState,
  useForm,
  ValidationMode,
} from '../hooks/useForm'
import './examples.css'

type FieldStateValues = {
  email: string
}

function EmailFieldMeta() {
  const field = useFieldState<FieldStateValues, 'email'>({ name: 'email' })
  const summary = `useFieldState: invalid=${String(field.invalid)} touched=${String(field.touched)} dirty=${String(field.dirty)}${field.error ? ` error="${field.error}"` : ''}`
  return (
    <p className="demo-form__meta" aria-live="polite">
      {summary}
    </p>
  )
}

export function FieldStateForm() {
  const form = useForm<FieldStateValues>({
    id: 'field-state',
    defaultValues: { email: '' },
    mode: ValidationMode.OnBlur,
    rules: {
      email: [rules.required('Email is required'), rules.email('Enter a valid email address')],
    },
    onSubmit: () => undefined,
  })

  return (
    <FormProvider control={form.control}>
      <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
        <header className="demo-form__header">
          <h2>useFieldState</h2>
          <p>
            Child reads error / touched / dirty for one path without selecting the whole form
            snapshot. Distinct from <code>useWatch</code> (values) and <code>useFormState</code>{' '}
            (custom selectors).
          </p>
        </header>
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('email')}>Email</label>
          <input {...form.register('email')} type="email" autoComplete="email" />
          {form.errors.email ? (
            <p id={form.getErrorId('email')} className="demo-form__error" role="alert">
              {form.errors.email}
            </p>
          ) : null}
        </div>
        <EmailFieldMeta />
        <div className="demo-form__actions">
          <button type="submit">Check</button>
        </div>
      </form>
    </FormProvider>
  )
}
