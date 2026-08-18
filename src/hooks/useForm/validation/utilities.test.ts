import { describe, expect, it } from 'vitest'
import { EMAIL_PATTERN, isEmptyValue, testPattern } from './utilities.ts'

describe('isEmptyValue', () => {
  it('treats null, undefined, blank strings, and NaN as empty', () => {
    expect(isEmptyValue(null)).toBe(true)
    expect(isEmptyValue(undefined)).toBe(true)
    expect(isEmptyValue('')).toBe(true)
    expect(isEmptyValue('   ')).toBe(true)
    expect(isEmptyValue(Number.NaN)).toBe(true)
  })

  it('does not treat 0 or false as empty', () => {
    expect(isEmptyValue(0)).toBe(false)
    expect(isEmptyValue(false)).toBe(false)
  })

  it('treats empty arrays as empty for optional File[] fields', () => {
    expect(isEmptyValue([])).toBe(true)
    expect(isEmptyValue(['x'])).toBe(false)
  })
})

describe('testPattern', () => {
  it('matches without mutating global RegExp lastIndex', () => {
    const globalPattern = /ab/g
    globalPattern.lastIndex = 2
    expect(testPattern(globalPattern, 'ab')).toBe(true)
    expect(testPattern(globalPattern, 'ab')).toBe(true)
    expect(globalPattern.lastIndex).toBe(2)
  })

  it('supports the shared EMAIL_PATTERN', () => {
    expect(testPattern(EMAIL_PATTERN, 'a@b.com')).toBe(true)
    expect(testPattern(EMAIL_PATTERN, 'bad')).toBe(false)
  })
})
