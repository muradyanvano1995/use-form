import { describe, expect, it } from 'vitest'
import {
  allocateFieldArrayKeys,
  assertArrayIndex,
  assertInsertIndex,
  clearElementMapUnderArray,
  ensureFieldArrayKeys,
  identityRemap,
  insertRemap,
  isArrayPathOrDescendant,
  moveRemap,
  omitArrayPathTree,
  omitArrayPathsFromList,
  parseIndexedPath,
  reindexElementMap,
  reindexPathList,
  reindexPathRecord,
  removeRemap,
  swapRemap,
} from './fieldArrayUtilities.ts'

describe('fieldArrayUtilities', () => {
  describe('parseIndexedPath', () => {
    it('parses indexed descendants and ignores array-level and sibling prefixes', () => {
      expect(parseIndexedPath('products.0.name', 'products')).toEqual({
        index: 0,
        suffix: '.name',
      })
      expect(parseIndexedPath('products.2', 'products')).toEqual({ index: 2, suffix: '' })
      expect(parseIndexedPath('products', 'products')).toBeNull()
      expect(parseIndexedPath('productsBackup.0.name', 'products')).toBeNull()
      expect(parseIndexedPath('products.0foo', 'products')).toBeNull()
      expect(isArrayPathOrDescendant('products', 'products')).toBe(true)
      expect(isArrayPathOrDescendant('products.1.qty', 'products')).toBe(true)
      expect(isArrayPathOrDescendant('productsBackup.0', 'products')).toBe(false)
    })
  })

  describe('metadata remapping', () => {
    it('reindexes records and lists while preserving siblings and array-level keys', () => {
      const errors = {
        products: 'need items',
        'products.0.name': 'a',
        'products.1.quantity': 'b',
        'productsBackup.0.name': 'keep',
        'customer.name': 'keep-customer',
      }

      const afterRemove = reindexPathRecord(errors, 'products', removeRemap(0))
      expect(afterRemove).toEqual({
        products: 'need items',
        'products.0.quantity': 'b',
        'productsBackup.0.name': 'keep',
        'customer.name': 'keep-customer',
      })

      const replaced = omitArrayPathTree(errors, 'products')
      expect(replaced).toEqual({
        'productsBackup.0.name': 'keep',
        'customer.name': 'keep-customer',
      })

      expect(
        reindexPathList(
          ['customer.name', 'products.1.name', 'products.0.name', 'products'],
          'products',
          removeRemap(0),
        ),
      ).toEqual(['customer.name', 'products.0.name', 'products'])

      expect(
        omitArrayPathsFromList(['products', 'products.0.name', 'customer.name'], 'products'),
      ).toEqual(['products', 'customer.name'])
    })

    it('reindexes and clears element maps', () => {
      const map = new Map<string, { focus?: () => void }>([
        ['products.0.name', { focus: () => undefined }],
        ['products.1.name', { focus: () => undefined }],
        ['customer.name', { focus: () => undefined }],
      ])

      reindexElementMap(map, 'products', removeRemap(0))
      expect([...map.keys()].sort()).toEqual(['customer.name', 'products.0.name'])

      clearElementMapUnderArray(map, 'products')
      expect([...map.keys()]).toEqual(['customer.name'])
    })
  })

  describe('keys and remappers', () => {
    it('allocates and truncates stable keys', () => {
      let n = 0
      const next = () => `fa-${++n}`
      expect(ensureFieldArrayKeys(undefined, 2, next)).toEqual(['fa-1', 'fa-2'])
      expect(ensureFieldArrayKeys(['fa-1', 'fa-2', 'fa-3'], 1, next)).toEqual(['fa-1'])
      expect(allocateFieldArrayKeys(2, next)).toEqual(['fa-3', 'fa-4'])
    })

    it('maps indices for insert, swap, and move', () => {
      expect(identityRemap()(2)).toBe(2)
      expect(insertRemap(1)(0)).toBe(0)
      expect(insertRemap(1)(1)).toBe(2)
      expect(swapRemap(0, 2)(0)).toBe(2)
      expect(swapRemap(0, 2)(2)).toBe(0)
      expect(swapRemap(0, 2)(1)).toBe(1)
      expect(moveRemap(0, 2)(0)).toBe(2)
      expect(moveRemap(0, 2)(1)).toBe(0)
      expect(moveRemap(0, 2)(2)).toBe(1)
      expect(moveRemap(2, 0)(2)).toBe(0)
      expect(moveRemap(2, 0)(0)).toBe(1)
      expect(moveRemap(2, 0)(1)).toBe(2)
      expect(moveRemap(1, 1)(1)).toBe(1)
    })

    it('validates indices', () => {
      expect(() => assertArrayIndex(0, 1, 'remove')).not.toThrow()
      expect(() => assertArrayIndex(1, 1, 'remove')).toThrow(RangeError)
      expect(() => assertInsertIndex(1, 1)).not.toThrow()
      expect(() => assertInsertIndex(2, 1)).toThrow(RangeError)
    })
  })
})
