import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FormProvider } from './FormProvider.tsx'
import { useFieldArray } from './useFieldArray.ts'
import { useForm } from './useForm.ts'
import { rules } from './validation/builtInRules.ts'

type Product = { name: string; quantity: number }
type Values = {
  customer: { name: string; addresses: Array<{ city: string }> }
  products: Product[]
  tags: string[]
  documents: File[]
  otherProducts: Product[]
}

const defaults: Values = {
  customer: { name: 'Vano', addresses: [{ city: 'Yerevan' }] },
  products: [
    { name: 'Apple', quantity: 1 },
    { name: 'Banana', quantity: 2 },
  ],
  tags: ['fresh'],
  documents: [],
  otherProducts: [{ name: 'Other', quantity: 7 }],
}

const product = (name: string, quantity = 1): Product => ({ name, quantity })
const file = (name: string) => new File(['content'], name, { type: 'text/plain' })

describe('useFieldArray', () => {
  describe('initialization', () => {
    it('supports empty arrays and reads existing and nested defaults', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: { ...defaults, products: [] } })
        const products = useFieldArray({ control: form.control, name: 'products' })
        const addresses = useFieldArray({ control: form.control, name: 'customer.addresses' })
        return { form, products, addresses }
      })

      expect(result.current.products.fields).toEqual([])
      expect(result.current.addresses.fields.map((field) => field.value)).toEqual([
        { city: 'Yerevan' },
      ])
      expect(result.current.addresses.fields[0]?.key).toMatch(/^fa-\d+$/)
    })
  })

  describe('append and prepend', () => {
    it('adds values immutably, preserves siblings, and can touch and validate', async () => {
      const validate = vi.fn()
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults, validate })
        const array = useFieldArray({ control: form.control, name: 'products' })
        return { form, array }
      })
      const previous = result.current.form.values.products

      await act(async () => {
        result.current.array.append(product('Cherry', 3), {
          shouldTouch: true,
          shouldValidate: true,
        })
        result.current.array.prepend(product('Apricot', 4))
      })

      expect(result.current.form.values.products).toEqual([
        product('Apricot', 4),
        product('Apple'),
        product('Banana', 2),
        product('Cherry', 3),
      ])
      expect(result.current.form.values.products).not.toBe(previous)
      expect(result.current.form.values.customer.name).toBe('Vano')
      expect(result.current.form.values.otherProducts).toEqual(defaults.otherProducts)
      expect(result.current.form.touched.products).toBe(true)
      expect(result.current.form.isDirty).toBe(true)
      expect(validate).toHaveBeenCalled()

      act(() => result.current.form.reset())
      expect(result.current.form.isDirty).toBe(false)
    })

    it('moves localized structured details with the logical item', async () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({
          defaultValues: defaults,
          fieldLabels: {
            'products.0.name': 'First product name',
            'products.1.name': 'Second product name',
          },
          validationMessages: {
            required: ({ label }) => `${label} is required`,
          },
          rules: {
            'products.0.name': rules.required(),
            'products.1.name': rules.required(),
          },
        })
        const array = useFieldArray({ control: form.control, name: 'products' })
        return { form, array }
      })

      act(() => {
        result.current.form.setValue('products.1.name', '')
      })
      await act(async () => {
        await result.current.form.validateField('products.1.name')
      })
      expect(result.current.form.errors['products.1.name']).toBe('Second product name is required')

      act(() => {
        result.current.array.remove(0)
      })
      expect(result.current.form.errors['products.0.name']).toBe('Second product name is required')
      expect(result.current.form.errorDetails['products.0.name']?.type).toBe('required')
    })
  })

  describe('insert and update', () => {
    it('inserts at the length, updates in place, and rejects invalid indices', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults })
        return { form, array: useFieldArray({ control: form.control, name: 'products' }) }
      })
      const initialKey = result.current.array.fields[0]?.key

      act(() => {
        result.current.array.insert(2, product('Cherry', 3))
        result.current.array.update(0, product('Updated', 9))
      })
      expect(result.current.form.values.products).toEqual([
        product('Updated', 9),
        product('Banana', 2),
        product('Cherry', 3),
      ])
      expect(result.current.array.fields[0]?.key).toBe(initialKey)

      expect(() => act(() => result.current.array.insert(4, product('bad')))).toThrow(RangeError)
      expect(() => act(() => result.current.array.update(-1, product('bad')))).toThrow(RangeError)
      expect(() => act(() => result.current.array.update(3, product('bad')))).toThrow(RangeError)
    })
  })

  describe('remove and clear', () => {
    it('removes items, drops their key, clears all items, and rejects invalid indices', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults })
        return useFieldArray({ control: form.control, name: 'products' })
      })
      const removed = result.current.fields[0]?.key

      act(() => result.current.remove(0))
      expect(result.current.fields[0]?.value.name).toBe('Banana')
      expect(result.current.fields.map((field) => field.key)).not.toContain(removed)
      expect(() => act(() => result.current.remove(1))).toThrow(RangeError)

      act(() => result.current.clear())
      expect(result.current.fields).toEqual([])
    })
  })

  describe('swap and move', () => {
    it('moves both item values and their stable keys and validates bounds', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({
          defaultValues: { ...defaults, products: [product('A'), product('B'), product('C')] },
        })
        return useFieldArray({ control: form.control, name: 'products' })
      })
      const keys = result.current.fields.map((field) => field.key)

      act(() => result.current.swap(0, 2))
      expect(result.current.fields.map((field) => field.value.name)).toEqual(['C', 'B', 'A'])
      expect(result.current.fields.map((field) => field.key)).toEqual([keys[2], keys[1], keys[0]])

      act(() => result.current.move(2, 1))
      expect(result.current.fields.map((field) => field.value.name)).toEqual(['C', 'A', 'B'])
      expect(result.current.fields.map((field) => field.key)).toEqual([keys[2], keys[0], keys[1]])
      expect(() => act(() => result.current.swap(0, 3))).toThrow(RangeError)
      expect(() => act(() => result.current.move(3, 0))).toThrow(RangeError)
    })
  })

  describe('stable keys', () => {
    it('preserves update keys, allocates appended keys, and regenerates replace keys', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults })
        return useFieldArray({ control: form.control, name: 'products' })
      })
      const before = result.current.fields.map((field) => field.key)

      act(() => {
        result.current.update(0, product('Updated'))
        result.current.append(product('New'))
      })
      expect(result.current.fields.map((field) => field.key)).toEqual([
        before[0],
        before[1],
        expect.any(String),
      ])

      act(() => result.current.replace([product('Replacement')]))
      expect(result.current.fields[0]?.key).not.toBe(before[0])
    })
  })

  describe('metadata reindexing', () => {
    it('reindexes errors and touched paths after removal and recomputes dirty state', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults })
        const array = useFieldArray({ control: form.control, name: 'products' })
        return { form, array }
      })

      act(() => {
        result.current.form.setError('products.1.quantity', 'too low')
        result.current.form.setValue('products.1.quantity', 5, { shouldTouch: true })
        result.current.array.remove(0)
      })
      expect(result.current.form.errors['products.0.quantity']).toBe('too low')
      expect(result.current.form.errorDetails['products.0.quantity']?.message).toBe('too low')
      expect(result.current.form.errorDetails['products.0.quantity']?.source).toBe('manual')
      expect(result.current.form.errors['products.1.quantity']).toBeUndefined()
      expect(result.current.form.errorDetails['products.1.quantity']).toBeUndefined()
      expect(result.current.form.touched['products.0.quantity']).toBe(true)
      expect(result.current.form.isDirty).toBe(true)

      act(() => result.current.form.reset())
      expect(result.current.form.isDirty).toBe(false)
    })

    it('invalidates a slow indexed validation when structural changes remap it', async () => {
      let release!: (message: string | undefined) => void
      const pending = new Promise<string | undefined>((resolve) => {
        release = resolve
      })
      const { result } = renderHook(() => {
        const form = useForm<Values>({
          defaultValues: defaults,
          fieldValidators: { 'products.1.name': async () => pending },
        })
        return { form, array: useFieldArray({ control: form.control, name: 'products' }) }
      })

      let validation!: Promise<boolean>
      act(() => {
        validation = result.current.form.validateField('products.1.name')
        result.current.array.remove(0)
      })
      release('stale')
      await act(async () => {
        await validation
      })
      expect(result.current.form.errors['products.0.name']).toBeUndefined()
      expect(result.current.form.errors['products.1.name']).toBeUndefined()
    })
  })

  describe('validation', () => {
    it('runs array mutation validation and clears indexed metadata on replace', async () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({
          defaultValues: defaults,
          rules: { 'products.0.name': [rulesRequired] },
        })
        return { form, array: useFieldArray({ control: form.control, name: 'products' }) }
      })
      act(() => result.current.form.setError('products.1.name', 'old'))

      await act(async () => {
        result.current.array.replace([product('')], { shouldValidate: true })
      })
      await waitFor(() => expect(result.current.form.errors['products.0.name']).toBe('required'))
      expect(result.current.form.errors['products.1.name']).toBeUndefined()
    })
  })

  describe('reset', () => {
    it('syncs fields after reset, new defaults, and resetField', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults })
        return { form, array: useFieldArray({ control: form.control, name: 'products' }) }
      })
      act(() => result.current.array.append(product('Extra')))
      const changedKey = result.current.array.fields[0]?.key

      act(() => result.current.form.reset())
      expect(result.current.array.fields.map((field) => field.value.name)).toEqual([
        'Apple',
        'Banana',
      ])
      expect(result.current.array.fields[0]?.key).not.toBe(changedKey)

      act(() => result.current.form.reset({ products: [product('New default')] }))
      expect(result.current.array.fields.map((field) => field.value.name)).toEqual(['New default'])
      act(() => result.current.array.append(product('Temporary')))
      act(() => result.current.form.resetField('products'))
      expect(result.current.array.fields.map((field) => field.value.name)).toEqual(['New default'])
    })
  })

  describe('subscriptions', () => {
    it('keeps multiple consumers synchronized and isolates other arrays', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults })
        const first = useFieldArray({ control: form.control, name: 'products' })
        const second = useFieldArray({ control: form.control, name: 'products' })
        const tags = useFieldArray({ control: form.control, name: 'tags' })
        return { form, first, second, tags }
      })
      const productFields = result.current.first.fields

      act(() => result.current.first.append(product('Shared')))
      expect(result.current.second.fields.map((field) => field.value.name)).toEqual([
        'Apple',
        'Banana',
        'Shared',
      ])
      const fieldsAfterProductChange = result.current.first.fields
      act(() => result.current.tags.append('other'))
      expect(productFields).not.toBe(fieldsAfterProductChange)
      expect(result.current.first.fields).toBe(fieldsAfterProductChange)
      expect(result.current.first.fields.map((field) => field.value.name)).toEqual([
        'Apple',
        'Banana',
        'Shared',
      ])
    })
  })

  describe('context', () => {
    it('uses context, honors nested providers, and lets explicit control override context', () => {
      function Products({ control }: { control?: ReturnType<typeof useForm<Values>>['control'] }) {
        const array = useFieldArray<Values, 'products'>({ name: 'products', control })
        return (
          <span data-testid={control ? 'explicit' : 'context'}>{array.fields[0]?.value.name}</span>
        )
      }
      function Harness() {
        const outer = useForm<Values>({ defaultValues: defaults })
        const inner = useForm<Values>({
          defaultValues: { ...defaults, products: [product('Inner')] },
        })
        return (
          <FormProvider control={outer.control}>
            <Products />
            <FormProvider control={inner.control}>
              <Products />
              <Products control={outer.control} />
            </FormProvider>
          </FormProvider>
        )
      }
      render(<Harness />)
      expect(screen.getAllByTestId('context').map((node) => node.textContent)).toEqual([
        'Apple',
        'Inner',
      ])
      expect(screen.getByTestId('explicit')).toHaveTextContent('Apple')
    })
  })

  describe('primitive arrays', () => {
    it('appends and updates primitive items', () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults })
        return { form, array: useFieldArray({ control: form.control, name: 'tags' }) }
      })
      act(() => {
        result.current.array.append('sale')
        result.current.array.update(0, 'organic')
      })
      expect(result.current.form.values.tags).toEqual(['organic', 'sale'])
    })
  })

  describe('file arrays', () => {
    it('preserves File object identity', () => {
      const first = file('first.txt')
      const second = file('second.txt')
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: { ...defaults, documents: [first] } })
        return { form, array: useFieldArray({ control: form.control, name: 'documents' }) }
      })
      act(() => result.current.array.append(second))
      expect(result.current.form.values.documents[0]).toBe(first)
      expect(result.current.form.values.documents[1]).toBe(second)
    })
  })

  describe('lifecycle', () => {
    it('works in Strict Mode, submits values without keys, and cleans up after unmount', async () => {
      const onSubmit = vi.fn()
      const { result, unmount } = renderHook(
        () => {
          const form = useForm<Values>({ defaultValues: defaults, onSubmit })
          return { form, array: useFieldArray({ control: form.control, name: 'products' }) }
        },
        { wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode> },
      )
      act(() => result.current.array.append(product('Submitted')))
      await act(async () => {
        await result.current.form.handleSubmit()
      })
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [product('Apple'), product('Banana', 2), product('Submitted')],
        }),
        expect.any(Object),
      )
      expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('key')
      expect(onSubmit.mock.calls[0]?.[0].products[0]).not.toHaveProperty('key')
      expect(() => unmount()).not.toThrow()
    })

    it('cancels scheduled append focus after an immediate structural mutation', async () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({ defaultValues: defaults })
        return { form, array: useFieldArray({ control: form.control, name: 'products' }) }
      })
      const focus = vi.fn()
      const props = result.current.form.register('products.2.name')
      const input = document.createElement('input')
      input.focus = focus

      act(() => {
        props.ref(input)
        result.current.array.append(product('Focused'), {
          shouldFocus: true,
          focusIndex: 2,
          focusName: 'name',
        })
        result.current.array.remove(2)
      })
      await act(async () => {
        await Promise.resolve()
      })

      expect(focus).not.toHaveBeenCalled()
    })

    it('does not drop moved item values when shouldUnregister is true', async () => {
      const { result } = renderHook(() => {
        const form = useForm<Values>({
          defaultValues: defaults,
          shouldUnregister: true,
        })
        return { form, array: useFieldArray({ control: form.control, name: 'products' }) }
      })

      const first = document.createElement('input')
      const second = document.createElement('input')
      act(() => {
        result.current.form.register('products.0.name').ref(first)
        result.current.form.register('products.1.name').ref(second)
      })

      act(() => {
        result.current.array.move(0, 1)
      })
      await act(async () => {
        await Promise.resolve()
      })

      expect(result.current.form.values.products.map((item) => item.name)).toEqual([
        'Banana',
        'Apple',
      ])
    })
  })
})

function rulesRequired(value: string): string | undefined {
  return value ? undefined : 'required'
}
