import { describe, expect, it } from 'vitest'
import {
  applyLoadedDefaultValues,
  assertLoadedDefaultValues,
  collectArrayFieldPaths,
  isAbortError,
  toDefaultValuesError,
} from './defaultValuesLoader.ts'

describe('defaultValuesLoader', () => {
  describe('assertLoadedDefaultValues', () => {
    it('accepts plain objects', () => {
      expect(() => assertLoadedDefaultValues({ name: '' })).not.toThrow()
    })

    it('rejects arrays and non-objects', () => {
      expect(() => assertLoadedDefaultValues([])).toThrow(/plain object/)
      expect(() => assertLoadedDefaultValues(null)).toThrow(/plain object/)
      expect(() => assertLoadedDefaultValues('x')).toThrow(/plain object/)
    })
  })

  describe('error helpers', () => {
    it('normalizes unknown failures and detects AbortError', () => {
      expect(toDefaultValuesError('boom').message).toBe('boom')
      expect(toDefaultValuesError(123).message).toBe('Failed to load default values')
      const abort = new Error('Aborted')
      abort.name = 'AbortError'
      expect(isAbortError(abort)).toBe(true)
      expect(isAbortError(new Error('other'))).toBe(false)
    })
  })

  describe('collectArrayFieldPaths', () => {
    it('finds top-level and nested object array paths', () => {
      expect(
        collectArrayFieldPaths({
          tags: [],
          profile: { roles: ['a'] },
          name: 'x',
        }),
      ).toEqual(['tags', 'profile.roles'])
    })
  })

  describe('applyLoadedDefaultValues', () => {
    it('replace mode swaps all values and clears metadata', () => {
      const result = applyLoadedDefaultValues({
        currentValues: { name: 'Local', email: 'local@ex.com' },
        previousDefaults: { name: '', email: '' },
        loaded: { name: 'Server', email: 'server@ex.com' },
        mode: 'replace',
        touched: { name: true },
        errors: { name: 'bad' },
        errorDetails: {},
      })

      expect(result.values).toEqual({ name: 'Server', email: 'server@ex.com' })
      expect(result.defaultValues).toEqual({ name: 'Server', email: 'server@ex.com' })
      expect(result.touched).toEqual({})
      expect(result.errors).toEqual({})
    })

    it('preserveDirty keeps dirty leaves and applies pristine siblings', () => {
      const result = applyLoadedDefaultValues({
        currentValues: {
          profile: { name: 'Vano', city: '' },
        },
        previousDefaults: {
          profile: { name: '', city: '' },
        },
        loaded: {
          profile: { name: 'Server Name', city: 'Yerevan' },
        },
        mode: 'preserveDirty',
        touched: { 'profile.name': true },
        errors: { 'profile.name': 'too short', 'profile.city': 'required' },
        errorDetails: {},
      })

      expect(result.values).toEqual({
        profile: { name: 'Vano', city: 'Yerevan' },
      })
      expect(result.defaultValues).toEqual({
        profile: { name: 'Server Name', city: 'Yerevan' },
      })
      expect(result.touched).toEqual({ 'profile.name': true })
      expect(result.errors).toEqual({ 'profile.name': 'too short' })
    })

    it('preserveDirty treats dirty arrays as atomic', () => {
      const result = applyLoadedDefaultValues({
        currentValues: {
          products: [{ name: 'Local' }],
        },
        previousDefaults: {
          products: [{ name: '' }],
        },
        loaded: {
          products: [{ name: 'Server A' }, { name: 'Server B' }],
        },
        mode: 'preserveDirty',
        touched: { 'products.0.name': true },
        errors: {},
        errorDetails: {},
      })

      expect(result.values.products).toEqual([{ name: 'Local' }])
      expect(result.defaultValues.products).toEqual([{ name: 'Server A' }, { name: 'Server B' }])
    })

    it('preserveDirty replaces pristine arrays', () => {
      const result = applyLoadedDefaultValues({
        currentValues: {
          products: [{ name: '' }],
        },
        previousDefaults: {
          products: [{ name: '' }],
        },
        loaded: {
          products: [{ name: 'Server' }],
        },
        mode: 'preserveDirty',
        touched: {},
        errors: {},
        errorDetails: {},
      })

      expect(result.values.products).toEqual([{ name: 'Server' }])
    })

    it('preserves falsy dirty values including null files', () => {
      const file = new File(['x'], 'a.txt')
      const result = applyLoadedDefaultValues({
        currentValues: { count: 0, avatar: null as File | null, label: '' },
        previousDefaults: { count: 1, avatar: file, label: 'x' },
        loaded: { count: 5, avatar: file, label: 'server' },
        mode: 'preserveDirty',
        touched: {},
        errors: {},
        errorDetails: {},
      })

      expect(result.values).toEqual({ count: 0, avatar: null, label: '' })
      expect(result.defaultValues).toEqual({ count: 5, avatar: file, label: 'server' })
    })
  })
})
