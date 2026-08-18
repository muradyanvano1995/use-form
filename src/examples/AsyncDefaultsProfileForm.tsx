import { rules, useForm, ValidationMode } from '../hooks/useForm'
import './examples.css'

type AsyncProfileValues = {
  name: string
  email: string
  address: {
    city: string
    country: string
  }
  tags: string[]
}

const fallback: AsyncProfileValues = {
  name: '',
  email: '',
  address: { city: '', country: '' },
  tags: [],
}

const SERVER_PROFILE: AsyncProfileValues = {
  name: 'Server Name',
  email: 'server@example.com',
  address: { city: 'Yerevan', country: 'Armenia' },
  tags: ['member'],
}

let shouldFailNextLoad = false

async function fakeFetchProfile(signal?: AbortSignal): Promise<AsyncProfileValues> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 350)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        const error = new Error('Aborted')
        error.name = 'AbortError'
        reject(error)
      },
      { once: true },
    )
  })

  if (shouldFailNextLoad) {
    shouldFailNextLoad = false
    throw new Error('Could not reach the profile service')
  }

  return { ...SERVER_PROFILE, tags: [...SERVER_PROFILE.tags] }
}

export function AsyncDefaultsProfileForm() {
  const form = useForm<AsyncProfileValues>({
    id: 'async-defaults-profile',
    defaultValues: fallback,
    mode: ValidationMode.OnBlur,
    loadDefaultValues: async ({ signal }) => fakeFetchProfile(signal),
    defaultValuesLoadMode: 'preserveDirty',
    rules: {
      name: [rules.required(), rules.minLength(2)],
      email: [rules.required(), rules.email()],
      'address.city': [rules.required()],
    },
    onSubmit: () => undefined,
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Async default values</h2>
        <p>
          Fallback values render immediately. Loaded defaults replace pristine fields and become the
          reset baseline. Dirty edits are preserved.
        </p>
      </header>

      {form.isLoadingDefaults ? (
        <p className="demo-form__hint" role="status">
          Loading profile…
        </p>
      ) : null}

      {form.defaultValuesError ? (
        <div className="demo-form__error" role="alert">
          <p>{form.defaultValuesError.message}</p>
          <button type="button" onClick={() => void form.reloadDefaultValues()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('name')}>Name</label>
        <input {...form.register('name')} disabled={form.isLoadingDefaults} />
        {form.errors.name ? (
          <p id={form.getErrorId('name')} className="demo-form__error" role="alert">
            {form.errors.name}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('email')}>Email</label>
        <input {...form.register('email')} disabled={form.isLoadingDefaults} />
        {form.errors.email ? (
          <p id={form.getErrorId('email')} className="demo-form__error" role="alert">
            {form.errors.email}
          </p>
        ) : null}
      </div>

      <div className="demo-form__row">
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('address.city')}>City</label>
          <input {...form.register('address.city')} disabled={form.isLoadingDefaults} />
        </div>
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('address.country')}>Country</label>
          <input {...form.register('address.country')} disabled={form.isLoadingDefaults} />
        </div>
      </div>

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isLoadingDefaults || !form.isDefaultsReady}>
          Save
        </button>
        <button
          type="button"
          disabled={form.isLoadingDefaults}
          onClick={() => void form.reloadDefaultValues()}
        >
          Reload defaults
        </button>
        <button
          type="button"
          onClick={() => {
            shouldFailNextLoad = true
            void form.reloadDefaultValues()
          }}
        >
          Simulate failure
        </button>
      </div>

      <p className="demo-form__meta">
        Ready: {String(form.isDefaultsReady)} · Dirty: {String(form.isDirty)}
      </p>
    </form>
  )
}
