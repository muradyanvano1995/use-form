import {
  ReValidateMode,
  rules,
  useForm,
  ValidationMode,
  type FieldErrors,
  type FieldRules,
} from '../hooks/useForm'
import './examples.css'

type ProfileFormValues = {
  personal: {
    firstName: string
    lastName: string
  }
  address: {
    city: string
    postalCode: string
  }
  preferences: {
    newsletter: boolean
  }
}

const profileRules: FieldRules<ProfileFormValues> = {
  'personal.firstName': [rules.required('First name is required'), rules.minLength(2)],
  'personal.lastName': [rules.required('Last name is required')],
  'address.city': [rules.required('City is required')],
  'address.postalCode': [
    rules.required('Postal code is required'),
    rules.pattern(/^\d{4,}$/, 'Enter a valid postal code'),
  ],
}

function isCityUnsupportedError(
  error: unknown,
): error is Error & { fieldErrors?: FieldErrors<ProfileFormValues> } {
  return error instanceof Error && error.message === 'CITY_UNSUPPORTED'
}

async function fakeProfileRequest(values: ProfileFormValues): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 350)
  })

  if (values.address.city.toLowerCase() === 'forbidden') {
    const error = new Error('CITY_UNSUPPORTED') as Error & {
      fieldErrors?: FieldErrors<ProfileFormValues>
    }
    error.fieldErrors = {
      'address.city': 'This city is not supported yet.',
    }
    throw error
  }
}

export function ProfileForm() {
  const form = useForm<ProfileFormValues>({
    id: 'profile',
    defaultValues: {
      personal: { firstName: '', lastName: '' },
      address: { city: '', postalCode: '' },
      preferences: { newsletter: false },
    },
    mode: ValidationMode.OnBlur,
    reValidateMode: ReValidateMode.OnChange,
    rules: profileRules,
    onSubmit: async (values, helpers) => {
      try {
        await fakeProfileRequest(values)
        helpers.setSubmitError(undefined)
      } catch (error) {
        if (isCityUnsupportedError(error)) {
          if (error.fieldErrors) {
            helpers.setErrors(error.fieldErrors)
          }
          helpers.setSubmitError('Profile could not be saved. Check the highlighted fields.')
          return
        }
        throw error
      }
    },
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <div className="demo-form__header">
        <h2>Profile</h2>
        <p>Nested personal + address fields with path-based validation.</p>
      </div>

      {form.submitError ? (
        <p className="demo-form__banner" role="alert">
          {form.submitError}
        </p>
      ) : null}

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('personal.firstName')}>First name</label>
        <input
          {...form.register('personal.firstName')}
          type="text"
          autoComplete="given-name"
          placeholder="Vano"
        />
        {form.errors['personal.firstName'] ? (
          <p id={form.getErrorId('personal.firstName')} className="demo-form__error" role="alert">
            {form.errors['personal.firstName']}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('personal.lastName')}>Last name</label>
        <input {...form.register('personal.lastName')} type="text" autoComplete="family-name" />
        {form.errors['personal.lastName'] ? (
          <p id={form.getErrorId('personal.lastName')} className="demo-form__error" role="alert">
            {form.errors['personal.lastName']}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('address.city')}>City</label>
        <input {...form.register('address.city')} type="text" autoComplete="address-level2" />
        {form.errors['address.city'] ? (
          <p id={form.getErrorId('address.city')} className="demo-form__error" role="alert">
            {form.errors['address.city']}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('address.postalCode')}>Postal code</label>
        <input {...form.register('address.postalCode')} type="text" autoComplete="postal-code" />
        {form.errors['address.postalCode'] ? (
          <p id={form.getErrorId('address.postalCode')} className="demo-form__error" role="alert">
            {form.errors['address.postalCode']}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field demo-form__field--inline">
        <input {...form.register('preferences.newsletter')} type="checkbox" />
        <label htmlFor={form.getFieldId('preferences.newsletter')}>Subscribe to newsletter</label>
      </div>

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Saving…' : 'Save profile'}
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => form.resetField('address.city')}
          disabled={form.isSubmitting}
        >
          Reset city
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => form.reset()}
          disabled={form.isSubmitting}
        >
          Reset all
        </button>
      </div>

      <p className="demo-form__hint">
        Dirty city: <code>{form.dirtyFields['address.city'] ? 'yes' : 'no'}</code>
        {' · '}
        Try city <code>forbidden</code> for a nested backend error.
      </p>
    </form>
  )
}
