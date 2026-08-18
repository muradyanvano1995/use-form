import { describe, expect, it } from 'vitest'
import { isSensitiveFieldName, redactFormPayload } from './safeActions.ts'

describe('safeActions', () => {
  it('redacts passwords, tokens, and file contents', () => {
    const payload = redactFormPayload({
      email: 'user@example.com',
      password: 'secret-value',
      profile: { token: 'abc', displayName: 'Ada' },
      avatar: new File(['hidden-bytes'], 'avatar.png', { type: 'image/png' }),
    })

    expect(payload).toEqual({
      email: 'user@example.com',
      password: '[redacted]',
      profile: { token: '[redacted]', displayName: 'Ada' },
      avatar: { name: 'avatar.png', type: 'image/png', size: 12 },
    })
  })

  it('treats nested password paths as sensitive', () => {
    expect(isSensitiveFieldName('profile.password')).toBe(true)
    expect(isSensitiveFieldName('email')).toBe(false)
  })
})
