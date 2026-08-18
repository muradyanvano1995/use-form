import { describe, expect, it } from 'vitest'
import {
  clearNativeFileInput,
  getFileExtension,
  isFile,
  normalizeExtension,
  normalizeToFiles,
  parseFileInputValue,
  shouldClearNativeFileInput,
} from './fileHelpers.ts'
import { cloneFormValue, leafValuesEqual } from './pathUtilities.ts'

function createFile(name: string, type: string, content = 'x'): File {
  return new File([content], name, { type })
}

describe('fileHelpers', () => {
  it('detects File instances safely', () => {
    const file = createFile('a.png', 'image/png')
    expect(isFile(file)).toBe(true)
    expect(isFile(null)).toBe(false)
    expect(isFile({ name: 'a.png' })).toBe(false)
  })

  it('parses single and multiple file inputs without storing FileList', () => {
    const file = createFile('a.png', 'image/png')
    const input = document.createElement('input')
    input.type = 'file'

    Object.defineProperty(input, 'files', {
      configurable: true,
      get: () => {
        const list = {
          0: file,
          length: 1,
          item: (index: number) => (index === 0 ? file : null),
          [Symbol.iterator]: function* () {
            yield file
          },
        }
        return list as unknown as FileList
      },
    })

    const single = parseFileInputValue(input, false)
    expect(single).toBe(file)
    expect(Array.isArray(single)).toBe(false)

    const multiple = parseFileInputValue(input, true)
    expect(multiple).toEqual([file])
    expect(Array.isArray(multiple)).toBe(true)

    Object.defineProperty(input, 'files', {
      configurable: true,
      get: () => null,
    })
    expect(parseFileInputValue(input, false)).toBeNull()
    expect(parseFileInputValue(input, true)).toEqual([])
  })

  it('normalizes extensions and file lists', () => {
    expect(normalizeExtension('.PNG')).toBe('png')
    expect(getFileExtension('photo.JPEG')).toBe('jpeg')
    expect(normalizeToFiles(null)).toEqual([])
    expect(normalizeToFiles(createFile('a.png', 'image/png'))).toHaveLength(1)
    expect(shouldClearNativeFileInput(null)).toBe(true)
    expect(shouldClearNativeFileInput([])).toBe(true)
    expect(shouldClearNativeFileInput(createFile('a.png', 'image/png'))).toBe(false)
  })

  it('clears native file inputs with an empty string only', () => {
    const input = document.createElement('input')
    input.type = 'file'
    clearNativeFileInput(input)
    expect(input.value).toBe('')
  })

  it('clones containers while preserving File identity', () => {
    const file = createFile('avatar.png', 'image/png')
    const defaults = { avatar: file, tags: [file] }
    const cloned = cloneFormValue(defaults)

    expect(cloned).not.toBe(defaults)
    expect(cloned.avatar).toBe(file)
    expect(cloned.tags).not.toBe(defaults.tags)
    expect(cloned.tags[0]).toBe(file)
  })

  it('compares File arrays by length and identity', () => {
    const a = createFile('a.png', 'image/png')
    const b = createFile('a.png', 'image/png')
    expect(leafValuesEqual([a], [a])).toBe(true)
    expect(leafValuesEqual([a], [b])).toBe(false)
    expect(leafValuesEqual([a, b], [b, a])).toBe(false)
  })
})
