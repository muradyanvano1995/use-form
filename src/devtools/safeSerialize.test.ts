import { describe, expect, it, vi } from 'vitest'
import { safeSerialize } from './safeSerialize.ts'

class TokenHolder {
  readonly token: string
  constructor(token: string) {
    this.token = token
  }
}

describe('safeSerialize', () => {
  describe('plain values', () => {
    it('serializes primitives, arrays, and objects without mutation', () => {
      const input = { city: 'Yerevan', count: 2, ok: true, nested: { a: 1 }, list: ['x'] }
      const copy = structuredClone(input)
      const result = safeSerialize(input) as {
        city: string
        nested: { a: number }
        list: string[]
      }
      expect(result).toEqual(input)
      expect(result).not.toBe(input)
      expect(input).toEqual(copy)
      input.nested.a = 9
      expect(result.nested.a).toBe(1)
    })
  })

  describe('redaction', () => {
    it('redacts default sensitive keys case-insensitively', () => {
      const result = safeSerialize({
        password: 'hunter2',
        API_KEY: 'abc',
        refreshToken: 'r',
        cvv: '123',
        profile: { passcode: 'x', city: 'Yerevan' },
      }) as Record<string, { $dev: string } | Record<string, unknown>>

      expect(result.password).toEqual({ $dev: 'redacted' })
      expect(result.API_KEY).toEqual({ $dev: 'redacted' })
      expect(result.refreshToken).toEqual({ $dev: 'redacted' })
      expect(result.cvv).toEqual({ $dev: 'redacted' })
      expect((result.profile as { passcode: { $dev: string }; city: string }).passcode).toEqual({
        $dev: 'redacted',
      })
      expect((result.profile as { city: string }).city).toBe('Yerevan')
    })

    it('applies explicit paths and custom predicates', () => {
      const byPath = safeSerialize(
        { profile: { ssn: '111', city: 'Yerevan' } },
        { redactPaths: ['profile.ssn'] },
      ) as { profile: { ssn: { $dev: string }; city: string } }
      expect(byPath.profile.ssn).toEqual({ $dev: 'redacted' })
      expect(byPath.profile.city).toBe('Yerevan')

      const byPredicate = safeSerialize(
        { visible: 'ok', hidden: 'nope' },
        { redact: (_path, key) => key === 'hidden' },
      ) as { visible: string; hidden: { $dev: string } }
      expect(byPredicate.visible).toBe('ok')
      expect(byPredicate.hidden).toEqual({ $dev: 'redacted' })
    })
  })

  describe('host objects', () => {
    it('describes files and blobs without reading contents', () => {
      const file = new File(['secret-bytes'], 'avatar.png', { type: 'image/png' })
      const blob = new Blob(['hidden'], { type: 'text/plain' })
      const result = safeSerialize({ file, blob }) as {
        file: { $dev: string; name: string; type: string; size: number }
        blob: { $dev: string; type: string; size: number }
      }
      expect(result.file).toEqual({
        $dev: 'File',
        name: 'avatar.png',
        type: 'image/png',
        size: file.size,
      })
      expect(JSON.stringify(result)).not.toContain('secret-bytes')
      expect(result.blob.$dev).toBe('Blob')
      expect(result.blob.size).toBe(blob.size)
    })

    it('can redact files entirely', () => {
      const file = new File(['x'], 'secret.png')
      const result = safeSerialize({ avatar: file }, { redactFiles: true }) as {
        avatar: { $dev: string }
      }
      expect(result.avatar).toEqual({ $dev: 'redacted' })
    })

    it('can omit filenames without reading contents', () => {
      const file = new File(['secret-bytes'], 'payroll.pdf', { type: 'application/pdf' })
      const result = safeSerialize({ resume: file }, { hideFileNames: true }) as {
        resume: { $dev: string; name?: string; type: string; size: number }
      }
      expect(result.resume.$dev).toBe('File')
      expect(result.resume).not.toHaveProperty('name')
      expect(result.resume.type).toBe('application/pdf')
      expect(JSON.stringify(result)).not.toContain('payroll.pdf')
      expect(JSON.stringify(result)).not.toContain('secret-bytes')
    })

    it('tags dates, maps, sets, functions, and class instances', () => {
      const date = new Date('2020-01-02T00:00:00.000Z')
      const result = safeSerialize({
        date,
        map: new Map([['a', 1]]),
        set: new Set([1]),
        fn: function named() {
          return 1
        },
        instance: new TokenHolder('nope'),
      }) as Record<string, { $dev: string; name?: string; iso?: string; size?: number }>

      expect(result.date).toEqual({ $dev: 'Date', iso: '2020-01-02T00:00:00.000Z' })
      expect(result.map).toEqual({ $dev: 'Map', size: 1 })
      expect(result.set).toEqual({ $dev: 'Set', size: 1 })
      expect(result.fn).toEqual({ $dev: 'Function', name: 'named' })
      expect(result.instance).toEqual({ $dev: 'Class', name: 'TokenHolder' })
    })
  })

  describe('safety', () => {
    it('handles cycles and does not call toJSON', () => {
      const cyclic: Record<string, unknown> = { city: 'Yerevan' }
      cyclic.self = cyclic
      const toJSON = vi.fn(() => ({ leaked: true }))
      const withJson = { city: 'Gyumri', toJSON }

      const cycled = safeSerialize(cyclic) as { city: string; self: { $dev: string } }
      expect(cycled.city).toBe('Yerevan')
      expect(cycled.self).toEqual({ $dev: 'circular' })

      const serialized = safeSerialize(withJson) as { city: string; toJSON: { $dev: string } }
      expect(serialized.city).toBe('Gyumri')
      expect(toJSON).not.toHaveBeenCalled()
      expect(serialized.toJSON.$dev).toBe('Function')
    })

    it('enforces max depth and entry limits', () => {
      const deep = { a: { b: { c: { d: 1 } } } }
      const limited = safeSerialize(deep, { maxDepth: 2 }) as {
        a: { b: { $dev: string } }
      }
      expect(limited.a.b).toEqual({ $dev: 'maxDepth' })

      const large = { list: Array.from({ length: 5 }, (_, index) => index) }
      const truncated = safeSerialize(large, { maxEntries: 2 }) as {
        list: Array<number | { $dev: string; omitted: number }>
      }
      expect(truncated.list).toHaveLength(3)
      expect(truncated.list[2]).toEqual({ $dev: 'truncated', omitted: 3 })
    })

    it('is deterministic for key order', () => {
      const first = safeSerialize({ b: 1, a: 2 })
      const second = safeSerialize({ a: 2, b: 1 })
      expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    })

    it('does not invoke getters', () => {
      const getter = vi.fn(() => 'secret')
      const value = {} as { hidden: string }
      Object.defineProperty(value, 'hidden', { enumerable: true, get: getter })
      const result = safeSerialize(value) as { hidden: { $dev: string } }
      expect(getter).not.toHaveBeenCalled()
      expect(result.hidden).toEqual({ $dev: 'getter' })
    })

    it('uses property descriptors on plain objects and still cannot make hostile proxies side-effect-free', () => {
      const getter = vi.fn(() => 'trap-getter')
      const target = { city: 'Yerevan' }
      Object.defineProperty(target, 'hidden', { enumerable: true, configurable: true, get: getter })

      const ownKeys = vi.fn((object: object) => Reflect.ownKeys(object))
      const get = vi.fn((object: object, property: PropertyKey, receiver: unknown) =>
        Reflect.get(object, property, receiver),
      )
      const getOwnPropertyDescriptor = vi.fn((object: object, property: PropertyKey) =>
        Reflect.getOwnPropertyDescriptor(object, property),
      )
      const proxy = new Proxy(target, { ownKeys, get, getOwnPropertyDescriptor })

      const result = safeSerialize(proxy) as { city: string; hidden: { $dev: string } }
      expect(result.city).toBe('Yerevan')
      expect(result.hidden).toEqual({ $dev: 'getter' })
      expect(getter).not.toHaveBeenCalled()
      expect(ownKeys).toHaveBeenCalled()
      expect(getOwnPropertyDescriptor).toHaveBeenCalled()
    })
  })
})
