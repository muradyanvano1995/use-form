import { describe, expect, it } from 'vitest'
import {
  buildDependencyIndex,
  collectAffectedDependents,
  isSourceAffectedByChange,
  shouldRevalidateDependent,
} from './dependencies.ts'

describe('dependency helpers', () => {
  it('builds a declaration-ordered, deduplicated reverse graph', () => {
    const index = buildDependencyIndex({
      confirmPassword: ['password', 'password'],
      summary: ['password', 'email'],
    })

    expect([...index.entries()]).toEqual([
      ['password', ['confirmPassword', 'summary']],
      ['email', ['summary']],
    ])
  })

  it('drops unsafe or malformed dependency paths', () => {
    const index = buildDependencyIndex({
      confirmPassword: ['password', 'constructor.name', '' as never],
      'broken..path': ['password'],
    })

    expect([...index.entries()]).toEqual([['password', ['confirmPassword']]])
  })

  it('matches exact sources and ancestor changes without string-prefix false positives', () => {
    expect(isSourceAffectedByChange('address.country', 'address.country')).toBe(true)
    expect(isSourceAffectedByChange('address.country', 'address')).toBe(true)
    expect(isSourceAffectedByChange('address.country', 'address.coun')).toBe(false)
  })

  it('collects transitive dependents in BFS declaration order', () => {
    const index = buildDependencyIndex({
      b: ['a'],
      c: ['a'],
      d: ['b', 'c'],
    })

    expect(collectAffectedDependents(['a'], index)).toEqual(['b', 'c', 'd'])
  })

  it('validates cycles and diamonds only once per traversal', () => {
    const index = buildDependencyIndex({
      b: ['a', 'c'],
      c: ['b'],
      d: ['b', 'c'],
    })

    expect(collectAffectedDependents(['a'], index)).toEqual(['b', 'c', 'd'])
  })

  it('applies the whenTouched eligibility policy and supports always/force', () => {
    const base = {
      touched: false,
      hasError: false,
      isSubmitted: false,
      previouslyValidated: false,
      force: false,
      mode: 'whenTouched' as const,
    }

    expect(shouldRevalidateDependent(base)).toBe(false)
    expect(shouldRevalidateDependent({ ...base, touched: true })).toBe(true)
    expect(shouldRevalidateDependent({ ...base, hasError: true })).toBe(true)
    expect(shouldRevalidateDependent({ ...base, isSubmitted: true })).toBe(true)
    expect(shouldRevalidateDependent({ ...base, previouslyValidated: true })).toBe(true)
    expect(shouldRevalidateDependent({ ...base, force: true })).toBe(true)
    expect(shouldRevalidateDependent({ ...base, mode: 'always' })).toBe(true)
  })
})
