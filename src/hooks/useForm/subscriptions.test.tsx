import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { memo, StrictMode, useRef, useState, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { FormControl } from './formStore.ts'
import { useForm } from './useForm.ts'
import { useFieldState, useFormState, useWatch } from './subscriptions.ts'
import { rules } from './validation/builtInRules.ts'

type DemoValues = {
  email: string
  age: number
}

const defaults: DemoValues = {
  email: '',
  age: 0,
}

describe('useWatch', () => {
  describe('granular re-renders', () => {
    it('does not re-render a memoized watcher when an unrelated field changes', () => {
      const emailRenders = { current: 0 }
      const ageRenders = { current: 0 }

      const EmailWatcher = memo(function EmailWatcher({
        control,
      }: {
        control: FormControl<DemoValues>
      }) {
        emailRenders.current += 1
        const email = useWatch(control, 'email')
        return <span data-testid="email">{email}</span>
      })

      const AgeWatcher = memo(function AgeWatcher({
        control,
      }: {
        control: FormControl<DemoValues>
      }) {
        ageRenders.current += 1
        const age = useWatch(control, 'age')
        return <span data-testid="age">{age}</span>
      })

      function Harness() {
        const form = useForm<DemoValues>({ defaultValues: defaults })
        return (
          <div>
            <EmailWatcher control={form.control} />
            <AgeWatcher control={form.control} />
            <button type="button" onClick={() => form.setValue('age', 21)}>
              age
            </button>
            <button type="button" onClick={() => form.setValue('email', 'a@b.com')}>
              email
            </button>
          </div>
        )
      }

      render(<Harness />)
      const emailAfterMount = emailRenders.current
      const ageAfterMount = ageRenders.current

      act(() => {
        screen.getByRole('button', { name: 'age' }).click()
      })
      expect(emailRenders.current).toBe(emailAfterMount)
      expect(ageRenders.current).toBe(ageAfterMount + 1)
      expect(screen.getByTestId('age')).toHaveTextContent('21')

      act(() => {
        screen.getByRole('button', { name: 'email' }).click()
      })
      expect(emailRenders.current).toBe(emailAfterMount + 1)
      expect(ageRenders.current).toBe(ageAfterMount + 1)
      expect(screen.getByTestId('email')).toHaveTextContent('a@b.com')
    })

    it('accepts the full form return as the subscription source', () => {
      const { result } = renderHook(() => {
        const form = useForm<DemoValues>({ defaultValues: defaults })
        const email = useWatch(form, 'email')
        return { form, email }
      })

      expect(result.current.email).toBe('')

      act(() => {
        result.current.form.setValue('email', 'via-form@example.com')
      })
      expect(result.current.email).toBe('via-form@example.com')
    })
  })

  describe('Strict Mode', () => {
    it('keeps watching after Strict Mode double mount', () => {
      const { result } = renderHook(
        () => {
          const form = useForm<DemoValues>({ defaultValues: defaults })
          const email = useWatch(form.control, 'email')
          return { form, email }
        },
        {
          wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
        },
      )

      act(() => {
        result.current.form.setValue('email', 'strict@example.com')
      })
      expect(result.current.email).toBe('strict@example.com')
    })
  })

  describe('cleanup', () => {
    it('stops notifying after the watching component unmounts', () => {
      const watchRenders = { current: 0 }

      const Watcher = memo(function Watcher({ control }: { control: FormControl<DemoValues> }) {
        watchRenders.current += 1
        const email = useWatch(control, 'email')
        return <span>{email}</span>
      })

      function Harness() {
        const form = useForm<DemoValues>({ defaultValues: defaults })
        const [show, setShow] = useState(true)
        const formRef = useRef(form)
        formRef.current = form
        return (
          <div>
            {show ? <Watcher control={form.control} /> : null}
            <button type="button" onClick={() => setShow(false)}>
              hide
            </button>
            <button
              type="button"
              onClick={() => {
                formRef.current.setValue('email', `n-${watchRenders.current}`)
              }}
            >
              bump
            </button>
          </div>
        )
      }

      render(<Harness />)
      const beforeHide = watchRenders.current

      act(() => {
        screen.getByRole('button', { name: 'hide' }).click()
      })
      expect(watchRenders.current).toBe(beforeHide)

      act(() => {
        screen.getByRole('button', { name: 'bump' }).click()
      })
      expect(watchRenders.current).toBe(beforeHide)
    })
  })
})

describe('useFormState', () => {
  it('re-renders only when the selected slice changes', () => {
    const submitRenders = { current: 0 }

    const SubmitFlag = memo(function SubmitFlag({ control }: { control: FormControl<DemoValues> }) {
      submitRenders.current += 1
      const isSubmitting = useFormState(control, (state) => state.isSubmitting)
      return <span data-testid="submitting">{String(isSubmitting)}</span>
    })

    function Harness() {
      const form = useForm<DemoValues>({
        defaultValues: defaults,
        onSubmit: async () => {
          await new Promise((resolve) => {
            setTimeout(resolve, 20)
          })
        },
      })
      return (
        <div>
          <SubmitFlag control={form.control} />
          <button type="button" onClick={() => form.setValue('email', 'x@y.com')}>
            email
          </button>
          <button type="button" onClick={() => void form.handleSubmit()}>
            submit
          </button>
        </div>
      )
    }

    render(<Harness />)
    const afterMount = submitRenders.current

    act(() => {
      screen.getByRole('button', { name: 'email' }).click()
    })
    expect(submitRenders.current).toBe(afterMount)

    act(() => {
      screen.getByRole('button', { name: 'submit' }).click()
    })
    expect(submitRenders.current).toBeGreaterThan(afterMount)
    expect(screen.getByTestId('submitting')).toHaveTextContent('true')
  })
})

describe('useFieldState', () => {
  it('tracks error, touched, and dirty for one path without unrelated value churn', () => {
    const fieldRenders = { current: 0 }

    const EmailState = memo(function EmailState({ control }: { control: FormControl<DemoValues> }) {
      fieldRenders.current += 1
      const fieldState = useFieldState(control, 'email')
      return (
        <span data-testid="field-state">
          {`${fieldState.error ?? ''}|${fieldState.touched}|${fieldState.dirty}`}
        </span>
      )
    })

    function Harness() {
      const form = useForm<DemoValues>({ defaultValues: defaults })
      return (
        <div>
          <EmailState control={form.control} />
          <button type="button" onClick={() => form.setValue('age', 9)}>
            age
          </button>
          <button
            type="button"
            onClick={() => {
              form.setValue('email', 'dirty@example.com')
              form.setError('email', 'Invalid')
            }}
          >
            email-state
          </button>
        </div>
      )
    }

    render(<Harness />)
    const afterMount = fieldRenders.current
    expect(screen.getByTestId('field-state')).toHaveTextContent('|false|false')

    act(() => {
      screen.getByRole('button', { name: 'age' }).click()
    })
    expect(fieldRenders.current).toBe(afterMount)

    act(() => {
      screen.getByRole('button', { name: 'email-state' }).click()
    })
    expect(fieldRenders.current).toBe(afterMount + 1)
    expect(screen.getByTestId('field-state')).toHaveTextContent('Invalid|false|true')
  })
})

describe('useForm control handle', () => {
  it('exposes a stable control identity across value updates', () => {
    const { result } = renderHook(() =>
      useForm<DemoValues>({
        defaultValues: defaults,
      }),
    )

    const first = result.current.control
    act(() => {
      result.current.setValue('email', 'stable@example.com')
    })
    expect(result.current.control).toBe(first)
  })
})

describe('validation message subscriptions', () => {
  it('does not rerender error subscribers when only the catalog changes', async () => {
    const errorRenders = { current: 0 }

    const EmailError = memo(function EmailError({ control }: { control: FormControl<DemoValues> }) {
      errorRenders.current += 1
      const error = useFieldState(control, 'email').error
      return <span data-testid="email-error">{error ?? ''}</span>
    })

    function Harness({ messages }: { messages?: { required: string } }) {
      const form = useForm<DemoValues>({
        defaultValues: defaults,
        rules: { email: rules.required() },
        validationMessages: messages,
      })
      return (
        <div>
          <EmailError control={form.control} />
          <button type="button" onClick={() => void form.validateField('email')}>
            validate
          </button>
        </div>
      )
    }

    const { rerender } = render(<Harness />)
    await act(async () => {
      screen.getByRole('button', { name: 'validate' }).click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toHaveTextContent('This field is required')
    })
    const afterValidate = errorRenders.current

    rerender(<Harness messages={{ required: 'Need this' }} />)
    expect(screen.getByTestId('email-error')).toHaveTextContent('This field is required')
    expect(errorRenders.current).toBe(afterValidate)

    await act(async () => {
      screen.getByRole('button', { name: 'validate' }).click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toHaveTextContent('Need this')
    })
    expect(errorRenders.current).toBeGreaterThan(afterValidate)
  })
})

describe('unregister subscription isolation', () => {
  it('does not re-render an unrelated watcher when another field unregisters', () => {
    type Values = { email: string; nickname?: string }
    const emailRenders = { current: 0 }
    const nicknameRenders = { current: 0 }

    const EmailWatcher = memo(function EmailWatcher({ control }: { control: FormControl<Values> }) {
      emailRenders.current += 1
      const email = useWatch(control, 'email')
      return <span data-testid="email">{email}</span>
    })

    const NicknameWatcher = memo(function NicknameWatcher({
      control,
    }: {
      control: FormControl<Values>
    }) {
      nicknameRenders.current += 1
      const nickname = useWatch(control, 'nickname')
      return <span data-testid="nickname">{nickname ?? ''}</span>
    })

    function Harness() {
      const form = useForm<Values>({
        defaultValues: { email: 'a@b.com', nickname: 'Ada' },
      })
      return (
        <div>
          <EmailWatcher control={form.control} />
          <NicknameWatcher control={form.control} />
          <button type="button" onClick={() => form.unregister('nickname', { keepValue: false })}>
            unregister-nickname
          </button>
        </div>
      )
    }

    render(<Harness />)
    const emailAfterMount = emailRenders.current
    const nicknameAfterMount = nicknameRenders.current

    act(() => {
      screen.getByRole('button', { name: 'unregister-nickname' }).click()
    })

    expect(emailRenders.current).toBe(emailAfterMount)
    expect(nicknameRenders.current).toBe(nicknameAfterMount + 1)
    expect(screen.getByTestId('nickname')).toHaveTextContent('')
  })
})
