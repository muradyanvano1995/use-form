import { useForm, ValidationMode } from '../hooks/useForm'
import { standardSchemaResolver, type StandardSchemaV1 } from '../hooks/useForm/validation'
import './examples.css'

type Input = {
  username: string
  age: string
}

type Output = {
  username: string
  age: number
}

function demoSchema(): StandardSchemaV1<Input, Output> {
  return {
    '~standard': {
      version: 1,
      vendor: 'docs-demo',
      validate: (value) => {
        const input = value as Input
        const issues: { message: string; path: Array<string | number> }[] = []
        if (!input.username.trim()) {
          issues.push({ message: 'Username is required', path: ['username'] })
        }
        const age = Number(input.age)
        if (!Number.isFinite(age) || age < 18) {
          issues.push({ message: 'You must be at least 18', path: ['age'] })
        }
        if (issues.length > 0) return { issues }
        return { value: { username: input.username.trim(), age } }
      },
    },
  }
}

export function StandardSchemaForm({
  onSubmitSuccess,
}: {
  onSubmitSuccess?: (payload: Output) => void
} = {}) {
  const form = useForm<Input, Output>({
    id: 'standard-schema',
    defaultValues: { username: '', age: '' },
    mode: ValidationMode.OnSubmit,
    resolver: standardSchemaResolver(demoSchema()),
    onSubmit: (values) => {
      onSubmitSuccess?.(values)
    },
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <div className="demo-form__header">
        <h2>Standard Schema resolver</h2>
        <p>
          Imported from <code>&lt;package-name&gt;/resolvers/standard-schema</code>. Live state
          keeps <code>age</code> as a string; submit receives a number. This demo schema is not Zod.
        </p>
      </div>
      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('username')}>Username</label>
        <input {...form.register('username')} autoComplete="username" />
        {form.errors.username ? (
          <p id={form.getErrorId('username')} className="demo-form__error">
            {form.errors.username}
          </p>
        ) : null}
      </div>
      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('age')}>Age</label>
        <input {...form.register('age')} inputMode="numeric" />
        {form.errors.age ? (
          <p id={form.getErrorId('age')} className="demo-form__error">
            {form.errors.age}
          </p>
        ) : null}
      </div>
      <p className="demo-form__meta">Live age type: {typeof form.values.age}</p>
      <div className="demo-form__actions">
        <button type="submit">Create</button>
      </div>
    </form>
  )
}
