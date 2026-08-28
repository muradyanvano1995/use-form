import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  ASYNC_BATCH_CALLBACK_ERROR,
  clearQueuedValidation,
  createBatchValidationQueue,
  dropQueuedPathsUnder,
  isThenable,
  queueFieldValidation,
  queueSourcePath,
} from './formBatch.ts'
import { getControlInternals } from './formStore.ts'
import { useFieldArray } from './useFieldArray.ts'
import { useForm } from './useForm.ts'
import { rules } from './validation'
import { ValidationMode } from './validation'
import { createAsyncRule } from './validation'

type AddressForm = {
  address: {
    city: string
    country: string
    postalCode: string
  }
  email: string
}

const addressDefaults: AddressForm = {
  address: { city: '', country: '', postalCode: '' },
  email: '',
}

describe('formBatch helpers', () => {
  describe('queue', () => {
    it('deduplicates paths and drops descendants', () => {
      const queue = createBatchValidationQueue()
      queueFieldValidation(queue, 'email')
      queueFieldValidation(queue, 'email')
      queueSourcePath(queue, 'address.city')
      dropQueuedPathsUnder(queue, 'address')
      expect(queue.fieldPaths).toEqual(['email'])
      expect(queue.sourcePaths).toEqual([])
      clearQueuedValidation(queue)
      expect(queue.fieldPaths).toEqual([])
      expect(queue.formRequested).toBe(false)
    })

    it('detects thenables', () => {
      expect(isThenable(Promise.resolve())).toBe(true)
      expect(isThenable({ then: () => undefined })).toBe(true)
      expect(isThenable(undefined)).toBe(false)
    })
  })
})

describe('form.batch', () => {
  describe('notifications', () => {
    it('applies mutations in order and notifies once', async () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      const listener = vi.fn()
      getControlInternals(result.current.control).store.subscribe(listener)

      await act(async () => {
        await result.current.batch(() => {
          result.current.setValue('address.city', 'Yerevan')
          expect(result.current.getValue('address.city')).toBe('Yerevan')
          result.current.setValue('address.country', 'Armenia')
        })
      })

      expect(result.current.getValues().address).toEqual({
        city: 'Yerevan',
        country: 'Armenia',
        postalCode: '',
      })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('does not notify when the final snapshot is unchanged', async () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      const listener = vi.fn()
      getControlInternals(result.current.control).store.subscribe(listener)

      await act(async () => {
        await result.current.batch(() => {
          result.current.getValues()
        })
      })

      expect(listener).not.toHaveBeenCalled()
    })

    it('notifies after change-and-restore because setValue allocates a new snapshot', async () => {
      const { result } = renderHook(() =>
        useForm<{ count: number }>({ defaultValues: { count: 1 } }),
      )
      const listener = vi.fn()
      getControlInternals(result.current.control).store.subscribe(listener)

      await act(async () => {
        await result.current.batch(() => {
          result.current.setValue('count', 2)
          result.current.setValue('count', 1)
        })
      })

      expect(result.current.getValue('count')).toBe(1)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('keeps nested batches from notifying early', async () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      const listener = vi.fn()
      getControlInternals(result.current.control).store.subscribe(listener)

      await act(async () => {
        await result.current.batch(() => {
          result.current.setValue('address.city', 'Yerevan')
          void result.current.batch(() => {
            result.current.setValue('address.country', 'Armenia')
          })
          result.current.setValue('address.postalCode', '0001')
          expect(listener).not.toHaveBeenCalled()
        })
      })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(result.current.getDirtyValues()).toEqual({
        address: { city: 'Yerevan', country: 'Armenia', postalCode: '0001' },
      })
    })
  })

  describe('exceptions', () => {
    it('keeps applied mutations, flushes notification, and restores depth', () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      const listener = vi.fn()
      const store = getControlInternals(result.current.control).store
      store.subscribe(listener)

      expect(() => {
        void result.current.batch(() => {
          result.current.setValue('address.city', 'Yerevan')
          throw new Error('boom')
        })
      }).toThrow('boom')

      expect(store.getTransactionDepth()).toBe(0)
      expect(result.current.getValue('address.city')).toBe('Yerevan')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('rethrows the exact string thrown by the callback', () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      const store = getControlInternals(result.current.control).store
      const listener = vi.fn()
      store.subscribe(listener)

      let caught: unknown
      try {
        void result.current.batch(() => {
          result.current.setValue('address.city', 'Yerevan')
          // Intentionally throw a non-Error to assert exact rethrow identity.
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- contract: preserve non-Error throws
          throw 'string-boom'
        })
      } catch (error) {
        caught = error
      }

      expect(caught).toBe('string-boom')
      expect(store.getTransactionDepth()).toBe(0)
      expect(result.current.getValue('address.city')).toBe('Yerevan')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('rethrows the exact plain object thrown by the callback', () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      const store = getControlInternals(result.current.control).store
      const payload = { code: 'BATCH_FAIL', ok: false }
      const listener = vi.fn()
      store.subscribe(listener)

      let caught: unknown
      try {
        void result.current.batch(() => {
          result.current.setValue('email', 'kept@example.com')
          // Intentionally throw a plain object to assert exact rethrow identity.
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- contract: preserve non-Error throws
          throw payload
        })
      } catch (error) {
        caught = error
      }

      expect(caught).toBe(payload)
      expect(store.getTransactionDepth()).toBe(0)
      expect(result.current.getValue('email')).toBe('kept@example.com')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('cancels queued validation when the callback throws', async () => {
      const { result } = renderHook(() =>
        useForm<AddressForm>({
          defaultValues: addressDefaults,
          mode: 'onChange',
          rules: {
            email: [(value) => (value === 'bad' ? 'Invalid email' : undefined)],
          },
        }),
      )
      const store = getControlInternals(result.current.control).store

      expect(() => {
        void result.current.batch(() => {
          result.current.setValue('email', 'bad')
          throw new Error('stop')
        })
      }).toThrow('stop')

      expect(store.getTransactionDepth()).toBe(0)
      await Promise.resolve()
      expect(result.current.getErrors().email).toBeUndefined()
    })

    it('rejects async callbacks', () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      expect(() => {
        void result.current.batch((async () => {
          result.current.setValue('address.city', 'Yerevan')
        }) as never)
      }).toThrow(ASYNC_BATCH_CALLBACK_ERROR)
      expect(getControlInternals(result.current.control).store.getTransactionDepth()).toBe(0)
      expect(result.current.getValue('address.city')).toBe('Yerevan')
    })

    it('keeps pre-await mutations when an async callback is rejected', () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      expect(() => {
        void result.current.batch((async () => {
          result.current.setValue('email', 'kept@example.com')
          await Promise.resolve()
          result.current.setValue('address.city', 'should-not-batch')
        }) as never)
      }).toThrow(/does not roll back/)
      expect(getControlInternals(result.current.control).store.getTransactionDepth()).toBe(0)
      expect(result.current.getValue('email')).toBe('kept@example.com')
    })
  })

  describe('lifecycle operations', () => {
    it('rejects validate() inside a batch synchronously', () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      const store = getControlInternals(result.current.control).store

      expect(() => {
        void result.current.batch(() => {
          result.current.setValue('email', 'test@example.com')
          void result.current.validate()
        })
      }).toThrow(
        'validate() cannot be called inside form.batch(). Complete the batch first, then validate.',
      )

      expect(store.getTransactionDepth()).toBe(0)
      expect(result.current.getValue('email')).toBe('test@example.com')
    })

    it('rejects validateField() inside a batch', () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      expect(() => {
        void result.current.batch(() => {
          void result.current.validateField('email')
        })
      }).toThrow(/validateField\(\) cannot be called inside form.batch()/)
      expect(getControlInternals(result.current.control).store.getTransactionDepth()).toBe(0)
    })

    it('rejects handleSubmit() inside a batch', () => {
      const { result } = renderHook(() => useForm<AddressForm>({ defaultValues: addressDefaults }))
      expect(() => {
        void result.current.batch(() => {
          void result.current.handleSubmit()
        })
      }).toThrow(/handleSubmit\(\) cannot be called inside form.batch()/)
      expect(getControlInternals(result.current.control).store.getTransactionDepth()).toBe(0)
    })

    it('rejects reloadDefaultValues() inside a batch and restores depth', async () => {
      const loader = vi.fn(async () => addressDefaults)
      const { result } = renderHook(() =>
        useForm<AddressForm>({
          defaultValues: addressDefaults,
          loadDefaultValues: loader,
        }),
      )
      await waitFor(() => {
        expect(result.current.isDefaultsReady).toBe(true)
      })
      loader.mockClear()
      expect(() => {
        void result.current.batch(() => {
          void result.current.reloadDefaultValues()
        })
      }).toThrow(/reloadDefaultValues\(\) cannot be called inside form.batch()/)
      expect(getControlInternals(result.current.control).store.getTransactionDepth()).toBe(0)
      expect(loader).not.toHaveBeenCalled()
    })
  })

  describe('validation', () => {
    it('validates final values once for a forced batch', async () => {
      const resolver = vi.fn(async (values: AddressForm) => ({
        success: true as const,
        values,
      }))
      const { result } = renderHook(() =>
        useForm<AddressForm>({
          defaultValues: addressDefaults,
          resolver,
        }),
      )

      await act(async () => {
        await result.current.batch(
          () => {
            result.current.setValue('address.city', 'Yerevan')
            result.current.setValue('address.country', 'Armenia')
          },
          { shouldValidate: true },
        )
      })

      expect(resolver).toHaveBeenCalledTimes(1)
      expect(resolver.mock.calls[0]?.[0].address.city).toBe('Yerevan')
    })

    it('does not let per-operation shouldValidate false override a batch force', async () => {
      const resolver = vi.fn(async (values: AddressForm) => ({
        success: true as const,
        values,
      }))
      const { result } = renderHook(() =>
        useForm<AddressForm>({
          defaultValues: addressDefaults,
          resolver,
        }),
      )

      await act(async () => {
        await result.current.batch(
          () => {
            result.current.setValue('address.city', 'Yerevan', { shouldValidate: false })
          },
          { shouldValidate: true },
        )
      })

      expect(resolver).toHaveBeenCalledTimes(1)
    })

    it('revalidates dependents from final values without duplicating queued fields', async () => {
      const confirm = vi.fn((value: string, values: { password: string; confirm: string }) =>
        value === values.password ? undefined : 'Must match',
      )
      const { result } = renderHook(() =>
        useForm<{ password: string; confirm: string }>({
          defaultValues: { password: '', confirm: '' },
          mode: ValidationMode.OnChange,
          dependencies: { confirm: ['password'] },
          dependencyMode: 'always',
          rules: {
            confirm: [confirm],
          },
        }),
      )

      await act(async () => {
        await result.current.batch(() => {
          result.current.setValue('password', 'secret')
          result.current.setValue('confirm', 'secret')
        })
      })

      await waitFor(() => {
        expect(confirm).toHaveBeenCalled()
      })
      expect(confirm.mock.calls.some((call) => call[1].password === 'secret')).toBe(true)
      expect(result.current.getErrors().confirm).toBeUndefined()
    })

    it('schedules one debounce timer from final values and does not wait for it', async () => {
      vi.useFakeTimers()
      const remote = vi.fn(async (username: string) => (username === 'taken' ? 'Taken' : undefined))
      const { result } = renderHook(() =>
        useForm<{ username: string }>({
          defaultValues: { username: 'alice' },
          mode: ValidationMode.OnChange,
          rules: {
            username: [createAsyncRule(async (value) => remote(value), { debounce: 400 })],
          },
        }),
      )

      let finished = false
      await act(async () => {
        const pending = result.current.batch(() => {
          result.current.setValue('username', 'tak')
          result.current.setValue('username', 'taken')
        })
        await pending
        finished = true
      })

      expect(finished).toBe(true)
      expect(remote).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })
      expect(remote).toHaveBeenCalledTimes(1)
      expect(remote).toHaveBeenCalledWith('taken')
      vi.useRealTimers()
    })
  })

  describe('field arrays, reset, and unregister', () => {
    it('notifies array subscribers once with the final order', async () => {
      const { result } = renderHook(() => {
        const form = useForm<{ items: Array<{ name: string }> }>({
          defaultValues: { items: [] },
        })
        const items = useFieldArray({ control: form.control, name: 'items' })
        return { form, items }
      })
      const listener = vi.fn()
      getControlInternals(result.current.form.control).store.subscribe(listener)

      await act(async () => {
        await result.current.form.batch(() => {
          result.current.items.append({ name: 'first' })
          result.current.items.append({ name: 'second' })
          result.current.items.move(0, 1)
        })
      })

      expect(result.current.form.getValues().items.map((item) => item.name)).toEqual([
        'second',
        'first',
      ])
      expect(listener).toHaveBeenCalledTimes(1)
      expect(result.current.items.fields.map((field) => field.value.name)).toEqual([
        'second',
        'first',
      ])
    })

    it('drops queued field validation for reset and unregister', async () => {
      const { result } = renderHook(() =>
        useForm<AddressForm>({
          defaultValues: addressDefaults,
          mode: ValidationMode.OnChange,
          rules: {
            'address.city': [rules.required('City is required')],
            email: [rules.required('Email is required')],
          },
        }),
      )

      await act(async () => {
        await result.current.batch(() => {
          result.current.setValue('address.city', '')
          result.current.resetField('address.city')
          result.current.setValue('email', '')
          result.current.unregister('email')
        })
      })

      expect(result.current.getErrors()['address.city']).toBeUndefined()
    })
  })

  describe('isolation', () => {
    it('does not mix notifications across forms', async () => {
      const { result: first } = renderHook(() =>
        useForm<AddressForm>({ defaultValues: addressDefaults }),
      )
      const { result: second } = renderHook(() =>
        useForm<AddressForm>({ defaultValues: addressDefaults }),
      )
      const firstListener = vi.fn()
      const secondListener = vi.fn()
      getControlInternals(first.current.control).store.subscribe(firstListener)
      getControlInternals(second.current.control).store.subscribe(secondListener)

      await act(async () => {
        await first.current.batch(() => {
          first.current.setValue('address.city', 'Yerevan')
        })
      })

      expect(firstListener).toHaveBeenCalledTimes(1)
      expect(secondListener).not.toHaveBeenCalled()
      expect(second.current.getValue('address.city')).toBe('')
    })

    it('restores transaction depth under Strict Mode', async () => {
      const { result } = renderHook(
        () => useForm<AddressForm>({ defaultValues: addressDefaults }),
        { wrapper: StrictMode },
      )
      await act(async () => {
        await result.current.batch(() => {
          result.current.setValue('address.city', 'Yerevan')
        })
      })
      expect(getControlInternals(result.current.control).store.getTransactionDepth()).toBe(0)
      expect(result.current.getValue('address.city')).toBe('Yerevan')
    })
  })
})
