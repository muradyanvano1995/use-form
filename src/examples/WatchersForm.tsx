import {
  FormProvider,
  rules,
  useForm,
  useFormState,
  useWatch,
  ValidationMode,
} from '../hooks/useForm'
import './examples.css'

type WatchValues = {
  title: string
  published: boolean
}

function TitlePreview() {
  const title = useWatch<WatchValues, 'title'>({ name: 'title' })
  return <p className="demo-form__meta">Watched title: {title || '—'} (this child only)</p>
}

function DirtyFlag() {
  const isDirty = useFormState<WatchValues, boolean>({
    selector: (state) => state.isDirty,
  })
  return <p className="demo-form__meta">Dirty via useFormState: {isDirty ? 'yes' : 'no'}</p>
}

export function WatchersForm() {
  const form = useForm<WatchValues>({
    id: 'watchers',
    defaultValues: { title: '', published: false },
    mode: ValidationMode.OnBlur,
    rules: {
      title: [rules.required('Title is required')],
    },
    onSubmit: () => undefined,
  })

  return (
    <FormProvider control={form.control}>
      <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
        <header className="demo-form__header">
          <h2>Watchers and subscriptions</h2>
          <p>
            Child components subscribe with <code>useWatch</code> and <code>useFormState</code>. The
            parent still re-renders; isolate expensive UI in memoized children.
          </p>
        </header>
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('title')}>Title</label>
          <input {...form.register('title')} />
          {form.errors.title ? (
            <p id={form.getErrorId('title')} className="demo-form__error">
              {form.errors.title}
            </p>
          ) : null}
        </div>
        <div className="demo-form__field demo-form__field--inline">
          <input {...form.register('published')} type="checkbox" />
          <label htmlFor={form.getFieldId('published')}>Published</label>
        </div>
        <TitlePreview />
        <DirtyFlag />
        <div className="demo-form__actions">
          <button type="submit">Save</button>
        </div>
      </form>
    </FormProvider>
  )
}
