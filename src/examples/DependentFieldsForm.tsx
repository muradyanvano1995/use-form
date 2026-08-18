import { rules, useForm, type FieldDependencies, type FieldRules } from '../hooks/useForm'
import './examples.css'

type DependentFieldsValues = {
  password: string
  confirmPassword: string
  address: {
    country: string
    postalCode: string
  }
}

const defaultValues: DependentFieldsValues = {
  password: '',
  confirmPassword: '',
  address: { country: 'US', postalCode: '' },
}

const dependencies: FieldDependencies<DependentFieldsValues> = {
  confirmPassword: ['password'],
  'address.postalCode': ['address.country'],
}

const rulesByField: FieldRules<DependentFieldsValues> = {
  confirmPassword: [
    rules.required('Confirm your password'),
    rules.matchesField('password', 'Passwords must match'),
  ],
  'address.postalCode': [
    (postalCode, values) =>
      values.address.country === 'CA' && !postalCode.startsWith('H')
        ? 'Canadian postal codes in this example start with H'
        : undefined,
  ],
}

export function DependentFieldsForm() {
  const form = useForm<DependentFieldsValues>({
    id: 'dependent-fields',
    defaultValues,
    dependencies,
    rules: rulesByField,
    onSubmit: () => undefined,
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Dependent fields</h2>
        <p>Touch a dependent field, then change its source to revalidate it automatically.</p>
      </header>

      <div className="demo-form__row">
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('password')}>Password</label>
          <input {...form.register('password')} type="password" />
        </div>
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('confirmPassword')}>Confirm password</label>
          <input {...form.register('confirmPassword')} type="password" />
          {form.errors.confirmPassword ? (
            <p id={form.getErrorId('confirmPassword')} className="demo-form__error" role="alert">
              {form.errors.confirmPassword}
            </p>
          ) : null}
        </div>
      </div>

      <div className="demo-form__row">
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('address.country')}>Country</label>
          <select {...form.register('address.country')}>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
        </div>
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('address.postalCode')}>Postal code</label>
          <input {...form.register('address.postalCode')} />
          {form.errors['address.postalCode'] ? (
            <p id={form.getErrorId('address.postalCode')} className="demo-form__error" role="alert">
              {form.errors['address.postalCode']}
            </p>
          ) : null}
        </div>
      </div>

      <div className="demo-form__actions">
        <button type="submit">Validate form</button>
        <button type="button" className="demo-form__secondary" onClick={() => form.reset()}>
          Reset
        </button>
      </div>
    </form>
  )
}
