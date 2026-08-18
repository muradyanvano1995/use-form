import { describe, expect, it } from 'vitest'
import {
  InvalidPathError,
  UnsafePathError,
  cloneFormValue,
  collectDirtyLeafPaths,
  collectLeafPaths,
  deleteValueAtPath,
  getValueAtPath,
  hasValueAtPath,
  isPlainObject,
  isSameOrDescendantPath,
  mergeDeepPartial,
  parsePath,
  encodeRadioValueForId,
  removeValueAtPath,
  setValueAtPath,
} from './pathUtilities.ts'
import { createErrorId, createFieldId } from './utilities.ts'

describe('pathUtilities', () => {
  describe('parsePath', () => {
    it('splits valid dot paths', () => {
      expect(parsePath('address.city')).toEqual(['address', 'city'])
    })

    it('rejects empty and malformed paths', () => {
      expect(() => parsePath('')).toThrow(InvalidPathError)
      expect(() => parsePath('.city')).toThrow(InvalidPathError)
      expect(() => parsePath('address.')).toThrow(InvalidPathError)
      expect(() => parsePath('address..city')).toThrow(InvalidPathError)
    })

    it('rejects unsafe prototype-pollution segments', () => {
      expect(() => parsePath('__proto__.polluted')).toThrow(UnsafePathError)
      expect(() => parsePath('address.constructor')).toThrow(UnsafePathError)
      expect(() => parsePath('a.prototype.b')).toThrow(UnsafePathError)
    })
  })

  describe('getValueAtPath / hasValueAtPath', () => {
    const values = {
      address: { city: 'Yerevan', country: 'Armenia' },
      tags: ['a'],
    }

    it('reads nested values', () => {
      expect(getValueAtPath(values, 'address.city')).toBe('Yerevan')
      expect(getValueAtPath(values, 'address')).toEqual({ city: 'Yerevan', country: 'Armenia' })
    })

    it('returns undefined for missing paths', () => {
      expect(getValueAtPath(values, 'address.postalCode')).toBeUndefined()
      expect(getValueAtPath(values, 'missing.city')).toBeUndefined()
    })

    it('reports ownership with hasValueAtPath', () => {
      expect(hasValueAtPath(values, 'address.city')).toBe(true)
      expect(hasValueAtPath(values, 'address.postalCode')).toBe(false)
    })
  })

  describe('setValueAtPath', () => {
    it('writes immutably and preserves siblings', () => {
      const previous = {
        address: {
          city: '',
          country: 'Armenia',
        },
        acceptTerms: false,
      }

      const next = setValueAtPath(previous, 'address.city', 'Yerevan')

      expect(next).toEqual({
        address: {
          city: 'Yerevan',
          country: 'Armenia',
        },
        acceptTerms: false,
      })
      expect(next).not.toBe(previous)
      expect(next.address).not.toBe(previous.address)
      expect(previous.address.city).toBe('')
      expect(next.acceptTerms).toBe(previous.acceptTerms)
    })

    it('creates missing intermediate plain objects', () => {
      const next = setValueAtPath({}, 'customer.profile.name', 'Vano')
      expect(next).toEqual({ customer: { profile: { name: 'Vano' } } })
    })

    it('writes indexed object-array leaves immutably', () => {
      const previous = { products: [{ name: 'Apple', quantity: 1 }] }
      const next = setValueAtPath(previous, 'products.0.name', 'Apricot')

      expect(next).toEqual({ products: [{ name: 'Apricot', quantity: 1 }] })
      expect(next.products).not.toBe(previous.products)
      expect(previous.products[0]?.name).toBe('Apple')
    })
  })

  describe('deleteValueAtPath / removeValueAtPath', () => {
    it('deletes nested keys immutably and does not splice arrays', () => {
      const previous = {
        company: { name: 'Acme', taxNumber: '1' },
        tags: ['a', 'b'],
      }
      const next = deleteValueAtPath(previous, 'company.taxNumber')
      expect(next).toEqual({ company: { name: 'Acme' }, tags: ['a', 'b'] })
      expect(next).not.toBe(previous)
      expect(previous.company.taxNumber).toBe('1')
      expect(deleteValueAtPath(previous, 'tags.0')).toBe(previous)
    })

    it('is idempotent for missing paths and prunes empty optional parents', () => {
      const values = { accountType: 'personal', company: { name: 'Acme' } }
      expect(deleteValueAtPath(values, 'company.missing')).toBe(values)
      expect(removeValueAtPath(values, 'company.name')).toEqual({ accountType: 'personal' })
    })

    it('does not confuse company with companyBackup', () => {
      const values = {
        company: { name: 'A' },
        companyBackup: { name: 'B' },
      }
      expect(removeValueAtPath(values, 'company')).toEqual({ companyBackup: { name: 'B' } })
    })
  })

  describe('isSameOrDescendantPath', () => {
    it('matches descendants without prefix collisions', () => {
      expect(isSameOrDescendantPath('company.address.city', 'company.address')).toBe(true)
      expect(isSameOrDescendantPath('company.address', 'company.address')).toBe(true)
      expect(isSameOrDescendantPath('companyBackup', 'company')).toBe(false)
    })
  })

  describe('clone and merge', () => {
    it('deep-clones plain objects and shallow-copies arrays', () => {
      const source = {
        address: { city: 'Yerevan' },
        tags: ['a', 'b'],
        createdAt: new Date('2020-01-01'),
      }
      const cloned = cloneFormValue(source)

      expect(cloned).toEqual(source)
      expect(cloned).not.toBe(source)
      expect(cloned.address).not.toBe(source.address)
      expect(cloned.tags).not.toBe(source.tags)
      expect(cloned.tags).toEqual(['a', 'b'])
      expect(cloned.createdAt).toBe(source.createdAt)
    })

    it('deep-merges partial plain objects and replaces arrays atomically', () => {
      const base = {
        address: { city: '', country: 'Armenia' },
        tags: ['old'],
      }
      const merged = mergeDeepPartial(base, {
        address: { city: 'Yerevan' },
        tags: ['new'],
      })

      expect(merged).toEqual({
        address: { city: 'Yerevan', country: 'Armenia' },
        tags: ['new'],
      })
      expect(merged).not.toBe(base)
      expect(base.address.city).toBe('')
    })

    it('skips undefined keys in deep partial merges', () => {
      const merged = mergeDeepPartial(
        { address: { city: 'Yerevan' } },
        { address: { city: undefined } },
      )
      expect(merged.address.city).toBe('Yerevan')
    })
  })

  describe('leaf path collection', () => {
    it('collects leaf paths and dirty leaf paths', () => {
      const defaults = {
        address: { city: '', country: 'Armenia' },
        acceptTerms: false,
      }
      const values = {
        address: { city: 'Yerevan', country: 'Armenia' },
        acceptTerms: false,
      }

      expect(collectLeafPaths(values).sort()).toEqual([
        'acceptTerms',
        'address.city',
        'address.country',
      ])
      expect(collectDirtyLeafPaths(values, defaults)).toEqual(['address.city'])
    })

    it('expands object-array leaves and recognizes array indices', () => {
      const values = {
        products: [{ name: 'Apple', quantity: 1 }],
        tags: ['fresh'],
      }

      expect(collectLeafPaths(values).sort()).toEqual([
        'products.0.name',
        'products.0.quantity',
        'tags.0',
      ])
      expect(hasValueAtPath(values, 'products.0.name')).toBe(true)
      expect(hasValueAtPath(values, 'products.1.name')).toBe(false)
      expect(hasValueAtPath(values, 'tags.0')).toBe(true)
    })
  })

  describe('ids', () => {
    it('keeps nested dots so paths do not collide with dashed flat names', () => {
      expect(createFieldId('form', 'address.city')).toBe('form-field-address.city')
      expect(createFieldId('form', 'address-city')).toBe('form-field-address-city')
      expect(createErrorId('form', 'address.city')).toBe('form-error-address.city')
    })

    it('encodes radio values so dotted and dashed options stay distinct', () => {
      expect(encodeRadioValueForId('pro.plan')).not.toBe(encodeRadioValueForId('pro-plan'))
      expect(encodeRadioValueForId('pro.plan')).toBe('pro%2Eplan')
    })
  })

  describe('isPlainObject', () => {
    it('rejects arrays, dates, and null', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(null)).toBe(false)
    })
  })
})
