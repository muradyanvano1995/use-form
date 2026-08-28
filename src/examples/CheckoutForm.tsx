import { useState } from 'react'
import {
  FormProvider,
  rules,
  useFieldArray,
  useForm,
  ValidationMode,
  type FieldRules,
  type UseFormReturn,
} from '../hooks/useForm'
import './examples.css'

type CheckoutValues = {
  contact: {
    email: string
    name: string
  }
  shipping: {
    city: string
    postalCode: string
  }
  items: Array<{ name: string; quantity: number }>
  invoice: File | null
  coupon: string
  acceptPolicies: boolean
}

const defaults: CheckoutValues = {
  contact: { email: '', name: '' },
  shipping: { city: '', postalCode: '' },
  items: [{ name: 'Notebook', quantity: 1 }],
  invoice: null,
  coupon: '',
  acceptPolicies: false,
}

const checkoutRules: FieldRules<CheckoutValues> = {
  'contact.email': [rules.required('Email is required'), rules.email()],
  'contact.name': [rules.required('Name is required')],
  'shipping.city': [rules.required('City is required')],
  'shipping.postalCode': [rules.required('Postal code is required')],
  items: [rules.minItems(1, 'Add at least one item')],
  acceptPolicies: [rules.accepted('Accept the refund policy to continue')],
}

export type CheckoutFormProps = {
  disabled?: boolean
  onSubmitSuccess?: (payload: { email: string; itemCount: number; coupon: string }) => void
  onSubmitInvalid?: (info: { fieldCount: number }) => void
  onItemAppend?: () => void
  onItemRemove?: (index: number) => void
}

export function CheckoutForm({
  disabled = false,
  onSubmitSuccess,
  onSubmitInvalid,
  onItemAppend,
  onItemRemove,
}: CheckoutFormProps = {}) {
  const [status, setStatus] = useState<string | undefined>()
  const form = useForm<CheckoutValues>({
    id: 'checkout',
    defaultValues: defaults,
    mode: ValidationMode.OnSubmit,
    rules: checkoutRules,
    validate: (values) => {
      const errors: Partial<Record<string, string>> = {}
      values.items.forEach((item, index) => {
        if (!item.name.trim()) errors[`items.${index}.name`] = 'Item name is required'
        if (!Number.isFinite(item.quantity) || item.quantity < 1) {
          errors[`items.${index}.quantity`] = 'Quantity must be at least 1'
        }
      })
      return errors
    },
    onSubmit: async (values, helpers) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 200)
      })
      if (values.coupon.trim().toUpperCase() === 'FAIL') {
        helpers.setErrors({ coupon: 'This coupon cannot be applied.' })
        helpers.setSubmitError('Checkout could not be completed.')
        setStatus(undefined)
        return
      }
      helpers.setSubmitError(undefined)
      setStatus('Order placed. File contents were not logged.')
      onSubmitSuccess?.({
        email: values.contact.email,
        itemCount: values.items.length,
        coupon: values.coupon,
      })
    },
  })

  return (
    <FormProvider control={form.control}>
      <form
        className="demo-form"
        onSubmit={(event) => {
          setStatus(undefined)
          void form.handleSubmit(event).then(() => {
            const fieldCount = Object.keys(form.getErrors()).length
            if (fieldCount > 0) onSubmitInvalid?.({ fieldCount })
          })
        }}
        noValidate
      >
        <div className="demo-form__header">
          <h2>Checkout</h2>
          <p>
            Nested contact and shipping, a field array, optional invoice file, and coupon{' '}
            <code>FAIL</code> for a backend field error (200ms).
          </p>
        </div>

        {form.submitError ? (
          <p className="demo-form__banner" role="alert">
            {form.submitError}
          </p>
        ) : null}
        {status ? (
          <p className="demo-form__success" role="status">
            {status}
          </p>
        ) : null}

        <fieldset disabled={disabled}>
          <legend>Contact</legend>
          <div className="demo-form__row">
            <div className="demo-form__field">
              <label htmlFor={form.getFieldId('contact.name')}>Name</label>
              <input {...form.register('contact.name')} autoComplete="name" />
              {form.errors['contact.name'] ? (
                <p id={form.getErrorId('contact.name')} className="demo-form__error">
                  {form.errors['contact.name']}
                </p>
              ) : null}
            </div>
            <div className="demo-form__field">
              <label htmlFor={form.getFieldId('contact.email')}>Email</label>
              <input {...form.register('contact.email')} type="email" autoComplete="email" />
              {form.errors['contact.email'] ? (
                <p id={form.getErrorId('contact.email')} className="demo-form__error">
                  {form.errors['contact.email']}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <fieldset disabled={disabled}>
          <legend>Shipping</legend>
          <div className="demo-form__row">
            <div className="demo-form__field">
              <label htmlFor={form.getFieldId('shipping.city')}>City</label>
              <input {...form.register('shipping.city')} autoComplete="address-level2" />
              {form.errors['shipping.city'] ? (
                <p id={form.getErrorId('shipping.city')} className="demo-form__error">
                  {form.errors['shipping.city']}
                </p>
              ) : null}
            </div>
            <div className="demo-form__field">
              <label htmlFor={form.getFieldId('shipping.postalCode')}>Postal code</label>
              <input {...form.register('shipping.postalCode')} autoComplete="postal-code" />
              {form.errors['shipping.postalCode'] ? (
                <p id={form.getErrorId('shipping.postalCode')} className="demo-form__error">
                  {form.errors['shipping.postalCode']}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <CheckoutItems
          form={form}
          disabled={disabled}
          onItemAppend={onItemAppend}
          onItemRemove={onItemRemove}
        />

        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('invoice')}>Invoice (optional)</label>
          <input {...form.register('invoice', { type: 'file' })} />
        </div>

        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('coupon')}>Coupon</label>
          <input {...form.register('coupon')} autoComplete="off" />
          {form.errors.coupon ? (
            <p id={form.getErrorId('coupon')} className="demo-form__error">
              {form.errors.coupon}
            </p>
          ) : null}
        </div>

        <div className="demo-form__field demo-form__field--inline">
          <input {...form.register('acceptPolicies')} type="checkbox" />
          <label htmlFor={form.getFieldId('acceptPolicies')}>I accept the refund policy</label>
        </div>
        {form.errors.acceptPolicies ? (
          <p id={form.getErrorId('acceptPolicies')} className="demo-form__error">
            {form.errors.acceptPolicies}
          </p>
        ) : null}

        <div className="demo-form__actions">
          <button type="submit" disabled={disabled || form.isSubmitting}>
            {form.isSubmitting ? 'Placing order…' : 'Place order'}
          </button>
          <button
            type="button"
            className="demo-form__secondary"
            disabled={disabled || form.isSubmitting}
            onClick={() => {
              setStatus(undefined)
              form.reset()
            }}
          >
            Reset
          </button>
        </div>
      </form>
    </FormProvider>
  )
}

function CheckoutItems({
  form,
  disabled,
  onItemAppend,
  onItemRemove,
}: {
  form: UseFormReturn<CheckoutValues>
  disabled: boolean
  onItemAppend?: () => void
  onItemRemove?: (index: number) => void
}) {
  const items = useFieldArray<CheckoutValues, 'items'>({ name: 'items' })

  return (
    <fieldset disabled={disabled}>
      <legend>Items</legend>
      {items.fields.map((field, index) => (
        <div key={field.key} className="demo-form__field-group">
          <div className="demo-form__row">
            <div className="demo-form__field">
              <label htmlFor={form.getFieldId(`items.${index}.name`)}>Item name</label>
              <input {...form.register(`items.${index}.name`)} />
              {form.errors[`items.${index}.name`] ? (
                <p id={form.getErrorId(`items.${index}.name`)} className="demo-form__error">
                  {form.errors[`items.${index}.name`]}
                </p>
              ) : null}
            </div>
            <div className="demo-form__field">
              <label htmlFor={form.getFieldId(`items.${index}.quantity`)}>Quantity</label>
              <input
                {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                type="number"
                min={1}
              />
              {form.errors[`items.${index}.quantity`] ? (
                <p id={form.getErrorId(`items.${index}.quantity`)} className="demo-form__error">
                  {form.errors[`items.${index}.quantity`]}
                </p>
              ) : null}
            </div>
          </div>
          <div className="demo-form__actions">
            <button
              type="button"
              className="demo-form__secondary"
              onClick={() => {
                items.remove(index)
                onItemRemove?.(index)
              }}
            >
              Remove item {index + 1}
            </button>
            <button
              type="button"
              className="demo-form__secondary"
              disabled={index === 0}
              onClick={() => items.move(index, index - 1)}
            >
              Move item {index + 1} up
            </button>
          </div>
        </div>
      ))}
      {form.errors.items ? <p className="demo-form__error">{form.errors.items}</p> : null}
      <div className="demo-form__actions">
        <button
          type="button"
          onClick={() => {
            items.append({ name: '', quantity: 1 })
            onItemAppend?.()
          }}
        >
          Add item
        </button>
      </div>
    </fieldset>
  )
}
