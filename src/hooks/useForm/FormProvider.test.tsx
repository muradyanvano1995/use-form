import { act, render, renderHook, screen } from '@testing-library/react'
import { memo, StrictMode, useState, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { FormProvider } from './FormProvider.tsx'
import { useFormContext } from './formContext.ts'
import { useController } from './useController.ts'
import { useFieldState, useFormState, useWatch } from './subscriptions.ts'
import { useForm } from './useForm.ts'
import type { FormControl } from './formStore.ts'

type OuterValues = {
  email: string
  age: number
}

type InnerValues = {
  city: string
}

const outerDefaults: OuterValues = { email: '', age: 0 }

describe('FormProvider', () => {
  describe('provider', () => {
    it('renders children and supplies a stable control', () => {
      const { result } = renderHook(() => useForm<OuterValues>({ defaultValues: outerDefaults }))
      const seen: FormControl<OuterValues>[] = []

      function Child() {
        const control = useFormContext<OuterValues>()
        seen.push(control)
        return <span data-testid="ok">ok</span>
      }

      const { rerender } = render(
        <FormProvider control={result.current.control}>
          <Child />
        </FormProvider>,
      )

      expect(screen.getByTestId('ok')).toHaveTextContent('ok')
      expect(seen[0]).toBe(result.current.control)

      act(() => {
        result.current.setValue('age', 3)
      })
      rerender(
        <FormProvider control={result.current.control}>
          <Child />
        </FormProvider>,
      )
      expect(seen.every((control) => control === result.current.control)).toBe(true)
    })

    it('supports nested providers with isolated forms', () => {
      function OuterEmail() {
        const email = useWatch<OuterValues, 'email'>({ name: 'email' })
        return <span data-testid="outer-email">{email}</span>
      }

      function InnerCity() {
        const city = useWatch<InnerValues, 'city'>({ name: 'city' })
        return <span data-testid="inner-city">{city}</span>
      }

      function ExplicitOuter({ control }: { control: FormControl<OuterValues> }) {
        const email = useWatch(control, 'email')
        return <span data-testid="explicit-outer">{email}</span>
      }

      function Harness() {
        const outer = useForm<OuterValues>({ defaultValues: { email: 'outer', age: 1 } })
        const inner = useForm<InnerValues>({ defaultValues: { city: 'inner' } })
        return (
          <FormProvider control={outer.control}>
            <OuterEmail />
            <FormProvider control={inner.control}>
              <InnerCity />
              <ExplicitOuter control={outer.control} />
            </FormProvider>
            <button type="button" onClick={() => outer.setValue('email', 'outer-2')}>
              outer
            </button>
            <button type="button" onClick={() => inner.setValue('city', 'inner-2')}>
              inner
            </button>
          </FormProvider>
        )
      }

      render(<Harness />)
      expect(screen.getByTestId('outer-email')).toHaveTextContent('outer')
      expect(screen.getByTestId('inner-city')).toHaveTextContent('inner')
      expect(screen.getByTestId('explicit-outer')).toHaveTextContent('outer')

      act(() => {
        screen.getByRole('button', { name: 'inner' }).click()
      })
      expect(screen.getByTestId('inner-city')).toHaveTextContent('inner-2')
      expect(screen.getByTestId('outer-email')).toHaveTextContent('outer')

      act(() => {
        screen.getByRole('button', { name: 'outer' }).click()
      })
      expect(screen.getByTestId('outer-email')).toHaveTextContent('outer-2')
      expect(screen.getByTestId('explicit-outer')).toHaveTextContent('outer-2')
      expect(screen.getByTestId('inner-city')).toHaveTextContent('inner-2')
    })

    it('switches consumers when the provided control changes', () => {
      function EmailView() {
        const email = useWatch<OuterValues, 'email'>({ name: 'email' })
        return <span data-testid="email">{email}</span>
      }

      function Harness() {
        const formA = useForm<OuterValues>({ defaultValues: { email: 'a', age: 1 } })
        const formB = useForm<OuterValues>({ defaultValues: { email: 'b', age: 2 } })
        const [useA, setUseA] = useState(true)
        return (
          <div>
            <FormProvider control={useA ? formA.control : formB.control}>
              <EmailView />
            </FormProvider>
            <button type="button" onClick={() => setUseA(false)}>
              swap
            </button>
            <button type="button" onClick={() => formA.setValue('email', 'a-changed')}>
              mutate-a
            </button>
            <button type="button" onClick={() => formB.setValue('email', 'b-changed')}>
              mutate-b
            </button>
          </div>
        )
      }

      render(<Harness />)
      expect(screen.getByTestId('email')).toHaveTextContent('a')

      act(() => {
        screen.getByRole('button', { name: 'swap' }).click()
      })
      expect(screen.getByTestId('email')).toHaveTextContent('b')

      act(() => {
        screen.getByRole('button', { name: 'mutate-a' }).click()
      })
      expect(screen.getByTestId('email')).toHaveTextContent('b')

      act(() => {
        screen.getByRole('button', { name: 'mutate-b' }).click()
      })
      expect(screen.getByTestId('email')).toHaveTextContent('b-changed')
    })

    it('works under Strict Mode', () => {
      const { result } = renderHook(() => useForm<OuterValues>({ defaultValues: outerDefaults }))

      function Child() {
        const email = useWatch<OuterValues, 'email'>({ name: 'email' })
        return <span>{email || 'empty'}</span>
      }

      render(
        <StrictMode>
          <FormProvider control={result.current.control}>
            <Child />
          </FormProvider>
        </StrictMode>,
      )

      act(() => {
        result.current.setValue('email', 'strict@example.com')
      })
      expect(screen.getByText('strict@example.com')).toBeInTheDocument()
    })
  })

  describe('context hook', () => {
    it('throws clearly without a provider', () => {
      expect(() => {
        renderHook(() => useFormContext())
      }).toThrow(/useFormContext requires a FormControl/)
    })

    it('does not throw for explicit-control hooks outside a provider', () => {
      const { result } = renderHook(() => {
        const form = useForm<OuterValues>({ defaultValues: outerDefaults })
        const email = useWatch(form, 'email')
        const controller = useController({ control: form.control, name: 'email' })
        return { email, controller }
      })
      expect(result.current.email).toBe('')
      expect(result.current.controller.field.value).toBe('')
    })
  })

  describe('controller integration', () => {
    it('uses context when control is omitted and prefers explicit control', () => {
      function ContextEmail() {
        const { field } = useController<OuterValues, 'email'>({ name: 'email' })
        return <span data-testid="ctx">{field.value}</span>
      }

      function ExplicitEmail({ control }: { control: FormControl<OuterValues> }) {
        const { field } = useController({ control, name: 'email' })
        return <span data-testid="exp">{field.value}</span>
      }

      function Harness() {
        const outer = useForm<OuterValues>({ defaultValues: { email: 'provider', age: 0 } })
        const other = useForm<OuterValues>({ defaultValues: { email: 'explicit', age: 0 } })
        return (
          <FormProvider control={outer.control}>
            <ContextEmail />
            <ExplicitEmail control={other.control} />
            <button type="button" onClick={() => outer.setValue('email', 'provider-2')}>
              outer
            </button>
            <button type="button" onClick={() => other.setValue('email', 'explicit-2')}>
              other
            </button>
          </FormProvider>
        )
      }

      render(<Harness />)
      expect(screen.getByTestId('ctx')).toHaveTextContent('provider')
      expect(screen.getByTestId('exp')).toHaveTextContent('explicit')

      act(() => {
        screen.getByRole('button', { name: 'outer' }).click()
      })
      expect(screen.getByTestId('ctx')).toHaveTextContent('provider-2')
      expect(screen.getByTestId('exp')).toHaveTextContent('explicit')

      act(() => {
        screen.getByRole('button', { name: 'other' }).click()
      })
      expect(screen.getByTestId('exp')).toHaveTextContent('explicit-2')
    })

    it('throws when useController has neither control nor provider', () => {
      expect(() => {
        renderHook(() => useController({ name: 'email' } as never))
      }).toThrow(/useController requires a FormControl/)
    })
  })

  describe('subscription integration', () => {
    it('keeps render isolation through context', () => {
      const emailRenders = { current: 0 }

      const EmailView = memo(function EmailView() {
        emailRenders.current += 1
        const email = useWatch<OuterValues, 'email'>({ name: 'email' })
        return <span data-testid="email">{email}</span>
      })

      function Harness() {
        const form = useForm<OuterValues>({ defaultValues: outerDefaults })
        return (
          <FormProvider control={form.control}>
            <EmailView />
            <button type="button" onClick={() => form.setValue('age', 9)}>
              age
            </button>
            <button type="button" onClick={() => form.setValue('email', 'x@y.com')}>
              email
            </button>
          </FormProvider>
        )
      }

      render(<Harness />)
      const afterMount = emailRenders.current

      act(() => {
        screen.getByRole('button', { name: 'age' }).click()
      })
      expect(emailRenders.current).toBe(afterMount)

      act(() => {
        screen.getByRole('button', { name: 'email' }).click()
      })
      expect(emailRenders.current).toBe(afterMount + 1)
      expect(screen.getByTestId('email')).toHaveTextContent('x@y.com')
    })

    it('supports useFieldState and useFormState through context', () => {
      function FieldBits() {
        const state = useFieldState<OuterValues, 'email'>({ name: 'email' })
        return (
          <span data-testid="field">{`${state.error ?? ''}|${state.touched}|${state.dirty}`}</span>
        )
      }

      function SubmitBits() {
        const isSubmitting = useFormState<OuterValues, boolean>({
          selector: (state) => state.isSubmitting,
        })
        return <span data-testid="submitting">{String(isSubmitting)}</span>
      }

      function Harness() {
        const form = useForm<OuterValues>({ defaultValues: outerDefaults })
        return (
          <FormProvider control={form.control}>
            <FieldBits />
            <SubmitBits />
            <button
              type="button"
              onClick={() => {
                form.setValue('email', 'dirty@x.com')
                form.setError('email', 'nope')
              }}
            >
              bump
            </button>
            <button type="button" onClick={() => void form.handleSubmit()}>
              submit
            </button>
          </FormProvider>
        )
      }

      render(<Harness />)
      expect(screen.getByTestId('field')).toHaveTextContent('|false|false')

      act(() => {
        screen.getByRole('button', { name: 'bump' }).click()
      })
      expect(screen.getByTestId('field')).toHaveTextContent('nope|false|true')

      act(() => {
        screen.getByRole('button', { name: 'submit' }).click()
      })
      expect(screen.getByTestId('submitting')).toHaveTextContent('true')
    })

    it('does not rerender context subscribers when parent re-renders with the same control', () => {
      const childRenders = { current: 0 }

      const Child = memo(function Child() {
        childRenders.current += 1
        const email = useWatch<OuterValues, 'email'>({ name: 'email' })
        return <span>{email}</span>
      })

      function Harness() {
        const form = useForm<OuterValues>({ defaultValues: outerDefaults })
        const [, setTick] = useState(0)
        return (
          <FormProvider control={form.control}>
            <Child />
            <button type="button" onClick={() => setTick((value) => value + 1)}>
              tick
            </button>
          </FormProvider>
        )
      }

      render(<Harness />)
      const afterMount = childRenders.current

      act(() => {
        screen.getByRole('button', { name: 'tick' }).click()
      })
      expect(childRenders.current).toBe(afterMount)
    })
  })

  describe('missing provider messages', () => {
    it('names the hook in the error', () => {
      expect(() => renderHook(() => useWatch<OuterValues, 'email'>({ name: 'email' }))).toThrow(
        /useWatch/,
      )
      expect(() =>
        renderHook(() =>
          useFormState<OuterValues, boolean>({
            selector: (state) => state.isSubmitting,
          }),
        ),
      ).toThrow(/useFormState/)
      expect(() =>
        renderHook(() => useFieldState<OuterValues, 'email'>({ name: 'email' })),
      ).toThrow(/useFieldState/)
    })
  })
})

describe('FormProvider typing helpers', () => {
  it('accepts children as React nodes', () => {
    const { result } = renderHook(() => useForm<OuterValues>({ defaultValues: outerDefaults }))
    const tree: ReactNode = (
      <FormProvider control={result.current.control}>
        <div />
      </FormProvider>
    )
    expect(tree).toBeTruthy()
  })
})
