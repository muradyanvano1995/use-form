/**
 * Compile-time checks for public schema-resolver APIs.
 * Checked by `tsc` / `npm run typecheck`; not executed by Vitest.
 */
import { useForm, type FormResolver, type ResolverFailure, type ResolverSuccess } from '../index.ts'

type Input = {
  age: string
  profile: { name: string }
}
type Output = {
  age: number
  profile: { name: string }
}
type Context = { minimumAge: number }

const defaults: Input = { age: '18', profile: { name: 'Vano' } }

const success: ResolverSuccess<Output> = {
  success: true,
  values: { age: 18, profile: { name: 'Vano' } },
}
const failure: ResolverFailure<Input> = {
  success: false,
  errors: { age: 'Invalid age', 'profile.name': 'Required' },
}

const resolver: FormResolver<Input, Output, Context> = (values, options) => {
  const minimumAge: number = options.context.minimumAge
  const currentAge: string = values.age
  void minimumAge
  void currentAge
  return Number(values.age) >= options.context.minimumAge ? success : failure
}

function defaultGenericsStillWork() {
  const form = useForm<Input>({
    defaultValues: defaults,
    onSubmit: (values) => {
      const age: string = values.age
      void age
    },
  })
  const age: string = form.values.age
  form.setValue('age', '21')
  // @ts-expect-error — input form state keeps age as a string
  form.setValue('age', 21)
  void age
}

function transformedOutputAndContextAreTyped() {
  const form = useForm<Input, Output, Context>({
    defaultValues: defaults,
    resolver,
    resolverContext: { minimumAge: 18 },
    onSubmit: (values, helpers) => {
      const age: number = values.age
      helpers.setError('age', 'Server error')
      // @ts-expect-error — transformed submit output age is a number
      const invalid: string = values.age
      void age
      void invalid
    },
  })
  const liveAge: string = form.values.age
  form.setValue('profile.name', 'Ada')
  // @ts-expect-error — only valid input-shaped error paths are accepted
  form.setError('missing', 'Nope')
  // @ts-expect-error — resolver failures only accept input-shaped error paths
  const badFailure: ResolverFailure<Input> = { success: false, errors: { missing: 'Nope' } }
  void liveAge
  void badFailure
}

void defaultGenericsStillWork
void transformedOutputAndContextAreTyped

export {}
