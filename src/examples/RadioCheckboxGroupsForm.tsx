import { rules, useForm, ValidationMode, type FieldRules } from '../hooks/useForm'
import './examples.css'

type GroupValues = {
  contact: 'email' | 'phone' | 'none'
  topics: {
    product: boolean
    security: boolean
    research: boolean
  }
}

const defaults: GroupValues = {
  contact: 'email',
  topics: { product: true, security: false, research: false },
}

const groupRules: FieldRules<GroupValues> = {
  contact: [rules.required('Choose a contact preference')],
}

export function RadioCheckboxGroupsForm({
  onSubmitSuccess,
}: {
  onSubmitSuccess?: (payload: GroupValues) => void
} = {}) {
  const form = useForm<GroupValues>({
    id: 'radio-checkbox-groups',
    defaultValues: defaults,
    mode: ValidationMode.OnSubmit,
    rules: groupRules,
    validate: (values) => {
      if (!values.topics.product && !values.topics.security && !values.topics.research) {
        return { 'topics.product': 'Select at least one topic' }
      }
      return {}
    },
    onSubmit: (values) => {
      onSubmitSuccess?.(values)
    },
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Radio and checkbox groups</h2>
        <p>Use fieldset and legend. Radios share a name via register type radio.</p>
      </header>

      <fieldset>
        <legend>Preferred contact</legend>
        <label className="demo-form__field demo-form__field--inline">
          <input {...form.register('contact', { type: 'radio', value: 'email' })} type="radio" />
          Email
        </label>
        <label className="demo-form__field demo-form__field--inline">
          <input {...form.register('contact', { type: 'radio', value: 'phone' })} type="radio" />
          Phone
        </label>
        <label className="demo-form__field demo-form__field--inline">
          <input {...form.register('contact', { type: 'radio', value: 'none' })} type="radio" />
          No contact
        </label>
        {form.errors.contact ? (
          <p id={form.getErrorId('contact')} className="demo-form__error">
            {form.errors.contact}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend>Topics</legend>
        <label className="demo-form__field demo-form__field--inline">
          <input {...form.register('topics.product')} type="checkbox" />
          Product updates
        </label>
        <label className="demo-form__field demo-form__field--inline">
          <input {...form.register('topics.security')} type="checkbox" />
          Security notices
        </label>
        <label className="demo-form__field demo-form__field--inline">
          <input {...form.register('topics.research')} type="checkbox" />
          Research invitations
        </label>
        {form.errors['topics.product'] ? (
          <p id={form.getErrorId('topics.product')} className="demo-form__error">
            {form.errors['topics.product']}
          </p>
        ) : null}
      </fieldset>

      <div className="demo-form__actions">
        <button type="submit">Save preferences</button>
      </div>
    </form>
  )
}
