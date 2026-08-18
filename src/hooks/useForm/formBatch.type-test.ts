/**
 * Compile-time type tests for `form.batch`.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import { type BatchOptions, type UseFormReturn } from './index.ts'
// @ts-expect-error — batch queue helpers are not public
import { createBatchValidationQueue as _queue } from './index.ts'
// @ts-expect-error — store transactions are not public
import { createFormStore as _store } from './index.ts'

type Sample = { city: string; country: string }

declare const form: UseFormReturn<Sample>

const options: BatchOptions = { shouldValidate: true }
void options

void form.batch(() => {
  form.setValue('city', 'Yerevan')
  form.setValue('country', 'Armenia')
})

void form.batch(
  () => {
    form.setValue('city', 'Gyumri')
  },
  { shouldValidate: false },
)

const _asyncCallback: () => Promise<void> = async () => {
  form.setValue('city', 'Yerevan')
}
void _asyncCallback
// Runtime rejects async callbacks. `() => void` cannot reliably reject
// `async` functions at compile time because TypeScript treats Promise returns
// as assignable to void.

// @ts-expect-error — unknown batch option
void form.batch(() => undefined, { debounce: 10 })

void _queue
void _store

export {}
