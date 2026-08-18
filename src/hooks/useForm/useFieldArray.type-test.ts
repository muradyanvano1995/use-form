/**
 * Compile-time checks for public useFieldArray APIs.
 * Checked by `tsc` / `npm run typecheck`; not executed by Vitest.
 */
import { useFieldArray, useForm, type FormControl, type UseFieldArrayReturn } from './index.ts'

type Product = { name: string; quantity: number }
type Values = {
  customer: { addresses: Array<{ city: string }> }
  products: Product[]
  tags: string[]
  documents: File[]
  note: string
}

declare const control: FormControl<Values>
declare const productArray: UseFieldArrayReturn<Product>

function validArrayPaths() {
  const form = useForm<Values>({
    defaultValues: {
      customer: { addresses: [] },
      products: [],
      tags: [],
      documents: [],
      note: '',
    },
  })
  const products = useFieldArray({ control: form.control, name: 'products' })
  const addresses = useFieldArray({ control: form.control, name: 'customer.addresses' })
  const tags = useFieldArray({ control: form.control, name: 'tags' })
  const documents = useFieldArray({ control: form.control, name: 'documents' })

  products.append({ name: 'Apple', quantity: 1 })
  products.update(0, { name: 'Banana', quantity: 2 })
  addresses.append({ city: 'Yerevan' })
  tags.append('fresh')
  documents.append(new File(['x'], 'document.txt'))

  const name: string = products.fields[0]!.value.name
  const quantity: number = products.fields[0]!.value.quantity
  const tag: string = tags.fields[0]!.value
  const document: File = documents.fields[0]!.value
  form.register('products.0.name')
  form.setValue('products.0.name', 'Updated')
  form.setValue('products.0.quantity', 3)
  form.setValue('tags.0', 'sale')
  form.setValue('documents.0', document)

  // @ts-expect-error — a scalar path is not a field-array path
  useFieldArray({ control: form.control, name: 'note' })
  // @ts-expect-error — object paths that are not arrays fail
  useFieldArray({ control: form.control, name: 'customer' })
  // @ts-expect-error — missing paths are rejected
  useFieldArray({ control: form.control, name: 'missing' })
  // @ts-expect-error — product items must have their required shape
  products.append({ name: 'missing quantity' })
  // @ts-expect-error — primitive array items must remain strings
  tags.append(1)
  // @ts-expect-error — indexed leaf type is string
  form.setValue('products.0.name', 1)
  // @ts-expect-error — indexed leaf type is number
  form.setValue('products.0.quantity', 'many')

  void name
  void quantity
  void tag
  void productArray
}

function contextWithExplicitGeneric() {
  const fromContext = useFieldArray<Values, 'products'>({ name: 'products' })
  const explicit = useFieldArray<Values, 'products'>({ control, name: 'products' })
  fromContext.prepend({ name: 'Context', quantity: 1 })
  explicit.replace([{ name: 'Explicit', quantity: 2 }])
}

void validArrayPaths
void contextWithExplicitGeneric

export {}
