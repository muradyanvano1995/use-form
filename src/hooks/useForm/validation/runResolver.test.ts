import { describe, expect, it } from 'vitest'
import { pickResolverFieldError, runResolver } from './runResolver.ts'

type Values = { email: string; age: string }

const values: Values = { email: 'user@example.com', age: '18' }
const options = { context: { source: 'test' } }

describe('runResolver', () => {
  it('returns synchronous and asynchronous successes', async () => {
    await expect(
      runResolver({
        values,
        options,
        resolver: (input) => ({ success: true, values: { ...input, age: Number(input.age) } }),
      }),
    ).resolves.toEqual({ success: true, values: { email: 'user@example.com', age: 18 } })

    await expect(
      runResolver({
        values,
        options,
        resolver: async (input) => ({ success: true, values: input }),
      }),
    ).resolves.toEqual({ success: true, values })
  })

  it('returns synchronous and asynchronous failures', async () => {
    const failure = { success: false as const, errors: { email: 'Invalid email' } }

    await expect(runResolver({ values, options, resolver: () => failure })).resolves.toMatchObject(
      failure,
    )
    await expect(
      runResolver({ values, options, resolver: async () => failure }),
    ).resolves.toMatchObject(failure)
  })

  it('normalizes unsafe resolver error paths', async () => {
    const result = await runResolver({
      values,
      options,
      resolver: () => ({
        success: false,
        errors: { email: 'Invalid', __proto__: 'unsafe' } as Record<string, string>,
      }),
    })

    expect(result).toMatchObject({ success: false, errors: { email: 'Invalid' } })
    expect(Object.prototype.hasOwnProperty.call(result.errors, '__proto__')).toBe(false)
  })

  it('preserves a valid rootError on resolver failures', async () => {
    await expect(
      runResolver({
        values,
        options,
        resolver: () => ({
          success: false,
          errors: {},
          rootError: 'The selected fields are incompatible',
        }),
      }),
    ).resolves.toMatchObject({
      success: false,
      errors: {},
      rootError: 'The selected fields are incompatible',
    })
  })

  it('coerces malformed resolver results to blocking failures', async () => {
    await expect(
      runResolver({ values, options, resolver: (() => null) as never }),
    ).resolves.toEqual({
      success: false,
      errors: {},
      rootError: 'Validation failed',
    })

    await expect(
      runResolver({
        values,
        options,
        resolver: (() => ({ success: true, values: null })) as never,
      }),
    ).resolves.toEqual({
      success: false,
      errors: {},
      rootError: 'Invalid resolver success result',
    })

    await expect(
      runResolver({
        values,
        options,
        resolver: (() => ({ success: false, errors: {} })) as never,
      }),
    ).resolves.toEqual({
      success: false,
      errors: {},
      rootError: 'Validation failed',
    })
  })

  it('propagates thrown errors and rejected promises', async () => {
    await expect(
      runResolver({
        values,
        options,
        resolver: () => {
          throw new Error('sync failure')
        },
      }),
    ).rejects.toThrow('sync failure')

    await expect(
      runResolver({
        values,
        options,
        resolver: async () => Promise.reject(new Error('async failure')),
      }),
    ).rejects.toThrow('async failure')
  })

  it('throws AbortError before calling a resolver for an aborted signal', async () => {
    const controller = new AbortController()
    controller.abort()
    let called = false

    await expect(
      runResolver({
        values,
        options: { ...options, signal: controller.signal },
        resolver: () => {
          called = true
          return { success: true, values }
        },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })

    expect(called).toBe(false)
  })
})

describe('pickResolverFieldError', () => {
  it('returns only non-empty messages for the requested field', () => {
    expect(pickResolverFieldError<Values>({ email: 'Invalid email' }, 'email')).toBe(
      'Invalid email',
    )
    expect(pickResolverFieldError<Values>({ email: '' }, 'email')).toBeUndefined()
    expect(pickResolverFieldError<Values>({ email: 'Invalid email' }, 'age')).toBeUndefined()
  })
})
