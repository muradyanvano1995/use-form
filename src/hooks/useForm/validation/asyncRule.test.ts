import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAsyncRule,
  getAsyncRuleMeta,
  isDebouncedAsyncRule,
  normalizeDebounceMs,
  resolveFieldDebounceMs,
  shouldDeferDebouncedRules,
  shouldSkipEmptyDebouncedValidation,
} from './asyncRule.ts'
import { rules } from './builtInRules.ts'
import { isEmptyValue } from './utilities.ts'

describe('asyncRule', () => {
  describe('normalizeDebounceMs', () => {
    it('defaults undefined to 0', () => {
      expect(normalizeDebounceMs(undefined)).toBe(0)
    })

    it('allows zero and positive finite values', () => {
      expect(normalizeDebounceMs(0)).toBe(0)
      expect(normalizeDebounceMs(400)).toBe(400)
    })

    it('rejects negative, NaN, and Infinity', () => {
      expect(() => normalizeDebounceMs(-1)).toThrow(/debounce must be a finite number/)
      expect(() => normalizeDebounceMs(Number.NaN)).toThrow(/debounce must be a finite number/)
      expect(() => normalizeDebounceMs(Number.POSITIVE_INFINITY)).toThrow(
        /debounce must be a finite number/,
      )
    })
  })

  describe('createAsyncRule / rules.async', () => {
    it('attaches metadata via WeakMap without enumerable extras', () => {
      const rule = rules.async(async () => undefined, { debounce: 400, validateEmpty: false })
      expect(getAsyncRuleMeta(rule)).toEqual({ debounce: 400, validateEmpty: false })
      expect(isDebouncedAsyncRule(rule)).toBe(true)
      expect(Object.keys(rule as object)).toEqual([])
    })

    it('defaults validateEmpty to false and debounce to 0', async () => {
      const rule = createAsyncRule(async () => 'taken')
      expect(getAsyncRuleMeta(rule)).toEqual({ debounce: 0, validateEmpty: false })
      expect(isDebouncedAsyncRule(rule)).toBe(false)
      await expect(rule('', { username: '' })).resolves.toBeUndefined()
      await expect(rule('ab', { username: 'ab' })).resolves.toBe('taken')
    })

    it('skips empty values when validateEmpty is false', async () => {
      const validator = vi.fn(async () => 'nope')
      const rule = rules.async(validator, { debounce: 100, validateEmpty: false })
      await expect(rule('   ', {})).resolves.toBeUndefined()
      expect(validator).not.toHaveBeenCalled()
    })

    it('validates empty values when validateEmpty is true', async () => {
      const rule = rules.async(async () => 'empty remote', { validateEmpty: true })
      await expect(rule('', {})).resolves.toBe('empty remote')
    })

    it('passes context including signal to the validator', async () => {
      const controller = new AbortController()
      const validator = vi.fn(async (_v, _values, context) => {
        expect(context.signal).toBe(controller.signal)
        expect(context.reason).toBe('change')
        expect(context.name).toBe('username')
        return undefined
      })
      const rule = rules.async(validator)
      await rule(
        'alice',
        { username: 'alice' },
        {
          name: 'username',
          values: { username: 'alice' },
          reason: 'change',
          signal: controller.signal,
        },
      )
      expect(validator).toHaveBeenCalledOnce()
    })
  })

  describe('resolveFieldDebounceMs', () => {
    it('returns 0 when no debounced rules exist', () => {
      expect(resolveFieldDebounceMs([rules.required(), async () => undefined])).toBe(0)
    })

    it('returns the shared delay', () => {
      expect(
        resolveFieldDebounceMs([
          rules.required(),
          rules.async(async () => undefined, { debounce: 300 }),
          rules.async(async () => undefined, { debounce: 300 }),
        ]),
      ).toBe(300)
    })

    it('rejects conflicting delays', () => {
      expect(() =>
        resolveFieldDebounceMs([
          rules.async(async () => undefined, { debounce: 300 }),
          rules.async(async () => undefined, { debounce: 500 }),
        ]),
      ).toThrow(/Conflicting debounce durations/)
    })
  })

  describe('scheduling helpers', () => {
    it('defers only change and dependency reasons', () => {
      expect(shouldDeferDebouncedRules('change')).toBe(true)
      expect(shouldDeferDebouncedRules('dependency')).toBe(true)
      expect(shouldDeferDebouncedRules('blur')).toBe(false)
      expect(shouldDeferDebouncedRules('manual')).toBe(false)
      expect(shouldDeferDebouncedRules('submit')).toBe(false)
    })

    it('skips empty debounced validation consistently with isEmptyValue', () => {
      const rule = rules.async(async () => 'x', { debounce: 100, validateEmpty: false })
      expect(shouldSkipEmptyDebouncedValidation([rule], '')).toBe(true)
      expect(shouldSkipEmptyDebouncedValidation([rule], 'a')).toBe(false)
      expect(isEmptyValue([])).toBe(true)
      expect(shouldSkipEmptyDebouncedValidation([rule], [])).toBe(true)
    })
  })
})

afterEach(() => {
  vi.clearAllMocks()
})
