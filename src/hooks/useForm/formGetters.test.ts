import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorSource, fieldErrorFromIssues } from './errors.ts'
import {
  pickPathValues,
  readDirtyValues,
  readErrorDetails,
  readErrors,
  readFieldState,
  readFormValue,
  readFormValues,
  readTouchedValues,
} from './formGetters.ts'
import { getControlInternals } from './formStore.ts'
import type { FormInternalState } from './formTypes.ts'
import { useForm } from './useForm.ts'
import { useFieldArray } from './useFieldArray.ts'

type Profile = {
  profile: {
    name: string
    city: string
    email?: string
  }
  avatar: File | null
  tags: string[]
}

function profileState(overrides?: Partial<FormInternalState<Profile>>): FormInternalState<Profile> {
  return {
    values: {
      profile: { name: 'Vano', city: 'Yerevan' },
      avatar: null,
      tags: ['a'],
    },
    defaultValues: {
      profile: { name: 'Vano', city: 'Gyumri' },
      avatar: null,
      tags: ['a'],
    },
    errors: { 'profile.city': 'Required' },
    errorDetails: {
      'profile.city': fieldErrorFromIssues([
        { message: 'Required', source: ErrorSource.Rule, type: 'required' },
      ]),
    },
    touched: { 'profile.city': true },
    isSubmitting: false,
    isValidating: false,
    isLoadingDefaults: false,
    isDefaultsReady: true,
    defaultValuesError: undefined,
    isSubmitted: false,
    submitCount: 0,
    submitError: undefined,
    rootError: undefined,
    rootErrorDetails: undefined,
    ...overrides,
  }
}

describe('formGetters', () => {
  describe('readFormValues / readFormValue', () => {
    it('clones plain trees and preserves File identity', () => {
      const file = new File(['x'], 'avatar.png')
      const state = profileState({
        values: {
          profile: { name: 'Vano', city: 'Yerevan' },
          avatar: file,
          tags: ['a'],
        },
      })
      const values = readFormValues(state)
      expect(values).toEqual(state.values)
      expect(values).not.toBe(state.values)
      values.profile.city = 'mutated'
      expect(state.values.profile.city).toBe('Yerevan')
      expect(values.avatar).toBe(file)

      const city = readFormValue(state, 'profile.city')
      expect(city).toBe('Yerevan')
    })

    it('rejects unsafe runtime paths', () => {
      expect(() => readFormValue(profileState(), '__proto__' as never)).toThrow(/Unsafe form path/)
    })
  })

  describe('errors', () => {
    it('returns shallow copies that cannot mutate internal maps', () => {
      const state = profileState()
      const errors = readErrors(state)
      const details = readErrorDetails(state)
      errors['profile.city'] = 'hacked'
      delete details['profile.city']
      expect(state.errors['profile.city']).toBe('Required')
      expect(state.errorDetails['profile.city']?.message).toBe('Required')
    })
  })

  describe('pickPathValues', () => {
    it('rebuilds nested dirty leaves without duplicating parent clones incorrectly', () => {
      const state = profileState()
      const picked = pickPathValues(state.values, ['profile.city', 'profile'])
      expect(picked).toEqual({
        profile: { name: 'Vano', city: 'Yerevan' },
      })
    })

    it('skips unsafe paths', () => {
      const picked = pickPathValues(profileState().values, ['constructor', 'profile.city'])
      expect(picked).toEqual({ profile: { city: 'Yerevan' } })
    })

    it('does not attach child object keys onto a selected parent array', () => {
      const file = new File(['bytes'], 'shot.png', { type: 'image/png' })
      type Catalog = {
        products: Array<{ name: string; photo: File | null }>
      }
      const values: Catalog = {
        products: [
          { name: 'Tea', photo: file },
          { name: 'Coffee', photo: null },
        ],
      }
      const picked = pickPathValues(values, ['products', 'products.0.name', 'products.0.photo'])
      expect(Array.isArray(picked.products)).toBe(true)
      expect(picked.products).toEqual(values.products)
      expect(picked.products?.[0]?.photo).toBe(file)
      expect(Object.prototype.hasOwnProperty.call(picked.products, '0')).toBe(true)
      expect(JSON.stringify(picked)).not.toContain('fa-')
    })
  })

  describe('dirty and touched values', () => {
    it('returns only dirty leaves and preserves atomic arrays', () => {
      const state = profileState({
        values: {
          profile: { name: 'Vano', city: 'Yerevan' },
          avatar: null,
          tags: ['b', 'c'],
        },
      })
      expect(readDirtyValues(state)).toEqual({
        profile: { city: 'Yerevan' },
        tags: ['b', 'c'],
      })
    })

    it('returns current values for touched paths, not the metadata map', () => {
      const state = profileState()
      expect(readTouchedValues(state)).toEqual({
        profile: { city: 'Yerevan' },
      })
      expect(state.touched).toEqual({ 'profile.city': true })
    })

    it('keeps parent arrays atomic when metadata also lists indexed children', () => {
      const file = new File(['x'], 'tea.png')
      type Catalog = {
        products: Array<{ name: string; photo: File | null }>
      }
      const values: Catalog = {
        products: [
          { name: 'Tea', photo: file },
          { name: 'Coffee', photo: null },
        ],
      }
      const state = {
        values,
        defaultValues: {
          products: [
            { name: 'Tea', photo: null },
            { name: 'Coffee', photo: null },
          ],
        },
        errors: {},
        errorDetails: {},
        touched: {
          products: true,
          'products.0.name': true,
        },
        isSubmitting: false,
        isValidating: false,
        isLoadingDefaults: false,
        isDefaultsReady: true,
        defaultValuesError: undefined,
        isSubmitted: false,
        submitCount: 0,
        submitError: undefined,
        rootError: undefined,
        rootErrorDetails: undefined,
      } as FormInternalState<Catalog>

      const touched = readTouchedValues(state)
      expect(Array.isArray(touched.products)).toBe(true)
      expect(touched.products).toEqual(values.products)
      expect(touched.products?.[0]?.photo).toBe(file)
      expect(Object.keys(touched.products as object).every((key) => key !== 'name')).toBe(true)

      const dirty = readDirtyValues(state)
      expect(Array.isArray(dirty.products)).toBe(true)
      expect(JSON.stringify(dirty)).not.toMatch(/"key"/)
    })
  })

  describe('readFieldState', () => {
    it('exposes typed value, string error, structured details, and presence flags', () => {
      const state = profileState()
      const field = readFieldState(state, 'profile.city', {
        registered: true,
        active: true,
      })
      expect(field.value).toBe('Yerevan')
      expect(field.defaultValue).toBe('Gyumri')
      expect(field.error).toBe('Required')
      expect(field.errorDetails?.type).toBe('required')
      expect(field.invalid).toBe(true)
      expect(field.touched).toBe(true)
      expect(field.dirty).toBe(true)
      expect(field.registered).toBe(true)
      expect(field.active).toBe(true)
      expect('isValidating' in field).toBe(false)
    })
  })

  describe('useForm getters', () => {
    it('reads latest store state without notifying subscribers', () => {
      const { result } = renderHook(() =>
        useForm<Profile>({
          defaultValues: {
            profile: { name: 'Vano', city: 'Gyumri' },
            avatar: null,
            tags: ['a'],
          },
        }),
      )
      const listener = vi.fn()
      const unsubscribe = getControlInternals(result.current.control).store.subscribe(listener)

      act(() => {
        result.current.setValue('profile.city', 'Yerevan')
      })
      listener.mockClear()

      expect(result.current.getValue('profile.city')).toBe('Yerevan')
      expect(result.current.getValues().profile.city).toBe('Yerevan')
      expect(listener).not.toHaveBeenCalled()
      unsubscribe()
    })

    it('keeps getter function identity stable', () => {
      const { result, rerender } = renderHook(() =>
        useForm<Profile>({
          defaultValues: {
            profile: { name: '', city: '' },
            avatar: null,
            tags: [],
          },
        }),
      )
      const first = {
        getValues: result.current.getValues,
        getValue: result.current.getValue,
        getFieldState: result.current.getFieldState,
      }
      rerender()
      expect(result.current.getValues).toBe(first.getValues)
      expect(result.current.getValue).toBe(first.getValue)
      expect(result.current.getFieldState).toBe(first.getFieldState)
    })

    it('clones returned values so callers cannot mutate the store', () => {
      const { result } = renderHook(() =>
        useForm<Profile>({
          defaultValues: {
            profile: { name: 'Vano', city: 'Yerevan' },
            avatar: null,
            tags: ['a'],
          },
        }),
      )
      const values = result.current.getValues()
      values.profile.city = 'mutated'
      expect(result.current.getValue('profile.city')).toBe('Yerevan')
    })

    it('preserves File identity and nested/indexed paths', () => {
      const file = new File(['x'], 'avatar.png', { type: 'image/png' })
      const { result } = renderHook(() =>
        useForm<Profile>({
          defaultValues: {
            profile: { name: '', city: '' },
            avatar: null,
            tags: ['one'],
          },
        }),
      )
      act(() => {
        result.current.setValue('avatar', file)
        result.current.setValue('tags.0' as never, 'two' as never)
      })
      expect(result.current.getValue('avatar')).toBe(file)
      expect(result.current.getValues().tags[0]).toBe('two')
    })

    it('keeps inactive optional fields absent', () => {
      type OptionalForm = { name: string; company?: { title: string } }
      const { result } = renderHook(() =>
        useForm<OptionalForm>({
          defaultValues: { name: 'Vano', company: { title: 'Studio' } },
        }),
      )
      act(() => {
        result.current.unregister('company', { keepValue: false })
      })
      expect(result.current.getValues()).toEqual({ name: 'Vano' })
      expect(result.current.getValue('company')).toBeUndefined()
      expect(result.current.getFieldState('company').active).toBe(false)
      expect(result.current.getFieldState('company').registered).toBe(false)
    })

    it('reflects async default values immediately', async () => {
      let resolveLoad!: (value: { title: string }) => void
      const { result } = renderHook(() =>
        useForm<{ title: string }>({
          defaultValues: { title: 'fallback' },
          loadDefaultValues: () =>
            new Promise((resolve) => {
              resolveLoad = resolve
            }),
        }),
      )
      expect(result.current.getValue('title')).toBe('fallback')
      await act(async () => {
        resolveLoad({ title: 'loaded' })
        await Promise.resolve()
      })
      await waitFor(() => {
        expect(result.current.getValue('title')).toBe('loaded')
      })
    })

    it('keeps string and structured error views coherent and root errors separate', () => {
      const { result } = renderHook(() =>
        useForm<Profile>({
          defaultValues: {
            profile: { name: '', city: '' },
            avatar: null,
            tags: [],
          },
        }),
      )
      act(() => {
        result.current.setError('profile.email', 'Invalid', { type: 'email' })
        result.current.setErrors({ 'profile.city': 'City required' })
      })
      expect(result.current.getErrors()['profile.email']).toBe('Invalid')
      expect(result.current.getErrorDetails()['profile.email']?.type).toBe('email')
      expect(result.current.getErrors()).not.toHaveProperty('root')
      const state = result.current.getFieldState('profile.email')
      expect(state.invalid).toBe(true)
      expect(state.errorDetails?.message).toBe('Invalid')
    })

    it('reports registered native fields', () => {
      const { result } = renderHook(() =>
        useForm<{ email: string }>({ defaultValues: { email: '' } }),
      )
      const props = result.current.register('email')
      const input = document.createElement('input')
      act(() => {
        props.ref(input)
      })
      expect(result.current.getFieldState('email').registered).toBe(true)
      act(() => {
        props.ref(null)
      })
    })

    it('does not leak field-array keys into dirty or touched values', () => {
      type Catalog = { products: Array<{ name: string }> }
      const { result } = renderHook(() => {
        const form = useForm<Catalog>({
          defaultValues: { products: [{ name: 'Tea' }] },
        })
        const array = useFieldArray({ control: form.control, name: 'products' })
        return { form, array }
      })
      act(() => {
        result.current.array.append({ name: 'Coffee' })
        result.current.form.setValue('products.0.name', 'Matcha')
      })
      const dirty = result.current.form.getDirtyValues()
      const touched = result.current.form.getTouchedValues()
      expect(JSON.stringify(dirty)).not.toContain(result.current.array.fields[0]!.key)
      expect(JSON.stringify(touched)).not.toContain(result.current.array.fields[0]!.key)
      expect(Array.isArray(dirty.products)).toBe(true)
    })
  })
})
