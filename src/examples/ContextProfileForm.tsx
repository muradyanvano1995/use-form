import {
  FormProvider,
  rules,
  useController,
  useForm,
  useFormState,
  ValidationMode,
  type FieldRules,
} from '../hooks/useForm'
import './examples.css'

type ContextProfileValues = {
  personal: {
    firstName: string
  }
  address: {
    city: string
  }
}

const rulesConfig: FieldRules<ContextProfileValues> = {
  'personal.firstName': [rules.required('First name is required')],
  'address.city': [rules.required('City is required')],
}

function PersonalFields() {
  const { field, fieldState } = useController<ContextProfileValues, 'personal.firstName'>({
    name: 'personal.firstName',
  })
  const {
    id,
    value,
    onChange,
    onBlur,
    ref: setElement,
    errorId,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
  } = field

  return (
    <div className="demo-form__field">
      <label htmlFor={id}>First name</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        ref={setElement}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      {fieldState.error ? (
        <p id={errorId} className="demo-form__error" role="alert">
          {fieldState.error}
        </p>
      ) : null}
    </div>
  )
}

function AddressFields() {
  const { field, fieldState } = useController<ContextProfileValues, 'address.city'>({
    name: 'address.city',
  })
  const {
    id,
    value,
    onChange,
    onBlur,
    ref: setElement,
    errorId,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
  } = field

  return (
    <div className="demo-form__field">
      <label htmlFor={id}>City</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        ref={setElement}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      {fieldState.error ? (
        <p id={errorId} className="demo-form__error" role="alert">
          {fieldState.error}
        </p>
      ) : null}
    </div>
  )
}

function SubmitButton() {
  const isSubmitting = useFormState<ContextProfileValues, boolean>({
    selector: (state) => state.isSubmitting,
  })

  return (
    <button type="submit" disabled={isSubmitting}>
      {isSubmitting ? 'Saving…' : 'Save profile'}
    </button>
  )
}

export function ContextProfileForm() {
  const form = useForm<ContextProfileValues>({
    id: 'context-profile',
    defaultValues: {
      personal: { firstName: '' },
      address: { city: '' },
    },
    mode: ValidationMode.OnBlur,
    rules: rulesConfig,
    onSubmit: async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 300)
      })
    },
  })

  return (
    <FormProvider control={form.control}>
      <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
        <div className="demo-form__header">
          <h2>Context profile</h2>
          <p>
            Nested field components use <code>FormProvider</code> + <code>useController</code>{' '}
            without prop-drilling <code>control</code>.
          </p>
        </div>

        <PersonalFields />
        <AddressFields />

        <div className="demo-form__actions">
          <SubmitButton />
          <button type="button" className="demo-form__secondary" onClick={() => form.reset()}>
            Reset
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
