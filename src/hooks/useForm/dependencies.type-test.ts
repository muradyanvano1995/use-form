/** Compile-time coverage for dependent-field configuration. */
import { type DependencyMode, type FieldDependencies, type UseFormOptions } from './index.ts'

type Values = {
  password: string
  confirmPassword: string
  address: {
    country: string
    postalCode: string
  }
}

const dependencies = {
  confirmPassword: ['password'],
  'address.postalCode': ['address.country'],
} satisfies FieldDependencies<Values>

const mode: DependencyMode = 'whenTouched'

const options: UseFormOptions<Values> = {
  defaultValues: {
    password: '',
    confirmPassword: '',
    address: { country: '', postalCode: '' },
  },
  dependencies,
  dependencyMode: mode,
}

// @ts-expect-error — unknown dependent path
const invalidDependent: FieldDependencies<Values> = { confirmation: ['password'] }

// @ts-expect-error — unknown source path
const invalidSource: FieldDependencies<Values> = { confirmPassword: ['confirmation'] }

// @ts-expect-error — unsupported dependency mode
const invalidMode: DependencyMode = 'eager'

void options
void invalidDependent
void invalidSource
void invalidMode
