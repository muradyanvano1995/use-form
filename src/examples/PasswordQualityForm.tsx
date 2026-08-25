import { useState } from 'react'
import { rules, useForm, ValidationMode, type FieldRules } from '../hooks/useForm'
import './examples.css'

type PasswordFormValues = {
  password: string
  confirmPassword: string
}

const defaultValues: PasswordFormValues = {
  password: '',
  confirmPassword: '',
}

const passwordRules: FieldRules<PasswordFormValues> = {
  password: [
    rules.required('Password is required'),
    rules.minLength(12, 'Use at least 12 characters'),
    rules.pattern(/[A-Z]/, 'Add an uppercase letter'),
    rules.pattern(/\d/, 'Add a number'),
  ],
  confirmPassword: [
    rules.required('Confirm your password'),
    rules.matchesField('password', 'Passwords must match'),
  ],
}

export function PasswordQualityForm() {
  const [statusMessage, setStatusMessage] = useState<string | undefined>()

  const form = useForm<PasswordFormValues>({
    id: 'password-quality',
    defaultValues,
    criteriaMode: 'all',
    mode: ValidationMode.OnChange,
    rules: passwordRules,
    onSubmit: (_values, helpers) => {
      helpers.setError('password', 'This password appeared in a breach', {
        source: 'server',
        type: 'breached',
      })
      helpers.setSubmitError('Choose a different password.')
    },
  })

  const passwordIssues = form.errorDetails.password?.issues ?? []
  const passwordErrorId = form.getErrorId('password')
  const rootErrorId = `${form.getErrorId('password')}-root`
  const describedBy = [
    passwordIssues.length > 0 ? passwordErrorId : undefined,
    form.rootError ? rootErrorId : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Password quality</h2>
        <p>
          <code>criteriaMode: 'all'</code> lists every password rule. The primary string error stays
          backward compatible.
        </p>
      </header>

      {form.rootError ? (
        <p id={rootErrorId} className="demo-form__error" role="alert">
          {form.rootError}
        </p>
      ) : null}

      <label className="demo-form__field">
        Password
        <input
          {...form.register('password')}
          type="password"
          autoComplete="new-password"
          aria-describedby={describedBy || undefined}
        />
        {form.errors.password ? <p className="demo-form__error">{form.errors.password}</p> : null}
        {passwordIssues.length > 0 ? (
          <ul id={passwordErrorId} className="demo-form__issue-list">
            {passwordIssues.map((issue) => (
              <li key={`${issue.type}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
      </label>

      <label className="demo-form__field">
        Confirm password
        <input {...form.register('confirmPassword')} type="password" autoComplete="new-password" />
        {form.errors.confirmPassword ? (
          <p className="demo-form__error">{form.errors.confirmPassword}</p>
        ) : null}
      </label>

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Checking…' : 'Save password'}
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => {
            form.setError('password', {
              message: 'Password is too common',
              type: 'common',
            })
            form.clearRootError()
            setStatusMessage('Manual error applied with source “manual”.')
          }}
        >
          Apply manual error
        </button>
      </div>

      {form.submitError ? (
        <p className="demo-form__error" role="alert">
          {form.submitError}
        </p>
      ) : null}
      {form.errorDetails.password?.source === 'server' ? (
        <p className="demo-form__meta">Server issue: {form.errorDetails.password.message}</p>
      ) : null}
      {form.rootErrorDetails ? (
        <p className="demo-form__meta">Root details: {form.rootErrorDetails.message}</p>
      ) : null}
      {statusMessage ? <p className="demo-form__status">{statusMessage}</p> : null}
    </form>
  )
}
