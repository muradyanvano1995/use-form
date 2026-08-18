import {
  FormProvider,
  rules,
  useForm,
  ValidationMode,
  type FieldRules,
} from '../hooks/useForm'
import { FormDevTools, type DevToolsPosition } from '../devtools'
import './examples.css'

type InspectorValues = {
  profile: {
    displayName: string
    password: string
  }
  avatar: File | null
}

const defaultValues: InspectorValues = {
  profile: {
    displayName: '',
    password: '',
  },
  avatar: null,
}

const inspectorRules: FieldRules<InspectorValues> = {
  'profile.displayName': [rules.required('Name is required')],
  'profile.password': [rules.required('Password is required'), rules.minLength(8)],
}

export function DevToolsInspectorForm({
  position = 'inline',
  initiallyOpen = true,
}: {
  position?: DevToolsPosition
  initiallyOpen?: boolean
}) {
  const form = useForm<InspectorValues>({
    id: 'devtools-inspector',
    defaultValues,
    mode: ValidationMode.OnChange,
    rules: inspectorRules,
    onSubmit: () => undefined,
  })

  return (
    <FormProvider control={form.control}>
      <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
        <header className="demo-form__header">
          <h2>Form DevTools</h2>
          <p>
            Development inspector imported from <code>{'<package-name>/devtools'}</code>. Passwords
            are redacted; file contents are never shown. The inspector resolves <code>control</code>{' '}
            from context.
          </p>
        </header>

        <label className="demo-form__field">
          Display name
          <input {...form.register('profile.displayName')} autoComplete="nickname" />
          {form.errors['profile.displayName'] ? (
            <p className="demo-form__error">{form.errors['profile.displayName']}</p>
          ) : null}
        </label>

        <label className="demo-form__field">
          Password
          <input
            {...form.register('profile.password')}
            type="password"
            autoComplete="new-password"
          />
          {form.errors['profile.password'] ? (
            <p className="demo-form__error">{form.errors['profile.password']}</p>
          ) : null}
        </label>

        <label className="demo-form__field">
          Avatar
          <input {...form.register('avatar', { type: 'file' })} />
        </label>

        <div className="demo-form__actions">
          <button type="submit">Validate</button>
        </div>

        <FormDevTools
          position={position}
          initiallyOpen={initiallyOpen}
          redact={['profile.password']}
        />
      </form>
    </FormProvider>
  )
}
