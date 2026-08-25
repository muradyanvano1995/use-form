import { useState } from 'react'
import { useForm } from '../hooks/useForm'
import './examples.css'

type AddressValues = {
  address: {
    city: string
    country: string
    postalCode: string
  }
}

const defaultValues: AddressValues = {
  address: {
    city: '',
    country: '',
    postalCode: '',
  },
}

export function BatchedAddressForm() {
  const form = useForm<AddressValues>({
    id: 'batched-address',
    defaultValues,
  })
  const [dirtyPreview, setDirtyPreview] = useState(() => form.getDirtyValues())
  const [busy, setBusy] = useState(false)

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Batched address updates</h2>
        <p>
          <code>form.batch()</code> applies several <code>setValue</code> calls as one notification.{' '}
          <code>getDirtyValues()</code> reads the latest snapshot without subscribing.
        </p>
      </header>

      <label className="demo-form__field">
        City
        <input {...form.register('address.city')} />
      </label>
      <label className="demo-form__field">
        Country
        <input {...form.register('address.country')} />
      </label>
      <label className="demo-form__field">
        Postal code
        <input {...form.register('address.postalCode')} />
      </label>

      <div className="demo-form__actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void form
              .batch(() => {
                form.setValue('address.city', 'Yerevan')
                form.setValue('address.country', 'Armenia')
              })
              .finally(() => {
                setDirtyPreview(form.getDirtyValues())
                setBusy(false)
              })
          }}
        >
          Fill city and country atomically
        </button>
        <button type="submit">Save</button>
      </div>

      <pre className="demo-form__status" aria-live="polite">
        {JSON.stringify(dirtyPreview, null, 2)}
      </pre>
    </form>
  )
}
