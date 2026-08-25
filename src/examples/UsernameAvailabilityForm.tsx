import { createAsyncRule, rules, useForm, ValidationMode } from '../hooks/useForm'
import './examples.css'

type UsernameFormValues = {
  username: string
}

const TAKEN = new Set(['admin', 'root', 'taken'])

async function fakeUsernameCheck(username: string, signal?: AbortSignal): Promise<boolean> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 120)
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
  return !TAKEN.has(username.toLowerCase())
}

const remoteCheck = async (
  username: string,
  _values: UsernameFormValues,
  { signal }: { signal?: AbortSignal },
) => {
  const available = await fakeUsernameCheck(username, signal)
  return available ? undefined : 'Username is already taken'
}

export function UsernameAvailabilityForm({
  ruleApi = 'rules.async',
}: {
  /** `createAsyncRule` is the same scheduler; `rules.async` is the usual catalog entry. */
  ruleApi?: 'rules.async' | 'createAsyncRule'
} = {}) {
  const asyncRule =
    ruleApi === 'createAsyncRule'
      ? createAsyncRule(remoteCheck, { debounce: 400, validateEmpty: false })
      : rules.async(remoteCheck, { debounce: 400, validateEmpty: false })

  const form = useForm<UsernameFormValues>({
    id: ruleApi === 'createAsyncRule' ? 'username-create-async-rule' : 'username-availability',
    defaultValues: { username: '' },
    mode: ValidationMode.OnChange,
    rules: {
      username: [rules.required(), rules.minLength(3), asyncRule],
    },
    onSubmit: () => undefined,
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Username availability</h2>
        <p>
          Sync rules fail immediately. The remote check uses{' '}
          <code>{ruleApi === 'createAsyncRule' ? 'createAsyncRule' : 'rules.async'}</code> with
          debounce 400ms on change; blur and submit run it without waiting for the delay.
        </p>
      </header>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('username')}>Username</label>
        <input {...form.register('username')} autoComplete="username" />
        {form.isValidating ? <p className="demo-form__hint">Checking availability…</p> : null}
        {form.errors.username ? (
          <p id={form.getErrorId('username')} className="demo-form__error" role="alert">
            {form.errors.username}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={form.isSubmitting || form.isValidating}>
        Continue
      </button>
    </form>
  )
}
