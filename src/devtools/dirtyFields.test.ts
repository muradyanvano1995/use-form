import { describe, expect, it } from 'vitest'
import { computeDevToolsDirtyFields } from './dirtyFields.ts'

describe('computeDevToolsDirtyFields', () => {
  it('marks changed leaf paths', () => {
    expect(
      computeDevToolsDirtyFields(
        { email: 'a@example.com', password: 'x' },
        { email: '', password: '' },
      ),
    ).toEqual({ email: true, password: true })
  })

  it('ignores unchanged leaves', () => {
    expect(computeDevToolsDirtyFields({ email: 'same' }, { email: 'same' })).toEqual({})
  })

  it('tracks nested object changes', () => {
    expect(
      computeDevToolsDirtyFields({ profile: { city: 'NYC' } }, { profile: { city: 'LA' } }),
    ).toEqual({ 'profile.city': true })
  })
})
