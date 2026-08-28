import { useState } from 'react'
import { ErrorSource, rules, useForm, ValidationMode, type FormResolver } from '../hooks/useForm'
import './examples.css'

type ImperativeValues = {
  email: string
  note: string
}

const imperativeResolver: FormResolver<ImperativeValues> = (values) => {
  if (values.note.trim().toLowerCase() === 'block') {
    return {
      success: false,
      errors: {},
      rootError: 'Form blocked by resolver',
    }
  }
  return { success: true, values }
}

export function ImperativeApiForm() {
  const [lastValidate, setLastValidate] = useState<string>('—')
  const form = useForm<ImperativeValues>({
    id: 'imperative-api',
    defaultValues: { email: '', note: '' },
    mode: ValidationMode.OnSubmit,
    rules: {
      email: [rules.required('Email is required'), rules.email('Enter a valid email address')],
      note: [rules.maxLength(40, 'Keep notes under 40 characters')],
    },
    resolver: imperativeResolver,
    onSubmit: () => undefined,
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <div className="demo-form__header">
        <h2>Imperative mutations</h2>
        <p>
          Buttons call <code>validateField</code>, <code>setError</code>, <code>clearError</code>,{' '}
          <code>clearRootError</code>, and <code>clearErrors</code>. Set note to <code>block</code>{' '}
          then Validate form to create a pathless <code>rootError</code>. There is no public{' '}
          <code>setFocus</code>; submit uses registered refs when <code>focusOnError</code> is on.
        </p>
      </div>

      {form.rootError ? (
        <p className="demo-form__banner" role="status">
          Root: {form.rootError}
        </p>
      ) : null}

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('email')}>Email</label>
        <input {...form.register('email')} type="email" autoComplete="email" />
        {form.errors.email ? (
          <p id={form.getErrorId('email')} className="demo-form__error" role="alert">
            {form.errors.email}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('note')}>Note</label>
        <input {...form.register('note')} />
        {form.errors.note ? (
          <p id={form.getErrorId('note')} className="demo-form__error" role="alert">
            {form.errors.note}
          </p>
        ) : null}
      </div>

      <p className="demo-form__meta">Last validateField(email): {lastValidate}</p>

      <div className="demo-form__actions">
        <button
          type="button"
          onClick={() => {
            void form.validateField('email').then((ok) => {
              setLastValidate(ok ? 'valid' : 'invalid')
            })
          }}
        >
          Validate email
        </button>
        <button
          type="button"
          onClick={() => {
            void form.validate()
          }}
        >
          Validate form
        </button>
        <button
          type="button"
          onClick={() => {
            form.setError('email', 'Manual review required', { source: ErrorSource.Manual })
          }}
        >
          setError email
        </button>
        <button
          type="button"
          onClick={() => {
            form.clearError('email')
          }}
        >
          clearError email
        </button>
        <button type="button" onClick={() => form.clearRootError()}>
          clearRootError
        </button>
        <button type="button" onClick={() => form.clearErrors()}>
          clearErrors
        </button>
        <button type="submit">Submit</button>
      </div>
    </form>
  )
}
