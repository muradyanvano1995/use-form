import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { memo, StrictMode, useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useController } from './useController.ts'
import { useForm } from './useForm.ts'
import { ValidationMode } from './validation/modes.ts'
import { rules } from './validation/index.ts'
import type { FormControl } from './formStore.ts'

type DemoValues = {
  email: string
  age: number
  price: number
  profile: {
    birthDate: Date | null
    avatar: File | null
  }
  documents: File[]
}

const defaults: DemoValues = {
  email: '',
  age: 0,
  price: 10,
  profile: {
    birthDate: null,
    avatar: null,
  },
  documents: [],
}

function createTestFile(name = 'avatar.png'): File {
  return new File(['x'], name, { type: 'image/png' })
}

describe('useController', () => {
  describe('initialization', () => {
    it('reads the current field value, nested values, ids, and field state', () => {
      const birth = new Date('2020-01-02T00:00:00.000Z')
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({
          id: 'ctrl',
          defaultValues: {
            ...defaults,
            email: 'a@b.com',
            profile: { birthDate: birth, avatar: null },
          },
        })
        const email = useController({ control: form.control, name: 'email' })
        const nested = useController({ control: form.control, name: 'profile.birthDate' })
        return { form, email, nested }
      })

      expect(result.current.email.field.value).toBe('a@b.com')
      expect(result.current.email.field.name).toBe('email')
      expect(result.current.email.field.id).toBe('ctrl-field-email')
      expect(result.current.email.field.errorId).toBe('ctrl-error-email')
      expect(result.current.email.fieldState).toMatchObject({
        error: undefined,
        invalid: false,
        touched: false,
        dirty: false,
      })

      expect(result.current.nested.field.value).toBe(birth)
      expect(result.current.nested.field.name).toBe('profile.birthDate')
      expect(result.current.nested.field.id).toBe('ctrl-field-profile.birthDate')
    })

    it('reads file values by identity', () => {
      const file = createTestFile()
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({
          defaultValues: {
            ...defaults,
            profile: { birthDate: null, avatar: file },
          },
        })
        return useController({ control: form.control, name: 'profile.avatar' })
      })

      expect(result.current.field.value).toBe(file)
    })
  })

  describe('updates', () => {
    it('updates form state through onChange for flat and nested paths', () => {
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({ defaultValues: defaults })
        const email = useController({ control: form.control, name: 'email' })
        const cityAge = useController({ control: form.control, name: 'age' })
        const birth = useController({ control: form.control, name: 'profile.birthDate' })
        return { form, email, cityAge, birth }
      })

      const nextBirth = new Date('1990-05-05T00:00:00.000Z')
      act(() => {
        result.current.email.field.onChange('hello@example.com')
        result.current.cityAge.field.onChange(33)
        result.current.birth.field.onChange(nextBirth)
      })

      expect(result.current.form.values.email).toBe('hello@example.com')
      expect(result.current.form.values.age).toBe(33)
      expect(result.current.form.values.profile.birthDate).toBe(nextBirth)
      expect(result.current.form.values.profile.avatar).toBeNull()
      expect(result.current.email.fieldState.dirty).toBe(true)
    })

    it('marks touched on blur and validates according to mode', async () => {
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({
          defaultValues: defaults,
          mode: ValidationMode.OnBlur,
          rules: {
            email: [rules.required('Email is required'), rules.email('Bad email')],
          },
        })
        const email = useController({ control: form.control, name: 'email' })
        return { form, email }
      })

      act(() => {
        result.current.email.field.onChange('not-an-email')
      })
      expect(result.current.email.fieldState.error).toBeUndefined()

      await act(async () => {
        result.current.email.field.onBlur()
      })

      expect(result.current.form.touched.email).toBe(true)
      await waitFor(() => {
        expect(result.current.email.fieldState.error).toBe('Bad email')
        expect(result.current.email.fieldState.invalid).toBe(true)
        expect(result.current.email.field['aria-invalid']).toBe(true)
        expect(result.current.email.field['aria-describedby']).toBe(
          result.current.email.field.errorId,
        )
      })
    })

    it('honors shouldTouchOnChange and shouldValidateOnChange overrides', async () => {
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({
          defaultValues: defaults,
          mode: ValidationMode.OnSubmit,
          rules: {
            email: [rules.required('Email is required')],
          },
        })
        const email = useController({
          control: form.control,
          name: 'email',
          shouldTouchOnChange: true,
          shouldValidateOnChange: true,
        })
        return { form, email }
      })

      await act(async () => {
        result.current.email.field.onChange('')
      })

      expect(result.current.form.touched.email).toBe(true)
      await waitFor(() => {
        expect(result.current.email.fieldState.error).toBe('Email is required')
      })
    })

    it('keeps file identity through onChange', () => {
      const file = createTestFile('kept.png')
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({ defaultValues: defaults })
        const avatar = useController({ control: form.control, name: 'profile.avatar' })
        return { form, avatar }
      })

      act(() => {
        result.current.avatar.field.onChange(file)
      })
      expect(result.current.form.values.profile.avatar).toBe(file)
      expect(result.current.avatar.field.value).toBe(file)
    })
  })

  describe('parse and format', () => {
    it('uses identity when parse/format are omitted', () => {
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({ defaultValues: defaults })
        return useController({ control: form.control, name: 'age' })
      })

      act(() => {
        result.current.field.onChange(12)
      })
      expect(result.current.field.value).toBe(12)
    })

    it('parses display strings into stored numbers and formats for display', () => {
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({ defaultValues: { ...defaults, price: 12.5 } })
        const price = useController<DemoValues, 'price', string>({
          control: form.control,
          name: 'price',
          parse: (display) => Number(display),
          format: (stored) => stored.toFixed(2),
        })
        return { form, price }
      })

      expect(result.current.price.field.value).toBe('12.50')

      act(() => {
        result.current.price.field.onChange('19.99')
      })
      expect(result.current.form.values.price).toBe(19.99)
      expect(result.current.price.field.value).toBe('19.99')
    })

    it('uses the latest parse callback and does not swallow parse errors', () => {
      const parseA = vi.fn((value: string) => Number(value))
      const parseB = vi.fn((value: string) => {
        if (value === 'boom') throw new Error('parse failed')
        return Number(value) * 2
      })

      const { result: formResult } = renderHook(() =>
        useForm<DemoValues>({ defaultValues: defaults }),
      )

      const { result, rerender } = renderHook(
        ({ parse }: { parse: (value: string) => number }) =>
          useController<DemoValues, 'price', string>({
            control: formResult.current.control,
            name: 'price',
            parse,
            format: (stored) => String(stored),
          }),
        { initialProps: { parse: parseA } },
      )

      act(() => {
        result.current.field.onChange('4')
      })
      expect(formResult.current.values.price).toBe(4)

      rerender({ parse: parseB })
      act(() => {
        result.current.field.onChange('5')
      })
      expect(formResult.current.values.price).toBe(10)

      expect(() => {
        act(() => {
          result.current.field.onChange('boom')
        })
      }).toThrow('parse failed')
    })
  })

  describe('field state', () => {
    it('exposes invalid from error', async () => {
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({
          defaultValues: defaults,
          rules: {
            email: [rules.required('Email is required')],
          },
        })
        const email = useController({
          control: form.control,
          name: 'email',
          shouldValidateOnChange: true,
        })
        return { form, email }
      })

      await act(async () => {
        result.current.email.field.onChange('')
      })

      await waitFor(() => {
        expect(result.current.email.fieldState.error).toBe('Email is required')
        expect(result.current.email.fieldState.invalid).toBe(true)
      })
    })

    it('no-ops onChange while disabled but keeps values in form state', () => {
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({ defaultValues: { ...defaults, email: 'kept@x.com' } })
        const email = useController({
          control: form.control,
          name: 'email',
          disabled: true,
        })
        return { form, email }
      })

      expect(result.current.email.field.disabled).toBe(true)
      act(() => {
        result.current.email.field.onChange('changed@x.com')
      })
      expect(result.current.form.values.email).toBe('kept@x.com')

      act(() => {
        result.current.form.setValue('email', 'via-setValue@x.com')
      })
      expect(result.current.email.field.value).toBe('via-setValue@x.com')
    })
  })

  describe('refs', () => {
    it('registers a focusable ref used by focus-on-error', async () => {
      const focus = vi.fn()
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({
          defaultValues: defaults,
          focusOnError: true,
          rules: {
            email: [rules.required('Email is required')],
          },
        })
        const email = useController({ control: form.control, name: 'email' })
        return { form, email }
      })

      act(() => {
        result.current.email.field.ref({ focus })
      })

      await act(async () => {
        await result.current.form.handleSubmit()
      })

      expect(focus).toHaveBeenCalled()
    })

    it('cleans up refs and supports Strict Mode', async () => {
      const focus = vi.fn()
      const { result } = renderHook(
        () => {
          const form = useForm<DemoValues>({
            defaultValues: defaults,
            focusOnError: true,
            rules: { email: [rules.required('required')] },
          })
          const email = useController({ control: form.control, name: 'email' })
          return { form, email }
        },
        {
          wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
        },
      )

      act(() => {
        result.current.email.field.ref({ focus })
        result.current.email.field.ref(null)
        result.current.email.field.ref({ focus })
      })

      await act(async () => {
        await result.current.form.handleSubmit()
      })
      expect(focus).toHaveBeenCalled()
    })
  })

  describe('subscriptions', () => {
    it('does not rerender for unrelated value or error changes', () => {
      const renders = { current: 0 }

      const EmailController = memo(function EmailController({
        control,
      }: {
        control: FormControl<DemoValues>
      }) {
        renders.current += 1
        const { field, fieldState } = useController({ control, name: 'email' })
        return (
          <span data-testid="email-ctrl">
            {field.value}|{fieldState.error ?? ''}|{String(fieldState.touched)}|
            {String(fieldState.dirty)}
          </span>
        )
      })

      function Harness() {
        const form = useForm<DemoValues>({ defaultValues: defaults })
        return (
          <div>
            <EmailController control={form.control} />
            <button type="button" onClick={() => form.setValue('age', 9)}>
              age
            </button>
            <button type="button" onClick={() => form.setError('age', 'bad age')}>
              age-error
            </button>
            <button type="button" onClick={() => form.setValue('email', 'x@y.com')}>
              email
            </button>
            <button type="button" onClick={() => form.setError('email', 'bad email')}>
              email-error
            </button>
            <button
              type="button"
              onClick={() => {
                form.setValue('email', 'touched@y.com', { shouldTouch: true })
              }}
            >
              email-touch
            </button>
          </div>
        )
      }

      render(<Harness />)
      const afterMount = renders.current

      act(() => {
        screen.getByRole('button', { name: 'age' }).click()
      })
      expect(renders.current).toBe(afterMount)

      act(() => {
        screen.getByRole('button', { name: 'age-error' }).click()
      })
      expect(renders.current).toBe(afterMount)

      act(() => {
        screen.getByRole('button', { name: 'email' }).click()
      })
      expect(renders.current).toBe(afterMount + 1)
      expect(screen.getByTestId('email-ctrl')).toHaveTextContent('x@y.com||false|true')

      act(() => {
        screen.getByRole('button', { name: 'email-error' }).click()
      })
      expect(renders.current).toBe(afterMount + 2)
      expect(screen.getByTestId('email-ctrl')).toHaveTextContent('x@y.com|bad email|false|true')

      act(() => {
        screen.getByRole('button', { name: 'email-touch' }).click()
      })
      expect(renders.current).toBe(afterMount + 3)
      expect(screen.getByTestId('email-ctrl')).toHaveTextContent(
        'touched@y.com|bad email|true|true',
      )
    })

    it('does not rerender for unrelated submission state', async () => {
      const renders = { current: 0 }

      const EmailController = memo(function EmailController({
        control,
      }: {
        control: FormControl<DemoValues>
      }) {
        renders.current += 1
        const { field } = useController({ control, name: 'email' })
        return <span>{field.value}</span>
      })

      function Harness() {
        const form = useForm<DemoValues>({
          defaultValues: defaults,
          onSubmit: async () => {
            await new Promise((resolve) => {
              setTimeout(resolve, 15)
            })
          },
        })
        return (
          <div>
            <EmailController control={form.control} />
            <button
              type="button"
              onClick={() => {
                form.setValue('email', 'ready@example.com', { shouldTouch: true })
              }}
            >
              prep
            </button>
            <button type="button" onClick={() => void form.handleSubmit()}>
              submit
            </button>
          </div>
        )
      }

      render(<Harness />)

      act(() => {
        screen.getByRole('button', { name: 'prep' }).click()
      })
      const afterPrep = renders.current

      await act(async () => {
        screen.getByRole('button', { name: 'submit' }).click()
        await new Promise((resolve) => {
          setTimeout(resolve, 30)
        })
      })
      expect(renders.current).toBe(afterPrep)
    })

    it('switches subscription when the name option changes', () => {
      const { result: formResult } = renderHook(() =>
        useForm<DemoValues>({
          defaultValues: { ...defaults, email: 'mail', age: 7 },
        }),
      )

      const { result, rerender } = renderHook(
        ({ name }: { name: 'email' | 'age' }) =>
          useController({ control: formResult.current.control, name }),
        { initialProps: { name: 'email' as 'email' | 'age' } },
      )

      expect(result.current.field.value).toBe('mail')

      rerender({ name: 'age' })
      expect(result.current.field.value).toBe(7)

      act(() => {
        formResult.current.setValue('email', 'changed')
      })
      expect(result.current.field.value).toBe(7)

      act(() => {
        formResult.current.setValue('age', 99)
      })
      expect(result.current.field.value).toBe(99)
    })
  })

  describe('files', () => {
    it('supports File | null and File[] without writing a native file value', () => {
      const single = createTestFile('one.png')
      const many = [createTestFile('a.png'), createTestFile('b.png')]
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({ defaultValues: defaults })
        const avatar = useController({ control: form.control, name: 'profile.avatar' })
        const documents = useController({ control: form.control, name: 'documents' })
        return { form, avatar, documents }
      })

      act(() => {
        result.current.avatar.field.onChange(single)
        result.current.documents.field.onChange(many)
      })

      expect(result.current.form.values.profile.avatar).toBe(single)
      expect(result.current.form.values.documents).toBe(many)

      act(() => {
        result.current.avatar.field.onChange(null)
        result.current.documents.field.onChange([])
      })
      expect(result.current.form.values.profile.avatar).toBeNull()
      expect(result.current.form.values.documents).toEqual([])
    })
  })

  describe('lifecycle', () => {
    it('updates after reset and resetField, and submits stored values not display values', async () => {
      const onSubmit = vi.fn(async () => {})
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({
          defaultValues: { ...defaults, price: 5 },
          onSubmit,
        })
        const price = useController<DemoValues, 'price', string>({
          control: form.control,
          name: 'price',
          parse: (display) => Number(display),
          format: (stored) => `$${stored}`,
        })
        return { form, price }
      })

      expect(result.current.price.field.value).toBe('$5')

      act(() => {
        result.current.price.field.onChange('8')
      })
      expect(result.current.form.values.price).toBe(8)
      expect(result.current.price.field.value).toBe('$8')

      act(() => {
        result.current.form.resetField('price')
      })
      expect(result.current.form.values.price).toBe(5)
      expect(result.current.price.field.value).toBe('$5')

      act(() => {
        result.current.price.field.onChange('11')
        result.current.form.reset()
      })
      expect(result.current.form.values.price).toBe(5)

      await act(async () => {
        result.current.price.field.onChange('42')
        await result.current.form.handleSubmit()
      })
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ price: 42 }),
        expect.any(Object),
      )
    })

    it('stops updating after unmount and ignores late async validation', async () => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })

      function Harness() {
        const form = useForm<DemoValues>({
          defaultValues: defaults,
          rules: {
            email: [
              async () => {
                await gate
                return 'late'
              },
            ],
          },
        })
        const [show, setShow] = useState(true)
        return (
          <div>
            {show ? (
              <EmailMount control={form.control} />
            ) : (
              <span data-testid="unmounted">gone</span>
            )}
            <button type="button" onClick={() => setShow(false)}>
              hide
            </button>
            <button type="button" onClick={() => void form.validateField('email')}>
              validate
            </button>
          </div>
        )
      }

      function EmailMount({ control }: { control: FormControl<DemoValues> }) {
        const { fieldState } = useController({ control, name: 'email' })
        return <span data-testid="mounted">{fieldState.error ?? 'none'}</span>
      }

      render(<Harness />)

      act(() => {
        screen.getByRole('button', { name: 'validate' }).click()
      })
      act(() => {
        screen.getByRole('button', { name: 'hide' }).click()
      })
      expect(screen.getByTestId('unmounted')).toBeInTheDocument()

      release()
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 10)
        })
      })
      expect(screen.queryByTestId('mounted')).not.toBeInTheDocument()
    })
  })

  describe('shouldUnregister', () => {
    type Conditional = {
      email: string
      nickname?: string
    }

    it('unregisters an optional controller field after unmount', async () => {
      function NicknameField({ control }: { control: FormControl<Conditional> }) {
        useController({ control, name: 'nickname', shouldUnregister: true })
        return null
      }

      function Harness({ showNickname }: { showNickname: boolean }) {
        const form = useForm<Conditional>({
          defaultValues: { email: 'a@b.com', nickname: 'van' },
          shouldUnregister: true,
        })
        return (
          <div>
            {showNickname ? <NicknameField control={form.control} /> : null}
            <output data-testid="nickname">{form.values.nickname ?? 'gone'}</output>
          </div>
        )
      }

      const { rerender } = render(<Harness showNickname />)
      expect(screen.getByTestId('nickname').textContent).toBe('van')

      rerender(<Harness showNickname={false} />)
      await act(async () => {
        await Promise.resolve()
      })
      expect(screen.getByTestId('nickname').textContent).toBe('gone')
    })

    it('cancels Strict Mode cleanup so a live controller keeps its value', async () => {
      const { result } = renderHook(
        () => {
          const form = useForm<Conditional>({
            defaultValues: { email: 'a@b.com', nickname: 'van' },
            shouldUnregister: true,
          })
          const nickname = useController({
            control: form.control,
            name: 'nickname',
            shouldUnregister: true,
          })
          return { form, nickname }
        },
        { wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode> },
      )

      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current.form.values.nickname).toBe('van')
    })

    it('unregisters the previous name when the controller name changes', async () => {
      const { result, rerender } = renderHook(
        ({ name }: { name: 'email' | 'nickname' }) => {
          const form = useForm<Conditional>({
            defaultValues: { email: 'a@b.com', nickname: 'van' },
            shouldUnregister: true,
          })
          const field = useController({ control: form.control, name })
          return { form, field }
        },
        { initialProps: { name: 'nickname' as 'email' | 'nickname' } },
      )

      rerender({ name: 'email' })
      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current.form.values.nickname).toBeUndefined()
      expect(result.current.form.values.email).toBe('a@b.com')
    })
  })
})
