import {
  FormProvider,
  rules,
  useFieldArray,
  useForm,
  useFormState,
  ValidationMode,
  type FieldErrors,
  type FieldRules,
  type UseFormReturn,
} from '../hooks/useForm'
import './examples.css'

type OrderFormValues = {
  customer: {
    name: string
  }
  products: Array<{
    name: string
    quantity: number
    attachment: File | null
  }>
}

const defaultValues: OrderFormValues = {
  customer: { name: '' },
  products: [{ name: '', quantity: 1, attachment: null }],
}

const formRules: FieldRules<OrderFormValues> = {
  'customer.name': [rules.required('Customer name is required')],
  products: [rules.minItems(1, 'Add at least one product')],
}

function ProductRows({ form }: { form: UseFormReturn<OrderFormValues> }) {
  const products = useFieldArray<OrderFormValues, 'products'>({ name: 'products' })

  return (
    <div className="demo-form__stack">
      {products.fields.map((field, index) => (
        <div key={field.key} className="demo-form__field-group">
          <label htmlFor={form.getFieldId(`products.${index}.name`)}>Name</label>
          <input {...form.register(`products.${index}.name`, { required: true })} />
          {form.errors[`products.${index}.name`] ? (
            <p
              id={form.getErrorId(`products.${index}.name`)}
              className="demo-form__error"
              role="alert"
            >
              {form.errors[`products.${index}.name`]}
            </p>
          ) : null}

          <label htmlFor={form.getFieldId(`products.${index}.quantity`)}>Quantity</label>
          <input
            {...form.register(`products.${index}.quantity`, {
              valueAsNumber: true,
              required: true,
            })}
          />
          {form.errors[`products.${index}.quantity`] ? (
            <p
              id={form.getErrorId(`products.${index}.quantity`)}
              className="demo-form__error"
              role="alert"
            >
              {form.errors[`products.${index}.quantity`]}
            </p>
          ) : null}

          <label htmlFor={form.getFieldId(`products.${index}.attachment`)}>Attachment</label>
          <input {...form.register(`products.${index}.attachment`, { type: 'file' })} />

          <div className="demo-form__actions">
            <button type="button" onClick={() => products.remove(index)}>
              Remove
            </button>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => products.move(index, index - 1)}
            >
              Up
            </button>
            <button
              type="button"
              disabled={index >= products.fields.length - 1}
              onClick={() => products.move(index, index + 1)}
            >
              Down
            </button>
            {index > 0 ? (
              <button type="button" onClick={() => products.swap(index, index - 1)}>
                Swap up
              </button>
            ) : null}
          </div>
        </div>
      ))}

      <div className="demo-form__actions">
        <button
          type="button"
          onClick={() =>
            products.append(
              { name: '', quantity: 1, attachment: null },
              { shouldFocus: true, focusName: 'name' },
            )
          }
        >
          Append
        </button>
        <button
          type="button"
          onClick={() =>
            products.insert(
              0,
              { name: '', quantity: 1, attachment: null },
              { shouldFocus: true, focusName: 'name' },
            )
          }
        >
          Insert first
        </button>
        <button
          type="button"
          onClick={() => {
            const first = products.fields[0]
            if (first) {
              products.update(0, {
                ...first.value,
                quantity: first.value.quantity + 1,
              })
            }
          }}
        >
          Bump first quantity
        </button>
        <button type="button" onClick={() => products.clear()}>
          Clear
        </button>
      </div>

      {form.errors.products ? (
        <p className="demo-form__error" role="alert">
          {form.errors.products}
        </p>
      ) : null}
    </div>
  )
}

function OrderStatus({ form }: { form: UseFormReturn<OrderFormValues> }) {
  const isDirty = useFormState<OrderFormValues, boolean>({
    selector: (state) => state.isDirty,
  })
  const isSubmitting = useFormState<OrderFormValues, boolean>({
    selector: (state) => state.isSubmitting,
  })

  return (
    <p className="demo-form__meta">
      Dirty: {isDirty ? 'yes' : 'no'} · Submitting: {isSubmitting ? 'yes' : 'no'} · Product errors:{' '}
      {Object.keys(form.errors).filter((key) => key.startsWith('products')).length}
    </p>
  )
}

export function OrderItemsForm() {
  const form = useForm<OrderFormValues>({
    defaultValues,
    rules: formRules,
    mode: ValidationMode.OnSubmit,
    validate: (values) => {
      const errors: FieldErrors<OrderFormValues> = {}
      values.products.forEach((item, index) => {
        if (!item.name.trim()) {
          errors[`products.${index}.name`] = 'Product name is required'
        }
        if (!Number.isFinite(item.quantity) || item.quantity < 1) {
          errors[`products.${index}.quantity`] = 'Quantity must be at least 1'
        }
      })
      return errors
    },
    onSubmit: async (values) => {
      console.info('order submit', values)
    },
  })

  return (
    <section className="demo-form">
      <h2>Order items (field arrays)</h2>
      <FormProvider control={form.control}>
        <form onSubmit={form.handleSubmit} noValidate>
          <div className="demo-form__field">
            <label htmlFor={form.getFieldId('customer.name')}>Customer</label>
            <input {...form.register('customer.name', { required: true })} />
            {form.errors['customer.name'] ? (
              <p id={form.getErrorId('customer.name')} className="demo-form__error" role="alert">
                {form.errors['customer.name']}
              </p>
            ) : null}
          </div>

          <h3>Products</h3>
          <ProductRows form={form} />
          <OrderStatus form={form} />

          <div className="demo-form__actions">
            <button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Submitting…' : 'Submit order'}
            </button>
            <button type="button" onClick={() => form.reset()}>
              Reset
            </button>
          </div>
          {form.submitError ? (
            <p className="demo-form__error" role="alert">
              {form.submitError}
            </p>
          ) : null}
        </form>
      </FormProvider>
    </section>
  )
}
