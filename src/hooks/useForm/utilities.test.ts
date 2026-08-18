import { describe, expect, it, vi } from 'vitest'
import {
  computeDirtyFields,
  computeIsDirty,
  createErrorId,
  createFieldId,
  focusFieldById,
  getFirstErrorField,
  hasFieldErrors,
  isCheckboxInput,
  mergeErrors,
  normalizeErrors,
  omitError,
  valuesEqual,
} from './utilities.ts'

type Sample = {
  email: string
  age: number
  rememberMe: boolean
}

describe('useForm utilities', () => {
  it('compares values with Object.is', () => {
    expect(valuesEqual(0, 0)).toBe(true)
    expect(valuesEqual(false, false)).toBe(true)
    expect(valuesEqual('', '')).toBe(true)
    expect(valuesEqual(0, false)).toBe(false)
    expect(valuesEqual(Number.NaN, Number.NaN)).toBe(true)
  })

  it('computes dirty fields across asymmetric key sets', () => {
    const defaults = { email: '', age: 0 } as Sample
    const values = { email: 'a@b.com', age: 0, rememberMe: true } as Sample

    expect(computeDirtyFields(values, defaults)).toEqual({
      email: true,
      rememberMe: true,
    })
    expect(computeIsDirty(values, defaults)).toBe(true)
    expect(computeIsDirty(defaults, defaults)).toBe(false)
  })

  it('treats empty-string error messages as absence', () => {
    expect(hasFieldErrors({ email: '' })).toBe(false)
    expect(hasFieldErrors({ email: 'Required' })).toBe(true)
  })

  it('omitError is a no-op when the field has no error', () => {
    const errors = { age: 'Too young' }
    expect(omitError(errors, 'email')).toBe(errors)
  })

  it('omitError removes an existing field error', () => {
    expect(omitError({ email: 'Required', age: 'Nope' }, 'email')).toEqual({ age: 'Nope' })
  })

  it('mergeErrors skips undefined sources and empty messages', () => {
    expect(mergeErrors(undefined, { email: '' }, { email: 'Required' }, { age: 'Bad' })).toEqual({
      email: 'Required',
      age: 'Bad',
    })
  })

  it('normalizeErrors handles nullish input', () => {
    expect(normalizeErrors(undefined)).toEqual({})
    expect(normalizeErrors(null)).toEqual({})
    expect(normalizeErrors({ email: 'Required', age: '' })).toEqual({ email: 'Required' })
  })

  it('builds stable field and error ids', () => {
    expect(createFieldId('login', 'email')).toBe('login-field-email')
    expect(createErrorId('login', 'email')).toBe('login-error-email')
  })

  it('encodes radio option ids without colliding on dots vs dashes', () => {
    expect(createFieldId('form', 'plan', 'basic')).toBe('form-field-plan-option-basic')
    expect(createFieldId('form', 'plan', 'pro.plan')).not.toBe(
      createFieldId('form', 'plan', 'pro-plan'),
    )
    expect(createFieldId('form', 'plan', 'pro.plan')).toContain('%2E')
  })

  it('prefers fieldOrder when finding the first error', () => {
    const errors = { age: 'Bad age', email: 'Bad email' }
    expect(getFirstErrorField(errors, ['email', 'age'])).toBe('email')
  })

  it('falls back to object key order when fieldOrder has no matches', () => {
    const errors = { age: 'Bad age', email: 'Bad email' }
    expect(getFirstErrorField(errors, [])).toBe('age')
  })

  it('ignores empty messages when falling back for first error', () => {
    expect(getFirstErrorField({ email: '', age: 'Bad' }, [])).toBe('age')
    expect(getFirstErrorField({ email: '' }, [])).toBeUndefined()
  })

  it('focusFieldById focuses a matching element', () => {
    const focus = vi.fn()
    const el = document.createElement('input')
    el.id = 'focus-me'
    el.focus = focus
    document.body.appendChild(el)

    focusFieldById('focus-me')
    expect(focus).toHaveBeenCalledTimes(1)

    focusFieldById('missing')
    expect(focus).toHaveBeenCalledTimes(1)

    el.remove()
  })

  it('focusFieldById is a no-op when document is unavailable', () => {
    vi.stubGlobal('document', undefined)

    expect(() => focusFieldById('anywhere')).not.toThrow()

    vi.unstubAllGlobals()
  })

  it('detects checkbox and radio inputs', () => {
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    const radio = document.createElement('input')
    radio.type = 'radio'
    const text = document.createElement('input')
    text.type = 'text'

    expect(isCheckboxInput(checkbox)).toBe(true)
    expect(isCheckboxInput(radio)).toBe(true)
    expect(isCheckboxInput(text)).toBe(false)
    expect(isCheckboxInput(null)).toBe(false)
  })
})
