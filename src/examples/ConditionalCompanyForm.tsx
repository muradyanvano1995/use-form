import { rules, useForm, useWatch, ValidationMode } from '../hooks/useForm'
import './examples.css'

type ConditionalFormValues = {
  accountType: 'personal' | 'company'
  company?: {
    name: string
    taxNumber: string
  }
}

const defaultValues: ConditionalFormValues = {
  accountType: 'personal',
}

function fakeTaxCheck(taxNumber: string, signal?: AbortSignal): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      resolve(taxNumber === 'TAKEN' ? 'That tax number is already registered' : undefined)
    }, 400)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        const error = new Error('Aborted')
        error.name = 'AbortError'
        reject(error)
      },
      { once: true },
    )
  })
}

export function ConditionalFieldsDemo({
  shouldUnregister,
  onSubmitSuccess,
}: {
  shouldUnregister: boolean
  onSubmitSuccess?: (payload: ConditionalFormValues) => void
}) {
  const form = useForm<ConditionalFormValues>({
    id: shouldUnregister ? 'conditional-unregister' : 'conditional-preserve',
    defaultValues,
    shouldUnregister,
    mode: ValidationMode.OnBlur,
    rules: {
      'company.name': [rules.required('Company name is required')],
      'company.taxNumber': [
        rules.required('Tax number is required'),
        rules.async(
          async (value, _values, context) => fakeTaxCheck(String(value), context?.signal),
          {
            debounce: 250,
          },
        ),
      ],
    },
    onSubmit: (values) => {
      onSubmitSuccess?.(values)
    },
  })

  const accountType = useWatch(form, 'accountType')
  const submitted = form.isSubmitted ? JSON.stringify(form.values, null, 2) : null

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <div className="demo-form__header">
        <h2>
          {shouldUnregister ? 'Conditional fields (unregister)' : 'Conditional fields (preserve)'}
        </h2>
        <p>
          {shouldUnregister
            ? 'Unmounting company fields removes optional company data from values and submit.'
            : 'Unmounting company fields keeps previous values. Switching back restores them.'}
        </p>
      </div>

      <fieldset className="demo-form__field-group">
        <legend>Account type</legend>
        <label className="demo-form__field demo-form__field--inline">
          <input
            {...form.register('accountType', { type: 'radio', value: 'personal' })}
            type="radio"
          />
          Personal
        </label>
        <label className="demo-form__field demo-form__field--inline">
          <input
            {...form.register('accountType', { type: 'radio', value: 'company' })}
            type="radio"
          />
          Company
        </label>
      </fieldset>

      <p className="demo-form__hint" role="status">
        {accountType === 'company'
          ? 'Company details are visible and required.'
          : shouldUnregister
            ? 'Company details are hidden and unregistered. They will not be submitted.'
            : 'Company details are hidden. Previous values are preserved if you switch back.'}
      </p>

      {accountType === 'company' ? (
        <fieldset className="demo-form__field-group">
          <legend>Company</legend>
          <div className="demo-form__field">
            <label htmlFor={form.getFieldId('company.name')}>Company name</label>
            <input {...form.register('company.name')} autoComplete="organization" />
            {form.errors['company.name'] ? (
              <p id={form.getErrorId('company.name')} className="demo-form__error" role="alert">
                {form.errors['company.name']}
              </p>
            ) : null}
          </div>
          <div className="demo-form__field">
            <label htmlFor={form.getFieldId('company.taxNumber')}>Tax number</label>
            <input {...form.register('company.taxNumber')} />
            {form.errors['company.taxNumber'] ? (
              <p
                id={form.getErrorId('company.taxNumber')}
                className="demo-form__error"
                role="alert"
              >
                {form.errors['company.taxNumber']}
              </p>
            ) : null}
            <p className="demo-form__hint">
              Try TAKEN to see a delayed remote check cancel on hide.
            </p>
          </div>
        </fieldset>
      ) : null}

      <div className="demo-form__actions">
        <button type="submit">Submit</button>
        <button type="button" className="demo-form__secondary" onClick={() => form.reset()}>
          Reset
        </button>
      </div>

      {submitted ? (
        <pre className="demo-form__success" tabIndex={0}>
          {submitted}
        </pre>
      ) : null}
    </form>
  )
}

export function ConditionalCompanyForm() {
  return (
    <div className="demo-form__stack">
      <ConditionalFieldsDemo shouldUnregister />
      <ConditionalFieldsDemo shouldUnregister={false} />
    </div>
  )
}
