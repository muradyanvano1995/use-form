import { useController, useForm, type FieldPathValue } from '../hooks/useForm/index.ts'
import './examples.css'

type ControlledDemoValues = {
  profile: {
    birthDate: Date | null
    avatar: File | null
  }
  price: number
}

type FocusableCallback = (element: HTMLInputElement | null) => void

/** Simulated date picker — value/onChange only, no DOM event contract. */
function DatePicker(props: {
  id: string
  value: Date | null
  onChange: (value: Date | null) => void
  onBlur: () => void
  setElement: FocusableCallback
  'aria-invalid'?: true
  'aria-describedby'?: string
  disabled?: boolean
}) {
  const {
    id,
    value,
    onChange,
    onBlur,
    setElement,
    disabled,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
  } = props
  const display = value ? value.toISOString().slice(0, 10) : ''
  return (
    <input
      ref={setElement}
      id={id}
      type="date"
      value={display}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      onBlur={onBlur}
      onChange={(event) => {
        const raw = event.target.value
        onChange(raw ? new Date(`${raw}T00:00:00.000Z`) : null)
      }}
    />
  )
}

/** Simulated currency field — string UI, number form state via parse/format. */
function CurrencyInput(props: {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  setElement: FocusableCallback
  'aria-invalid'?: true
  'aria-describedby'?: string
}) {
  const {
    id,
    value,
    onChange,
    onBlur,
    setElement,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
  } = props
  return (
    <input
      ref={setElement}
      id={id}
      inputMode="decimal"
      value={value}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

/** Custom uploader — never assigns a native file input value programmatically. */
function CustomUploader(props: {
  id: string
  file: File | null
  onFileChange: (file: File | null) => void
  onBlur: () => void
  'aria-invalid'?: true
  'aria-describedby'?: string
}) {
  const {
    id,
    file,
    onFileChange,
    onBlur,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
  } = props
  return (
    <div className="demo-form__uploader">
      <input
        id={id}
        type="file"
        accept="image/*"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onBlur={onBlur}
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null
          onFileChange(next)
          event.target.value = ''
        }}
      />
      <p className="demo-form__hint">{file ? `Selected: ${file.name}` : 'No file selected'}</p>
      {file ? (
        <button type="button" className="demo-form__secondary" onClick={() => onFileChange(null)}>
          Clear file
        </button>
      ) : null}
    </div>
  )
}

function formatPrice(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : ''
}

function parsePrice(display: string): number {
  const trimmed = display.trim()
  if (trimmed === '') return Number.NaN
  return Number(trimmed)
}

export function ControlledFieldsForm() {
  const form = useForm<ControlledDemoValues>({
    id: 'controlled-demo',
    defaultValues: {
      profile: {
        birthDate: null,
        avatar: null,
      },
      price: 19.99,
    },
    onSubmit: async (values) => {
      const birth: FieldPathValue<ControlledDemoValues, 'profile.birthDate'> =
        values.profile.birthDate
      void birth
    },
  })

  const birthDate = useController({
    control: form.control,
    name: 'profile.birthDate',
  })

  const price = useController<ControlledDemoValues, 'price', string>({
    control: form.control,
    name: 'price',
    parse: parsePrice,
    format: formatPrice,
  })

  const avatar = useController({
    control: form.control,
    name: 'profile.avatar',
  })

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Controlled fields</h2>
        <p>Date picker, currency parse/format, and a custom file uploader via useController.</p>
      </header>

      <div className="demo-form__field">
        <label htmlFor={birthDate.field.id}>Birth date</label>
        <DatePicker
          id={birthDate.field.id}
          value={birthDate.field.value}
          onChange={birthDate.field.onChange}
          onBlur={birthDate.field.onBlur}
          setElement={birthDate.field.ref}
          aria-invalid={birthDate.field['aria-invalid']}
          aria-describedby={birthDate.field['aria-describedby']}
          disabled={birthDate.field.disabled}
        />
        {birthDate.fieldState.error ? (
          <p id={birthDate.field.errorId} className="demo-form__error" role="alert">
            {birthDate.fieldState.error}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={price.field.id}>Price</label>
        <CurrencyInput
          id={price.field.id}
          value={price.field.value}
          onChange={price.field.onChange}
          onBlur={price.field.onBlur}
          setElement={price.field.ref}
          aria-invalid={price.field['aria-invalid']}
          aria-describedby={price.field['aria-describedby']}
        />
        <p className="demo-form__hint">Stored as number: {String(form.values.price)}</p>
        {price.fieldState.error ? (
          <p id={price.field.errorId} className="demo-form__error" role="alert">
            {price.fieldState.error}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={avatar.field.id}>Avatar</label>
        <CustomUploader
          id={avatar.field.id}
          file={avatar.field.value}
          onFileChange={avatar.field.onChange}
          onBlur={avatar.field.onBlur}
          aria-invalid={avatar.field['aria-invalid']}
          aria-describedby={avatar.field['aria-describedby']}
        />
        {avatar.fieldState.error ? (
          <p id={avatar.field.errorId} className="demo-form__error" role="alert">
            {avatar.fieldState.error}
          </p>
        ) : null}
      </div>

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isSubmitting}>
          Submit
        </button>
        <button type="button" className="demo-form__secondary" onClick={() => form.reset()}>
          Reset
        </button>
      </div>
    </form>
  )
}
