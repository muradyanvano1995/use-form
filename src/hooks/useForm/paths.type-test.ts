/**
 * Compile-time type tests for nested FieldPath / FieldPathValue APIs.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  rules,
  type DeepPartial,
  type FieldPath,
  type FieldPathValue,
  type FieldRules,
  type UseFormOptions,
  type UseFormReturn,
} from './index.ts'

type CheckoutFormValues = {
  customer: {
    name: string
    email: string
  }
  address: {
    city: string
    postalCode: string
    coordinates: {
      latitude: number
    }
  }
  acceptTerms: boolean
  age: number
}

type _City = FieldPathValue<CheckoutFormValues, 'address.city'>
type _Latitude = FieldPathValue<CheckoutFormValues, 'address.coordinates.latitude'>
type _Accept = FieldPathValue<CheckoutFormValues, 'acceptTerms'>

const _cityCheck: _City = 'Yerevan'
const _latCheck: _Latitude = 40.1
const _acceptCheck: _Accept = true
void _cityCheck
void _latCheck
void _acceptCheck

type _Paths = FieldPath<CheckoutFormValues>
const _path: _Paths = 'address.city'
void _path

const defaults: CheckoutFormValues = {
  customer: { name: '', email: '' },
  address: { city: '', postalCode: '', coordinates: { latitude: 0 } },
  acceptTerms: false,
  age: 18,
}

const _rules: FieldRules<CheckoutFormValues> = {
  'customer.name': [rules.required('Customer name is required')],
  'customer.email': [rules.required(), rules.email()],
  'address.city': [
    rules.required('City is required'),
    (city, values) => {
      const _c: string = city
      const _v: Readonly<CheckoutFormValues> = values
      void _c
      void _v
      return city.length >= 2 ? undefined : 'City name is too short'
    },
  ],
  'address.coordinates.latitude': [rules.min(-90), rules.max(90)],
  acceptTerms: rules.accepted(),
  age: [rules.min(18)],
}

const _partial: DeepPartial<CheckoutFormValues> = {
  address: { city: 'Yerevan' },
}

const _options: UseFormOptions<CheckoutFormValues> = {
  defaultValues: defaults,
  rules: _rules,
}

declare const form: UseFormReturn<CheckoutFormValues>

form.setValue('address.city', 'Yerevan')
form.setValue('address.coordinates.latitude', 40)
form.setValue('acceptTerms', true)
form.register('address.city')
form.register('acceptTerms')
form.setError('address.city', 'Invalid')
form.clearError('address.city')
void form.validateField('address.city')
form.resetField('address.city')
form.getFieldId('address.city')
form.getErrorId('address.city')
form.setValues({ address: { city: 'Gyumri' } })

// @ts-expect-error — number is not assignable to string city
form.setValue('address.city', 123)

// @ts-expect-error — unknown nested path
form.setValue('address.unknown', '')

// @ts-expect-error — missing root path
form.setValue('missing.path', '')

// @ts-expect-error — unknown nested path
form.register('address.unknown')

// @ts-expect-error — unknown nested path
form.setError('address.unknown', 'Invalid')

// @ts-expect-error — boolean required
form.setValue('acceptTerms', 'yes')

void _partial
void _options

export {}
