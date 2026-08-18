import { rules, useForm, ValidationMode } from '../hooks/useForm'
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

export function UsernameAvailabilityForm() {
  const form = useForm<UsernameFormValues>({
    id: 'username-availability',
    defaultValues: { username: '' },
    mode: ValidationMode.OnChange,
    rules: {
      username: [
        rules.required(),
        rules.minLength(3),
        rules.async(
          async (username, _values, { signal }) => {
            const available = await fakeUsernameCheck(username, signal)
            return available ? undefined : 'Username is already taken'
          },
          {
            debounce: 400,
            validateEmpty: false,
          },
        ),
      ],
    },
    onSubmit: () => undefined,
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Username availability</h2>
        <p>
          Sync rules fail immediately. The remote check is debounced on change; blur and submit run
          it without waiting for the delay.
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
