import { describe, expect, it } from 'vitest'
import { rules } from './builtInRules.ts'
import { createRule } from './ruleTypes.ts'

describe('built-in rules', () => {
  const values = {}

  it('required rejects empty strings and whitespace', async () => {
    const rule = rules.required('Required')
    expect(await rule('', values)).toBe('Required')
    expect(await rule('  ', values)).toBe('Required')
    expect(await rule('ok', values)).toBeUndefined()
  })

  it('required accepts 0 and false', async () => {
    expect(await rules.required()(0, values)).toBeUndefined()
    expect(await rules.required()(false, values)).toBeUndefined()
  })

  it('accepted requires true', async () => {
    expect(await rules.accepted('Accept')(false, values)).toBe('Accept')
    expect(await rules.accepted()(true, values)).toBeUndefined()
  })

  it('email validates and skips empty optional values', async () => {
    expect(await rules.email()('', values)).toBeUndefined()
    expect(await rules.email()('bad', values)).toBe('Enter a valid email address')
    expect(await rules.email('Custom')('a@b.com', values)).toBeUndefined()
    expect(await rules.email('Custom')('bad', values)).toBe('Custom')
  })

  it('supports minLength, maxLength, and length', async () => {
    expect(await rules.minLength(3)('ab', values)).toBe('Must be at least 3 characters')
    expect(await rules.minLength(3)('abc', values)).toBeUndefined()
    expect(await rules.maxLength(2)('abc', values)).toBe('Must be at most 2 characters')
    expect(await rules.maxLength(3)('ab', values)).toBeUndefined()
    expect(await rules.length(2)('ab', values)).toBeUndefined()
    expect(await rules.length(2, 'Exact')('a', values)).toBe('Exact')
    expect(await rules.minLength(3)('', values)).toBeUndefined()
  })

  it('supports numeric min and max', async () => {
    expect(await rules.min(18)(17, values)).toBe('Must be at least 18')
    expect(await rules.min(18)(18, values)).toBeUndefined()
    expect(await rules.max(10)(11, values)).toBe('Must be at most 10')
    expect(await rules.max(10)(10, values)).toBeUndefined()
    expect(await rules.min(1)(Number.NaN, values)).toBeUndefined()
  })

  it('pattern avoids global/sticky RegExp lastIndex bugs', async () => {
    const globalPattern = /ab/g
    globalPattern.lastIndex = 2
    const rule = rules.pattern(globalPattern, 'No match')
    expect(await rule('ab', values)).toBeUndefined()
    expect(await rule('ab', values)).toBeUndefined()
    expect(await rules.pattern(/^[a-z]+$/)('abc', values)).toBeUndefined()
    expect(await rules.pattern(/^[a-z]+$/)('123', values)).toBe('Invalid format')
  })

  it('sameAs and matchesField compare with Object.is', async () => {
    expect(await rules.sameAs('secret')('secret', values)).toBeUndefined()
    expect(await rules.sameAs('secret', 'Nope')('other', values)).toBe('Nope')

    type Pair = { password: string; confirmPassword: string }
    const mismatched: Pair = { password: 'a', confirmPassword: 'b' }
    const matched: Pair = { password: 'a', confirmPassword: 'a' }

    expect(await rules.matchesField<Pair, 'password'>('password')('b', mismatched)).toBe(
      'Fields must match',
    )
    expect(
      await rules.matchesField<Pair, 'password'>('password', 'Match')('a', matched),
    ).toBeUndefined()
  })

  it('supports rules.custom and createRule', async () => {
    const inline = rules.custom<string>((value) =>
      value.includes('admin') ? 'No admin' : undefined,
    )
    expect(await inline('admin', values)).toBe('No admin')

    const reusable = createRule<string, { name: string }>((value) =>
      value === 'x' ? 'bad' : undefined,
    )
    expect(await reusable('x', { name: 'x' })).toBe('bad')
  })

  it('validates file size, type, extension, and counts', async () => {
    const small = new File(['ok'], 'ok.png', { type: 'image/png' })
    const large = new File([new Uint8Array(20)], 'big.png', { type: 'image/png' })
    const pdf = new File(['x'], 'doc.PDF', { type: 'application/pdf' })
    const emptyMime = new File(['x'], 'weird.bin', { type: '' })

    expect(await rules.fileSize(10)(null, values)).toBeUndefined()
    expect(await rules.fileSize(10)([], values)).toBeUndefined()
    expect(await rules.fileSize(10)(small, values)).toBeUndefined()
    expect(await rules.fileSize(10, 'Too big')(large, values)).toBe('Too big')
    expect(await rules.fileSize(10)([small, large], values)).toBe('File must not exceed 10 bytes')

    expect(await rules.fileType(['image/png'])(small, values)).toBeUndefined()
    expect(await rules.fileType(['image/png'], 'Bad type')(pdf, values)).toBe('Bad type')
    expect(await rules.fileType(['image/png'])(emptyMime, values)).toBe('Unsupported file type')

    expect(await rules.fileExtension(['png', '.jpg'])(small, values)).toBeUndefined()
    expect(await rules.fileExtension(['png'])(pdf, values)).toBe('Unsupported file extension')

    expect(await rules.maxFiles(1)([small], values)).toBeUndefined()
    expect(await rules.maxFiles(1, 'Max 1')([small, pdf], values)).toBe('Max 1')
    expect(await rules.minFiles(2)([small], values)).toBe('Select at least 2 files')
    expect(await rules.minFiles(1)([small], values)).toBeUndefined()
    expect(await rules.minFiles(1)([], values)).toBe('Select at least one file')
  })

  it('supports eachFile for per-file custom checks', async () => {
    const spaced = new File(['x'], 'my file.png', { type: 'image/png' })
    const ok = new File(['x'], 'ok.png', { type: 'image/png' })
    const rule = rules.eachFile((file) =>
      file.name.includes(' ') ? 'Filename cannot contain spaces' : undefined,
    )

    expect(await rule(null, values)).toBeUndefined()
    expect(await rule(ok, values)).toBeUndefined()
    expect(await rule(spaced, values)).toBe('Filename cannot contain spaces')
    expect(await rule([ok, spaced], values)).toBe('Filename cannot contain spaces')
  })

  it('collects every failing file in eachFile all mode with safe indexes', async () => {
    const ok = new File(['ok'], 'ok.png', { type: 'image/png' })
    const first = new File([new Uint8Array(20)], 'one.png', { type: 'image/png' })
    const second = new File([new Uint8Array(20)], 'two.png', { type: 'image/png' })
    const rule = rules.eachFile(rules.fileSize(10))
    const context = {
      name: 'documents',
      values,
      reason: 'manual' as const,
      criteriaMode: 'all' as const,
    }

    const result = await rule([first, ok, second], values, context)

    expect(result).toEqual([
      {
        message: 'File must not exceed 10 bytes',
        type: 'fileSize',
        params: { maxBytes: 10, fileIndex: 0 },
      },
      {
        message: 'File must not exceed 10 bytes',
        type: 'fileSize',
        params: { maxBytes: 10, fileIndex: 2 },
      },
    ])
    expect(JSON.stringify(result)).not.toContain('one.png')
    expect(JSON.stringify(result)).not.toContain('two.png')
  })

  it('stops eachFile at the first failing file in firstError mode', async () => {
    const first = new File([new Uint8Array(20)], 'one.png', { type: 'image/png' })
    const second = new File([new Uint8Array(20)], 'two.png', { type: 'image/png' })
    const seen: string[] = []
    const rule = rules.eachFile((file) => {
      seen.push(file.name)
      return file.size > 10 ? 'too big' : undefined
    })
    const context = {
      name: 'documents',
      values,
      reason: 'manual' as const,
      criteriaMode: 'firstError' as const,
    }

    const result = await rule([first, second], values, context)
    expect(seen).toEqual(['one.png'])
    expect(result).toMatchObject({
      message: 'too big',
      params: { fileIndex: 0 },
    })
    expect(JSON.stringify(result)).not.toContain('one.png')
  })
})
