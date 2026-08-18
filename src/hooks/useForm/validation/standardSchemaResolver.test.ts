import { describe, expect, it } from 'vitest'
import { standardSchemaResolver, type StandardSchemaV1 } from './standardSchemaResolver.ts'

type Input = { age: string; products: Array<{ name: string }> }
type Output = { age: number; products: Array<{ name: string }> }

function schema(
  validate: StandardSchemaV1<Input, Output>['~standard']['validate'],
): StandardSchemaV1<Input, Output> {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate,
    },
  }
}

describe('standardSchemaResolver', () => {
  it('returns transformed output from a Standard Schema v1 schema', async () => {
    const resolver = standardSchemaResolver<Input, Output>(
      schema((value) => {
        const input = value as Input
        return { value: { ...input, age: Number(input.age) } }
      }),
    )

    await expect(
      resolver(
        { age: '42', products: [] },
        { context: undefined, signal: new AbortController().signal },
      ),
    ).resolves.toEqual({ success: true, values: { age: 42, products: [] } })
  })

  it('maps issue paths to dot paths including indexed fields', async () => {
    const resolver = standardSchemaResolver<Input, Output>(
      schema(() => ({
        issues: [
          { path: ['age'], message: 'Age is invalid' },
          { path: ['products', 0, 'name'], message: 'Name is required' },
        ],
      })),
    )

    await expect(
      resolver({ age: '', products: [{ name: '' }] }, { context: undefined }),
    ).resolves.toMatchObject({
      success: false,
      errors: { age: 'Age is invalid', 'products.0.name': 'Name is required' },
    })
  })

  it('maps symbol-path and pathless issues to rootError (never accidental success)', async () => {
    const resolver = standardSchemaResolver<Input, Output>(
      schema(() => ({
        issues: [
          { path: ['products', Symbol('private'), 'name'], message: 'Incompatible options' },
        ],
      })),
    )

    await expect(
      resolver({ age: '', products: [{ name: '' }] }, { context: undefined }),
    ).resolves.toMatchObject({
      success: false,
      errors: {},
      rootError: 'Incompatible options',
    })
  })

  it('uses the first pathless issue message and first field message per path', async () => {
    const resolver = standardSchemaResolver<Input, Output>(
      schema(() => ({
        issues: [
          { message: 'Form combination is invalid' },
          { path: [], message: 'Later root error' },
          { path: ['age'], message: 'First age error' },
          { path: ['age'], message: 'Later age error' },
        ],
      })),
    )

    await expect(
      resolver({ age: '', products: [] }, { context: undefined }),
    ).resolves.toMatchObject({
      success: false,
      errors: { age: 'First age error' },
      rootError: 'Form combination is invalid',
    })
  })

  it('treats an empty issues array as a safe validation failure', async () => {
    const resolver = standardSchemaResolver<Input, Output>(schema(() => ({ issues: [] })))

    await expect(resolver({ age: '', products: [] }, { context: undefined })).resolves.toEqual({
      success: false,
      errors: {},
      rootError: 'Validation failed',
    })
  })

  it('treats malformed Standard Schema values as safe failures', async () => {
    const resolver = standardSchemaResolver<Input, Output>(
      schema(() => ({ value: null }) as unknown as { value: Output }),
    )

    await expect(resolver({ age: '', products: [] }, { context: undefined })).resolves.toEqual({
      success: false,
      errors: {},
      rootError: 'Invalid resolver success result',
    })
  })

  it('throws AbortError when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const resolver = standardSchemaResolver<Input, Output>(schema(() => ({ value: {} as Output })))

    await expect(
      resolver({ age: '', products: [] }, { context: undefined, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
