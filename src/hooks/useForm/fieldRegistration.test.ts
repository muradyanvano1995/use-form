import { describe, expect, it } from 'vitest'
import { UnsafePathError } from './pathUtilities.ts'
import {
  DEFAULT_AUTOMATIC_UNREGISTER_OPTIONS,
  DEFAULT_EXPLICIT_UNREGISTER_OPTIONS,
  addInactiveRoot,
  assertSafeUnregisterPath,
  clearFieldElementsUnder,
  connectFieldElement,
  createDeferredUnregisterScheduler,
  disconnectFieldElement,
  findInactiveRoot,
  getFirstFocusableElement,
  hasConnectedElements,
  isInactivePath,
  normalizeUnregisterNames,
  omitPathAndDescendants,
  omitPathsFromList,
  reactivateInactivePath,
  resolveShouldUnregister,
  resolveUnregisterOptions,
  type FieldElementRegistry,
} from './fieldRegistration.ts'

describe('fieldRegistration', () => {
  describe('option defaults and precedence', () => {
    it('preserves values by default for explicit unregister', () => {
      expect(resolveUnregisterOptions(undefined)).toEqual(DEFAULT_EXPLICIT_UNREGISTER_OPTIONS)
      expect(DEFAULT_EXPLICIT_UNREGISTER_OPTIONS.keepValue).toBe(true)
      expect(DEFAULT_AUTOMATIC_UNREGISTER_OPTIONS.keepValue).toBe(false)
    })

    it('resolves shouldUnregister as field → form → false', () => {
      expect(resolveShouldUnregister(undefined, undefined)).toBe(false)
      expect(resolveShouldUnregister(undefined, true)).toBe(true)
      expect(resolveShouldUnregister(false, true)).toBe(false)
      expect(resolveShouldUnregister(true, false)).toBe(true)
    })

    it('fills unspecified keep flags from the chosen defaults', () => {
      expect(resolveUnregisterOptions({ keepError: true }).keepValue).toBe(true)
      expect(
        resolveUnregisterOptions({ keepValue: true }, DEFAULT_AUTOMATIC_UNREGISTER_OPTIONS)
          .keepValue,
      ).toBe(true)
    })
  })

  describe('inactive path tracking', () => {
    it('treats descendants as inactive without prefix collisions', () => {
      const inactive = new Set(['company'])
      expect(isInactivePath('company', inactive)).toBe(true)
      expect(isInactivePath('company.taxNumber', inactive)).toBe(true)
      expect(isInactivePath('companyBackup', inactive)).toBe(false)
      expect(findInactiveRoot('company.address.city', inactive)).toBe('company')
    })

    it('collapses descendant inactive roots into a parent', () => {
      const inactive = new Set<string>()
      addInactiveRoot(inactive, 'company.taxNumber')
      addInactiveRoot(inactive, 'company')
      expect([...inactive]).toEqual(['company'])
      addInactiveRoot(inactive, 'company.name')
      expect([...inactive]).toEqual(['company'])
    })

    it('reactivates matching ancestors and descendants', () => {
      const inactive = new Set(['company', 'nickname'])
      reactivateInactivePath('company.name', inactive)
      expect(inactive.has('company')).toBe(false)
      expect(inactive.has('nickname')).toBe(true)
    })
  })

  describe('metadata omission', () => {
    it('omits a subtree from records and lists', () => {
      const errors = {
        email: 'required',
        'company.name': 'required',
        'company.taxNumber': 'invalid',
        companyBackup: 'keep',
      }
      expect(omitPathAndDescendants(errors, 'company')).toEqual({
        email: 'required',
        companyBackup: 'keep',
      })
      expect(omitPathsFromList(['email', 'company.name', 'companyBackup'], 'company')).toEqual([
        'email',
        'companyBackup',
      ])
    })
  })

  describe('multiple connected elements', () => {
    it('tracks several elements and only reports empty after the last disconnect', () => {
      const registry: FieldElementRegistry = new Map()
      const basic = { focus: () => undefined }
      const pro = { focus: () => undefined }

      connectFieldElement(registry, 'plan', basic)
      connectFieldElement(registry, 'plan', pro)
      expect(hasConnectedElements(registry, 'plan')).toBe(true)
      expect(getFirstFocusableElement(registry, 'plan')).toBe(basic)

      expect(disconnectFieldElement(registry, 'plan', basic)).toBe(false)
      expect(hasConnectedElements(registry, 'plan')).toBe(true)
      expect(getFirstFocusableElement(registry, 'plan')).toBe(pro)

      expect(disconnectFieldElement(registry, 'plan', pro)).toBe(true)
      expect(hasConnectedElements(registry, 'plan')).toBe(false)
    })

    it('clears descendant element sets without touching siblings', () => {
      const registry: FieldElementRegistry = new Map()
      connectFieldElement(registry, 'company.name', { focus: () => undefined })
      connectFieldElement(registry, 'email', { focus: () => undefined })
      clearFieldElementsUnder(registry, 'company')
      expect(hasConnectedElements(registry, 'company.name')).toBe(false)
      expect(hasConnectedElements(registry, 'email')).toBe(true)
    })
  })

  describe('deferred unregister scheduler', () => {
    it('cancels a scheduled task when the path reconnects before flush', () => {
      const queue: Array<() => void> = []
      const scheduler = createDeferredUnregisterScheduler((task) => {
        queue.push(task)
      })
      const calls: string[] = []

      scheduler.schedule('company.taxNumber', () => {
        calls.push('run')
      })
      expect(scheduler.hasPending('company.taxNumber')).toBe(true)
      scheduler.cancel('company.taxNumber')
      for (const task of queue.splice(0)) task()
      expect(calls).toEqual([])
      expect(scheduler.hasPending('company.taxNumber')).toBe(false)
    })

    it('runs only the latest generation and supports cancelWhere / dispose', () => {
      const queue: Array<() => void> = []
      const scheduler = createDeferredUnregisterScheduler((task) => {
        queue.push(task)
      })
      const calls: string[] = []

      scheduler.schedule('a', () => calls.push('a1'))
      scheduler.schedule('a', () => calls.push('a2'))
      scheduler.schedule('b', () => calls.push('b'))
      scheduler.cancelWhere((path) => path === 'b')
      for (const task of queue.splice(0)) task()
      expect(calls).toEqual(['a2'])

      scheduler.schedule('c', () => calls.push('c'))
      scheduler.dispose()
      for (const task of queue.splice(0)) task()
      expect(calls).toEqual(['a2'])
    })
  })

  describe('path guards', () => {
    it('rejects unsafe paths and normalizes name lists', () => {
      expect(() => assertSafeUnregisterPath('__proto__.x')).toThrow(UnsafePathError)
      expect(normalizeUnregisterNames('email')).toEqual(['email'])
      expect(normalizeUnregisterNames(['email', 'company'])).toEqual(['email', 'company'])
    })
  })
})
