import { describe, expect, it } from 'vitest'
import { rules } from './builtInRules.ts'
import {
  runFieldValidation,
  runFieldValidationPipeline,
  runValidation,
  runValidationPipeline,
} from './runValidation.ts'

describe('runValidation', () => {
  it('validates all fields by default', async () => {
    const errors = await runValidation({
      values: { email: '', password: '' },
      rules: {
        email: rules.required('Email required'),
        password: rules.required('Password required'),
      },
    })

    expect(errors.email).toBe('Email required')
    expect(errors.password).toBe('Password required')
  })

  it('limits field-rule execution with names while still running form validate', async () => {
    const errors = await runValidation({
      values: { email: '', password: '' },
      names: ['email'],
      rules: {
        email: rules.required('Email required'),
        password: rules.required('Password required'),
      },
      validate: () => ({ password: 'From form' }),
    })

    expect(errors.email).toBe('Email required')
    expect(errors.password).toBe('From form')
  })

  it('skips field rules for inactive paths while still running form validate', async () => {
    const errors = await runValidation({
      values: { email: 'a@b.com', nickname: undefined as string | undefined },
      rules: {
        email: rules.required('Email required'),
        nickname: rules.required('Nickname required'),
      },
      skipFieldPaths: new Set(['nickname']),
      validate: () => ({ email: 'From form' }),
    })

    expect(errors.nickname).toBeUndefined()
    expect(errors.email).toBe('From form')
  })

  it('lets form-level validate override field rule messages', async () => {
    const errors = await runValidation({
      values: { email: '' },
      rules: {
        email: rules.required('From rules'),
      },
      validate: () => ({ email: 'From form' }),
    })

    expect(errors.email).toBe('From form')
  })
})

describe('runFieldValidation', () => {
  it('lets form-level validate override a single-field rule message', async () => {
    const message = await runFieldValidation({
      name: 'email',
      values: { email: '' },
      rules: {
        email: rules.required('From rules'),
      },
      validate: () => ({ email: 'From form' }),
    })

    expect(message).toBe('From form')
  })

  it('returns the field rule message when form validate is silent for that field', async () => {
    const message = await runFieldValidation({
      name: 'email',
      values: { email: '' },
      rules: {
        email: rules.required('From rules'),
      },
      validate: () => ({}),
    })

    expect(message).toBe('From rules')
  })
})

describe('resolver validation pipeline', () => {
  it('returns identity output when no resolver is configured', async () => {
    const values = { age: '18' }

    await expect(runValidationPipeline({ values, resolverContext: undefined })).resolves.toEqual({
      errors: {},
      errorDetails: {},
      rootError: undefined,
      rootErrorDetails: undefined,
      output: values,
    })
  })

  it('returns transformed resolver output after a successful validation', async () => {
    await expect(
      runValidationPipeline<{ age: string }, { age: number }>({
        values: { age: '18' },
        resolverContext: undefined,
        resolver: (values) => ({ success: true, values: { age: Number(values.age) } }),
      }),
    ).resolves.toEqual({
      errors: {},
      errorDetails: {},
      rootError: undefined,
      rootErrorDetails: undefined,
      output: { age: 18 },
    })
  })

  it('merges resolver failures while field rules win for the same path', async () => {
    const result = await runValidationPipeline({
      values: { email: '' },
      resolverContext: undefined,
      rules: { email: rules.required('From rules') },
      resolver: () => ({ success: false, errors: { email: 'From resolver' } }),
    })

    expect(result.errors).toEqual({ email: 'From rules' })
    expect(result.errorDetails.email?.message).toBe('From rules')
    expect(result.errorDetails.email?.source).toBe('rule')
    expect(result.output).toBeUndefined()
  })

  it('lets form validation win over resolver errors for the same path', async () => {
    const result = await runValidationPipeline({
      values: { email: '' },
      resolverContext: undefined,
      validate: () => ({ email: 'From form validate' }),
      resolver: () => ({ success: false, errors: { email: 'From resolver' } }),
    })

    expect(result.errors).toEqual({ email: 'From form validate' })
    expect(result.errorDetails.email?.source).toBe('form')
    expect(result.output).toBeUndefined()
  })

  it('filters resolver failures to selected fields in field-scoped runs', async () => {
    const result = await runValidationPipeline({
      values: { email: '', password: '' },
      names: ['email'],
      fieldScoped: true,
      resolverContext: undefined,
      resolver: () => ({
        success: false,
        errors: { email: 'Bad email', password: 'Bad password' },
      }),
    })

    expect(result.errors).toEqual({ email: 'Bad email' })
    expect(result.errorDetails.email?.source).toBe('resolver')
    expect(result.errorDetails.password).toBeUndefined()
    expect(result.output).toBeUndefined()
  })

  it('skips the resolver for a field that already has a field or form error', async () => {
    let resolverCalls = 0
    const message = await runFieldValidationPipeline({
      name: 'email',
      values: { email: '' },
      resolverContext: undefined,
      rules: { email: rules.required('From rules') },
      resolver: () => {
        resolverCalls += 1
        return { success: false, errors: { email: 'From resolver' } }
      },
    })

    expect(message.message).toBe('From rules')
    expect(message.error?.source).toBe('rule')
    expect(message.rootError).toBeUndefined()
    expect(message.rootErrorDetails).toBeUndefined()
    expect(resolverCalls).toBe(0)
  })
})
