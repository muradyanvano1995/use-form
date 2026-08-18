import { describe, expect, it, vi } from 'vitest'
import {
  captureMessageSnapshot,
  defaultValidationMessages,
  flattenValidationResult,
  formatDefaultValidationMessage,
  resolveFailureMessage,
  resolveFieldLabel,
} from './validationMessages.ts'

describe('validationMessages', () => {
  describe('default English catalog', () => {
    it('preserves existing built-in English messages', () => {
      expect(formatDefaultValidationMessage('required')).toBe('This field is required')
      expect(formatDefaultValidationMessage('email')).toBe('Enter a valid email address')
      expect(formatDefaultValidationMessage('minLength', { min: 3 })).toBe(
        'Must be at least 3 characters',
      )
      expect(formatDefaultValidationMessage('maxLength', { max: 2 })).toBe(
        'Must be at most 2 characters',
      )
      expect(formatDefaultValidationMessage('length', { length: 2 })).toBe(
        'Must be exactly 2 characters',
      )
      expect(formatDefaultValidationMessage('min', { min: 18 })).toBe('Must be at least 18')
      expect(formatDefaultValidationMessage('max', { max: 10 })).toBe('Must be at most 10')
      expect(formatDefaultValidationMessage('pattern')).toBe('Invalid format')
      expect(formatDefaultValidationMessage('accepted')).toBe('You must accept this')
      expect(formatDefaultValidationMessage('sameAs')).toBe('Values must match')
      expect(formatDefaultValidationMessage('matchesField')).toBe('Fields must match')
      expect(formatDefaultValidationMessage('fileSize', { maxBytes: 10 })).toBe(
        'File must not exceed 10 bytes',
      )
      expect(formatDefaultValidationMessage('fileType')).toBe('Unsupported file type')
      expect(formatDefaultValidationMessage('fileExtension')).toBe('Unsupported file extension')
      expect(formatDefaultValidationMessage('maxFiles', { max: 1 })).toBe(
        'You can upload up to 1 file',
      )
      expect(formatDefaultValidationMessage('maxFiles', { max: 5 })).toBe(
        'You can upload up to 5 files',
      )
      expect(formatDefaultValidationMessage('minFiles', { min: 1 })).toBe(
        'Select at least one file',
      )
      expect(formatDefaultValidationMessage('minFiles', { min: 2 })).toBe('Select at least 2 files')
      expect(formatDefaultValidationMessage('minItems', { min: 1 })).toBe('Add at least one item')
      expect(formatDefaultValidationMessage('minItems', { min: 3 })).toBe('Add at least 3 items')
      expect(formatDefaultValidationMessage('maxItems', { max: 1 })).toBe('At most 1 item allowed')
      expect(formatDefaultValidationMessage('maxItems', { max: 4 })).toBe('At most 4 items allowed')
      expect(formatDefaultValidationMessage('minLength', { min: 1 })).toBe(
        'Must be at least 1 character',
      )
      expect(formatDefaultValidationMessage('maxLength', { max: 1 })).toBe(
        'Must be at most 1 character',
      )
      expect(formatDefaultValidationMessage('length', { length: 1 })).toBe(
        'Must be exactly 1 character',
      )
    })

    it('cannot be mutated', () => {
      expect(Object.isFrozen(defaultValidationMessages)).toBe(true)
      expect(() => {
        ;(defaultValidationMessages as { required: string }).required = 'nope'
      }).toThrow()
    })
  })

  describe('labels', () => {
    it('uses an explicit label and falls back to the path', () => {
      expect(resolveFieldLabel('email', { email: 'Email address' })).toBe('Email address')
      expect(resolveFieldLabel('email', {})).toBe('email')
      expect(resolveFieldLabel('address.city', { 'address.city': 'City' })).toBe('City')
      expect(resolveFieldLabel('products.0.name', { 'products.0.name': 'First product' })).toBe(
        'First product',
      )
    })
  })

  describe('resolveFailureMessage', () => {
    const requiredMeta = {
      type: 'required',
      hasCustomMessage: false,
      localize: true,
    }

    it('uses a per-rule custom string before the catalog', () => {
      const message = resolveFailureMessage({
        type: 'required',
        params: {},
        rawMessage: 'Email is required',
        name: 'email',
        meta: {
          ...requiredMeta,
          hasCustomMessage: true,
          customMessage: 'Email is required',
        },
        snapshot: captureMessageSnapshot({ required: 'From catalog' }),
      })
      expect(message).toBe('Email is required')
    })

    it('uses a catalog factory with typed params and labels', () => {
      const minLength = vi.fn(({ label, params, name, type }) => {
        expect(type).toBe('minLength')
        expect(name).toBe('password')
        expect(label).toBe('Password')
        expect(params.min).toBe(8)
        return `${label} needs ${params.min}`
      })

      const message = resolveFailureMessage({
        type: 'minLength',
        params: { min: 8 },
        rawMessage: 'Must be at least 8 characters',
        name: 'password',
        meta: { type: 'minLength', hasCustomMessage: false, localize: true },
        snapshot: captureMessageSnapshot({ minLength }, { password: 'Password' }),
      })

      expect(message).toBe('Password needs 8')
      expect(minLength).toHaveBeenCalledTimes(1)
    })

    it('falls back to English when a catalog key is missing', () => {
      const message = resolveFailureMessage({
        type: 'email',
        params: {},
        rawMessage: 'Enter a valid email address',
        name: 'email',
        meta: { type: 'email', hasCustomMessage: false, localize: true },
        snapshot: captureMessageSnapshot({ required: 'Required' }),
      })
      expect(message).toBe('Enter a valid email address')
    })

    it('falls back to English when a factory returns an empty value', () => {
      const message = resolveFailureMessage({
        type: 'required',
        params: {},
        rawMessage: 'This field is required',
        name: 'email',
        meta: requiredMeta,
        snapshot: captureMessageSnapshot({ required: () => '' }),
      })
      expect(message).toBe('This field is required')
    })

    it('rethrows factory exceptions', () => {
      expect(() =>
        resolveFailureMessage({
          type: 'required',
          params: {},
          rawMessage: 'This field is required',
          name: 'email',
          meta: requiredMeta,
          snapshot: captureMessageSnapshot({
            required: () => {
              throw new Error('translator down')
            },
          }),
        }),
      ).toThrow('translator down')
    })

    it('does not localize custom or async rule types', () => {
      const message = resolveFailureMessage({
        type: 'usernameAvailable',
        params: {},
        rawMessage: 'Username is unavailable',
        name: 'username',
        meta: { type: 'usernameAvailable', hasCustomMessage: false, localize: false },
        snapshot: captureMessageSnapshot({ required: 'Required' }),
      })
      expect(message).toBe('Username is unavailable')
    })

    it('does not put values into the factory context', () => {
      const factory = vi.fn((context) => {
        expect(Object.keys(context).sort()).toEqual(['label', 'name', 'params', 'type'])
        return 'ok'
      })
      resolveFailureMessage({
        type: 'required',
        params: {},
        rawMessage: 'This field is required',
        name: 'password',
        meta: requiredMeta,
        snapshot: captureMessageSnapshot({ required: factory }),
      })
      expect(factory).toHaveBeenCalled()
    })
  })

  describe('flattenValidationResult', () => {
    it('flattens strings, objects, and arrays', () => {
      expect(flattenValidationResult(undefined)).toEqual([])
      expect(flattenValidationResult('Required')).toEqual(['Required'])
      expect(flattenValidationResult({ message: 'Too small', type: 'min' })).toEqual([
        { message: 'Too small', type: 'min' },
      ])
      expect(
        flattenValidationResult(['A', { message: 'B', type: 'min', params: { min: 1 } }]),
      ).toEqual(['A', { message: 'B', type: 'min', params: { min: 1 } }])
    })
  })
})
